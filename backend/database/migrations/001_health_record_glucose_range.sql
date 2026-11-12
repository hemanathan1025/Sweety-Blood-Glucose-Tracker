-- Check the existing table before adding the glucose range constraint.
-- Validate the constraint after it has been added.

DO $guard$
BEGIN
  IF to_regclass('public.health_records') IS NULL THEN
    RAISE EXCEPTION 'Existing public.health_records table was not found; no changes applied.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='health_records' AND column_name='metric_type')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='health_records' AND column_name='value')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='health_records' AND column_name='unit') THEN
    RAISE EXCEPTION 'Existing health_records schema is incompatible; no changes applied.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.health_records'::regclass AND conname='health_records_glucose_range_check') THEN
    ALTER TABLE public.health_records ADD CONSTRAINT health_records_glucose_range_check
      CHECK (metric_type <> 'glucose' OR (value BETWEEN 40 AND 600 AND value = TRUNC(value) AND LOWER(unit) = 'mg/dl')) NOT VALID;
  END IF;
END $guard$;

ALTER TABLE public.health_records VALIDATE CONSTRAINT health_records_glucose_range_check;