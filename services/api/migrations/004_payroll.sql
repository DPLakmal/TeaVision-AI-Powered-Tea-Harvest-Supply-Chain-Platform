-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE IF NOT EXISTS payroll.runs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,
    run_by       UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll.entries (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id       UUID NOT NULL REFERENCES payroll.runs(id) ON DELETE CASCADE,
    worker_id    UUID NOT NULL REFERENCES workers(id),
    total_kg     NUMERIC(12,3) NOT NULL,
    rate_per_kg  NUMERIC(10,4) NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    paid_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll.runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_run_id ON payroll.entries(run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_worker_id ON payroll.entries(worker_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE IF EXISTS payroll.entries;
DROP TABLE IF EXISTS payroll.runs;
