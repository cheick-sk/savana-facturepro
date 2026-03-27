-- Quick fix for migration state inconsistency
-- Run this in PostgreSQL if you want to preserve existing data
-- instead of doing a full database reset

-- Connect to the database first:
-- docker exec -it facturepro-db psql -U facturepro -d facturepro

-- Option 1: Mark migration 0004 as complete (if all indexes exist)
-- This tells Alembic that migration 0004 has been applied
INSERT INTO alembic_version (version_num) VALUES ('0004_performance_indexes')
ON CONFLICT DO NOTHING;

-- Option 2: If you need to drop and recreate problematic indexes
-- Uncomment the lines below if needed:

-- DROP INDEX IF EXISTS ix_invoices_number;
-- CREATE UNIQUE INDEX ix_invoices_number ON invoices (invoice_number);

-- Verify the migration state
SELECT * FROM alembic_version;
