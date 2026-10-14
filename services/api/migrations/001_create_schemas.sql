-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE SCHEMA IF NOT EXISTS harvest;
CREATE SCHEMA IF NOT EXISTS payroll;
CREATE SCHEMA IF NOT EXISTS traceability;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP SCHEMA IF EXISTS traceability CASCADE;
DROP SCHEMA IF EXISTS payroll CASCADE;
DROP SCHEMA IF EXISTS harvest CASCADE;
