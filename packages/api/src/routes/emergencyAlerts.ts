import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { createEmergencyPhotoService, isUuid } from '../services/emergencyPhotoService';
import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

export const emergencyAlertsRouter = Router();
emergencyAlertsRouter.use(requireAuth);
emergencyAlertsRouter.use(requireRole('owner', 'admin', 'planner', 'inmeter', 'glaszetter', 'warehouse'));
const columns = 'id, revision, title, description, address, phone, status, assigned_user_id AS "assignedUserId", (SELECT name FROM users WHERE id=emergency_alerts.assigned_user_id AND company_id=emergency_alerts.company_id) AS "assignedUserName", created_at AS "createdAt", updated_at AS "updatedAt"';
const validText = (value: unknown, max: number, required = false): value is string =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0)
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff]/u.test(value);

emergencyAlertsRouter.get('/assignees',async(req,res,next)=>{try{const r=await pool.query("SELECT id,name FROM users WHERE company_id=$1 AND role <> 'external' ORDER BY name,id",[req.auth!.companyId]);res.json({success:true,data:r.rows});}catch(e){next(e);}});

emergencyAlertsRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${columns} FROM emergency_alerts WHERE company_id = $1 ORDER BY created_at DESC, id DESC`, [req.auth!.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});
emergencyAlertsRouter.post('/', async (req, res, next) => {
  const { title, description = '', address = '', phone = '', assignedUserId = null, id = randomUUID() } = req.body ?? {};
  if (!isUuid(id) || !validText(title, 120, true) || !validText(description, 2000) || !validText(address, 300) || !validText(phone, 60)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Vul een titel in en controleer de lengte van de velden.' } });
    return;
  }
  try {
    if (assignedUserId !== null && (!isUuid(assignedUserId) || !(await pool.query("SELECT id FROM users WHERE id=$1 AND company_id=$2 AND role <> 'external'",[assignedUserId,req.auth!.companyId])).rows.length)) {res.status(400).json({success:false,error:{code:'INVALID_INPUT',message:'Kies een medewerker van je eigen bedrijf.'}});return;}
    const result = await pool.query(`INSERT INTO emergency_alerts (id,company_id, title, description, address, phone, assigned_user_id) VALUES ($7,$1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING RETURNING ${columns}`, [req.auth!.companyId, title.trim(), description.trim(), address.trim(), phone.trim(), assignedUserId, id]);
    const saved=result.rows[0] ?? (await pool.query(`SELECT ${columns} FROM emergency_alerts WHERE id=$1 AND company_id=$2`,[id,req.auth!.companyId])).rows[0];
    if (!saved) {res.status(400).json({success:false,error:{code:'INVALID_INPUT',message:'Ongeldige melding-identificatie.'}});return;}
    res.status(201).json({ success: true, data: saved });
  } catch (error) { next(error); }
});
emergencyAlertsRouter.patch('/:id', async (req, res, next) => {
  const { status, revision, assignedUserId } = req.body ?? {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)
    || (status !== undefined && !['open', 'in_progress', 'resolved'].includes(status))
    || (assignedUserId !== undefined && assignedUserId !== null && !isUuid(assignedUserId))
    || (status === undefined && assignedUserId === undefined)
    || typeof revision !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(revision)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Ongeldige status of versie van de melding.' } });
    return;
  }
  try {
    if (assignedUserId != null && !(await pool.query("SELECT id FROM users WHERE id=$1 AND company_id=$2 AND role <> 'external'",[assignedUserId,req.auth!.companyId])).rows.length) {res.status(400).json({success:false,error:{code:'INVALID_INPUT',message:'Kies een medewerker van je eigen bedrijf.'}});return;}
    const result = await pool.query(`UPDATE emergency_alerts SET status=COALESCE($3,status), assigned_user_id=CASE WHEN $5::boolean THEN $6::uuid ELSE assigned_user_id END, revision=gen_random_uuid(), updated_at=clock_timestamp() WHERE id=$1 AND company_id=$2 AND revision=$4::uuid RETURNING ${columns}`, [req.params.id, req.auth!.companyId, status ?? null, revision, assignedUserId !== undefined, assignedUserId ?? null]);
    if (!result.rows.length) {
      const existing = await pool.query('SELECT id FROM emergency_alerts WHERE id=$1 AND company_id=$2', [req.params.id, req.auth!.companyId]);
      res.status(existing.rows.length ? 409 : 404).json({ success: false, error: { code: existing.rows.length ? 'ALERT_CHANGED' : 'NOT_FOUND', message: existing.rows.length ? 'Deze melding is inmiddels gewijzigd. Vernieuw het overzicht.' : 'Spoedmelding niet gevonden.' } });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});

const photos=createEmergencyPhotoService();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024}});
emergencyAlertsRouter.get('/:id/photos',async(req,res,next)=>{try{res.json({success:true,data:await photos.list(req.auth!.companyId,req.params.id)});}catch(e){next(e);}});
emergencyAlertsRouter.post('/:id/photos',upload.single('photo'),async(req,res,next)=>{
 try{
  if (!req.file) {res.status(400).json({success:false,error:{code:'INVALID_INPUT',message:'Kies een foto.'}});return;}
  res.status(201).json({success:true,data:await photos.upload(req.auth!.companyId,req.params.id,req.body?.photoId,req.file.originalname,req.file.buffer)});
 }catch(e){next(e);}
});
emergencyAlertsRouter.get('/:id/photos/:photoId',async(req,res,next)=>{try{const photo=await photos.read(req.auth!.companyId,req.params.id,req.params.photoId);res.setHeader('Content-Type',photo.type);res.setHeader('Cache-Control','private, no-store');res.send(photo.buffer);}catch(e){next(e);}});
