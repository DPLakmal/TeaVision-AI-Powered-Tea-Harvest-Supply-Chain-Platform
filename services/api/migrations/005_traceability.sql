-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE IF NOT EXISTS traceability.batches (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    current_stage TEXT NOT NULL DEFAULT 'field' CHECK (current_stage IN ('field','processing','factory','quality_control','packaging','shipped','delivered')),
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traceability.batch_lots (
    batch_id UUID NOT NULL REFERENCES traceability.batches(id) ON DELETE CASCADE,
    lot_id   UUID NOT NULL REFERENCES harvest.lots(id),
    PRIMARY KEY (batch_id, lot_id)
);

CREATE TABLE IF NOT EXISTS traceability.batch_stages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id   UUID NOT NULL REFERENCES traceability.batches(id) ON DELETE CASCADE,
    stage      TEXT NOT NULL,
    weight_kg  NUMERIC(12,3),
    notes      TEXT,
    actor_id   UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traceability.buyers (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    contact_email TEXT,
    country       TEXT,
    user_id       UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traceability.batch_deliveries (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id     UUID NOT NULL REFERENCES traceability.batches(id) ON DELETE CASCADE,
    buyer_id     UUID NOT NULL REFERENCES traceability.buyers(id),
    delivered_at TIMESTAMPTZ,
    invoice_url  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_stages_batch_id ON traceability.batch_stages(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_stages_created_at ON traceability.batch_stages(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_lots_batch_id ON traceability.batch_lots(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_lots_lot_id ON traceability.batch_lots(lot_id);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_batch_id ON traceability.batch_deliveries(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_buyer_id ON traceability.batch_deliveries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyers_user_id ON traceability.buyers(user_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE IF EXISTS traceability.batch_deliveries;
DROP TABLE IF EXISTS traceability.buyers;
DROP TABLE IF EXISTS traceability.batch_stages;
DROP TABLE IF EXISTS traceability.batch_lots;
DROP TABLE IF EXISTS traceability.batches;
