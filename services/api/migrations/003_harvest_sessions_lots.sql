-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE IF NOT EXISTS harvest.sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garden_id     UUID NOT NULL REFERENCES tea_gardens(id),
    supervisor_id UUID NOT NULL REFERENCES users(id),
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    notes         TEXT
);

CREATE TABLE IF NOT EXISTS harvest.lots (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id         UUID NOT NULL REFERENCES harvest.sessions(id),
    worker_id          UUID NOT NULL REFERENCES workers(id),
    weight_kg          NUMERIC(10,3) NOT NULL,
    grade              TEXT CHECK (grade IN ('high','medium','low')),
    confidence         NUMERIC(5,4),
    image_url          TEXT,
    graded_at          TIMESTAMPTZ,
    synced_from_mobile BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_harvest_sessions_garden_id ON harvest.sessions(garden_id);
CREATE INDEX IF NOT EXISTS idx_harvest_sessions_supervisor_id ON harvest.sessions(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_harvest_lots_session_id ON harvest.lots(session_id);
CREATE INDEX IF NOT EXISTS idx_harvest_lots_worker_id ON harvest.lots(worker_id);
CREATE INDEX IF NOT EXISTS idx_harvest_lots_created_at ON harvest.lots(created_at);
CREATE INDEX IF NOT EXISTS idx_harvest_lots_grade ON harvest.lots(grade);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE IF EXISTS harvest.lots;
DROP TABLE IF EXISTS harvest.sessions;
