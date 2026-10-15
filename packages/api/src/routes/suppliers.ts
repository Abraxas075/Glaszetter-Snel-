import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Supplier } from '@glaszetter/shared';
import { requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);
suppliersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query<Supplier>(`SELECT id,name,contact_person AS "contactPerson",phone,email,address,
      postal_code AS "postalCode",city,website,notes,source_url AS "sourceUrl",
      to_char(verified_at,'YYYY-MM-DD') AS "verifiedAt"
      FROM suppliers WHERE company_id=$1 ORDER BY lower(name),id`, [req.auth!.companyId]);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({success:true,data:result.rows});
  } catch (error) { next(error); }
});
