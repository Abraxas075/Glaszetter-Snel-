exports.up = pgm => {
  pgm.sql(`CREATE TABLE order_number_counters (
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year integer NOT NULL,
    last_number bigint NOT NULL CHECK (last_number >= 0),
    PRIMARY KEY (company_id, year)
  );
  CREATE FUNCTION assign_job_order_number() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE
    order_year integer;
    next_number bigint;
    highest_existing bigint;
  BEGIN
    IF NEW.status NOT IN ('ordered', 'delivery_expected') OR NEW.order_number IS NOT NULL THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.order_number IS NOT NULL THEN
        NEW.order_number := OLD.order_number;
        RETURN NEW;
      END IF;
    END IF;
    order_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Amsterdam')::integer;
    SELECT COALESCE(MAX((regexp_match(lower(order_number), '^gs-' || order_year || '-([0-9]{1,9})$'))[1]::bigint), 0)
      INTO highest_existing FROM jobs WHERE company_id = NEW.company_id;
    INSERT INTO order_number_counters(company_id, year, last_number)
      VALUES (NEW.company_id, order_year, highest_existing + 1)
      ON CONFLICT (company_id, year) DO UPDATE
      SET last_number = GREATEST(order_number_counters.last_number, highest_existing) + 1
      RETURNING last_number INTO next_number;
    NEW.order_number := 'GS-' || order_year || '-' || lpad(next_number::text, GREATEST(3, length(next_number::text)), '0');
    RETURN NEW;
  END;
  $$;
  CREATE TRIGGER jobs_assign_order_number
    BEFORE INSERT OR UPDATE OF status, order_number ON jobs
    FOR EACH ROW EXECUTE FUNCTION assign_job_order_number();`);
};
exports.down = () => { throw new Error('Uitgegeven bestelnummers en tellers blijven behouden. Gebruik een expliciete datamigratie voor terugrollen.'); };
