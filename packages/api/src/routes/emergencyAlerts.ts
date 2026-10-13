import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

export const emergencyAlertsRouter = Router();
emergencyAlertsRouter.use(requireAuth);
emergencyAlertsRouter.use(requireRole('owner', 'admin', 'planner', 'inmeter', 'glaszetter', 'warehouse'));
const columns = 'id, revision, title, description, address, phone, status, created_at AS "createdAt", updated_at AS "updatedAt"';
const validText = (value: unknown, max: number, required = false): value is string =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0)
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff]/u.test(value);

emergencyAlertsRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT ${columns} FROM emergency_alerts WHERE company_id = $1 ORDER BY created_at DESC, id DESC`, [req.auth!.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});
emergencyAlertsRouter.post('/', async (req, res, next) => {
  const { title, description = '', address = '', phone = '' } = req.body ?? {};
  if (!validText(title, 120, true) || !validText(description, 2000) || !validText(address, 300) || !validText(phone, 60)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Vul een titel in en controleer de lengte van de velden.' } });
    return;
  }
  try {
    const result = await pool.query(`INSERT INTO emergency_alerts (company_id, title, description, address, phone) VALUES ($1,$2,$3,$4,$5) RETURNING ${columns}`, [req.auth!.companyId, title.trim(), description.trim(), address.trim(), phone.trim()]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});
emergencyAlertsRouter.patch('/:id', async (req, res, next) => {
  const { status, revision } = req.body ?? {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)
    || !['open', 'in_progress', 'resolved'].includes(status)
    || typeof revision !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(revision)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Ongeldige status of versie van de melding.' } });
    return;
  }
  try {
    const result = await pool.query(`UPDATE emergency_alerts SET status=$3, revision=gen_random_uuid(), updated_at=clock_timestamp() WHERE id=$1 AND company_id=$2 AND revision=$4::uuid RETURNING ${columns}`, [req.params.id, req.auth!.companyId, status, revision]);
    if (!result.rows.length) {
      const existing = await pool.query('SELECT id FROM emergency_alerts WHERE id=$1 AND company_id=$2', [req.params.id, req.auth!.companyId]);
      res.status(existing.rows.length ? 409 : 404).json({ success: false, error: { code: existing.rows.length ? 'ALERT_CHANGED' : 'NOT_FOUND', message: existing.rows.length ? 'Deze melding is inmiddels gewijzigd. Vernieuw het overzicht.' : 'Spoedmelding niet gevonden.' } });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});
