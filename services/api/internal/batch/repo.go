package batch

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/teavision/api/internal/harvest"
)

// Repository defines database operations for batches, stages, buyers, and deliveries.
type Repository interface {
	CreateBatch(ctx context.Context, b *Batch, lotIDs []uuid.UUID, initialWeight *float64, notes *string) error
	GetBatchByID(ctx context.Context, id uuid.UUID) (*Batch, error)
	ListBatches(ctx context.Context, stage *string, limit, offset int) ([]Batch, error)
	AddStage(ctx context.Context, stage *BatchStage) error
	GetStagesByBatchID(ctx context.Context, batchID uuid.UUID) ([]BatchStage, error)
	GetLotsByBatchID(ctx context.Context, batchID uuid.UUID) ([]harvest.HarvestLot, error)

	CreateBuyer(ctx context.Context, b *Buyer) error
	GetBuyerByID(ctx context.Context, id uuid.UUID) (*Buyer, error)
	GetBuyerByUserID(ctx context.Context, userID uuid.UUID) (*Buyer, error)
	ListBuyers(ctx context.Context, limit, offset int) ([]Buyer, error)

	CreateDelivery(ctx context.Context, d *BatchDelivery) error
	GetDeliveriesByBatchID(ctx context.Context, batchID uuid.UUID) ([]BatchDelivery, error)
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new batch traceability repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// CreateBatch inserts a batch, links lot IDs, and creates the initial "field" stage within a transaction.
func (r *repo) CreateBatch(ctx context.Context, b *Batch, lotIDs []uuid.UUID, initialWeight *float64, notes *string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin batch transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	if b.CurrentStage == "" {
		b.CurrentStage = StageField
	}
	b.CreatedAt = time.Now().UTC()

	batchQuery := `
		INSERT INTO traceability.batches (id, name, current_stage, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = tx.ExecContext(ctx, batchQuery, b.ID, b.Name, b.CurrentStage, b.CreatedBy, b.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert batch: %w", err)
	}

	lotLinkQuery := `
		INSERT INTO traceability.batch_lots (batch_id, lot_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`
	for _, lotID := range lotIDs {
		_, err = tx.ExecContext(ctx, lotLinkQuery, b.ID, lotID)
		if err != nil {
			return fmt.Errorf("failed to link lot %s to batch: %w", lotID, err)
		}
	}

	// Create initial stage entry
	stageQuery := `
		INSERT INTO traceability.batch_stages (id, batch_id, stage, weight_kg, notes, actor_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	stageID := uuid.New()
	_, err = tx.ExecContext(ctx, stageQuery, stageID, b.ID, b.CurrentStage, initialWeight, notes, b.CreatedBy, b.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create initial batch stage: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit batch transaction: %w", err)
	}

	return nil
}

// GetBatchByID retrieves a batch by its UUID.
func (r *repo) GetBatchByID(ctx context.Context, id uuid.UUID) (*Batch, error) {
	var b Batch
	query := `
		SELECT tb.id, tb.name, tb.current_stage, tb.created_by, tb.created_at, u.email AS creator_email
		FROM traceability.batches tb
		LEFT JOIN users u ON tb.created_by = u.id
		WHERE tb.id = $1 LIMIT 1
	`
	err := r.db.GetContext(ctx, &b, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query batch: %w", err)
	}
	return &b, nil
}

// ListBatches retrieves paginated batches, optionally filtered by stage.
func (r *repo) ListBatches(ctx context.Context, stage *string, limit, offset int) ([]Batch, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var batches []Batch
	query := `
		SELECT tb.id, tb.name, tb.current_stage, tb.created_by, tb.created_at, u.email AS creator_email
		FROM traceability.batches tb
		LEFT JOIN users u ON tb.created_by = u.id
		WHERE ($1::text IS NULL OR tb.current_stage = $1)
		ORDER BY tb.created_at DESC
		LIMIT $2 OFFSET $3
	`
	err := r.db.SelectContext(ctx, &batches, query, stage, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list batches: %w", err)
	}
	return batches, nil
}

// AddStage appends a new processing stage to a batch and updates its current_stage.
func (r *repo) AddStage(ctx context.Context, stage *BatchStage) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin stage transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if stage.ID == uuid.Nil {
		stage.ID = uuid.New()
	}
	stage.CreatedAt = time.Now().UTC()

	insertQuery := `
		INSERT INTO traceability.batch_stages (id, batch_id, stage, weight_kg, notes, actor_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err = tx.ExecContext(ctx, insertQuery,
		stage.ID, stage.BatchID, stage.Stage, stage.WeightKg, stage.Notes, stage.ActorID, stage.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert batch stage: %w", err)
	}

	updateBatchQuery := `UPDATE traceability.batches SET current_stage = $1 WHERE id = $2`
	res, err := tx.ExecContext(ctx, updateBatchQuery, stage.Stage, stage.BatchID)
	if err != nil {
		return fmt.Errorf("failed to update batch current_stage: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check affected rows: %w", err)
	}
	if rows == 0 {
		return errors.New("batch not found")
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit stage update: %w", err)
	}

	return nil
}

// GetStagesByBatchID retrieves all stages logged for a batch ordered by timestamp.
func (r *repo) GetStagesByBatchID(ctx context.Context, batchID uuid.UUID) ([]BatchStage, error) {
	query := `
		SELECT 
			bs.id, bs.batch_id, bs.stage, bs.weight_kg, bs.notes, bs.actor_id, bs.created_at,
			u.email AS actor_email
		FROM traceability.batch_stages bs
		LEFT JOIN users u ON bs.actor_id = u.id
		WHERE bs.batch_id = $1
		ORDER BY bs.created_at ASC
	`
	var stages []BatchStage
	err := r.db.SelectContext(ctx, &stages, query, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to query batch stages: %w", err)
	}
	return stages, nil
}

// GetLotsByBatchID retrieves all harvest lots linked to a batch.
func (r *repo) GetLotsByBatchID(ctx context.Context, batchID uuid.UUID) ([]harvest.HarvestLot, error) {
	query := `
		SELECT 
			hl.id, hl.session_id, hl.worker_id, hl.weight_kg, hl.grade, hl.confidence,
			hl.image_url, hl.graded_at, hl.synced_from_mobile, hl.created_at,
			w.name AS worker_name
		FROM traceability.batch_lots bl
		JOIN harvest.lots hl ON bl.lot_id = hl.id
		JOIN workers w ON hl.worker_id = w.id
		WHERE bl.batch_id = $1
		ORDER BY hl.created_at ASC
	`
	var lots []harvest.HarvestLot
	err := r.db.SelectContext(ctx, &lots, query, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to query linked lots for batch: %w", err)
	}
	return lots, nil
}

// CreateBuyer registers a new buyer customer profile.
func (r *repo) CreateBuyer(ctx context.Context, b *Buyer) error {
	query := `
		INSERT INTO traceability.buyers (id, name, contact_email, country, user_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	b.CreatedAt = time.Now().UTC()

	_, err := r.db.ExecContext(ctx, query, b.ID, b.Name, b.ContactEmail, b.Country, b.UserID, b.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert buyer: %w", err)
	}
	return nil
}

// GetBuyerByID retrieves a buyer by ID.
func (r *repo) GetBuyerByID(ctx context.Context, id uuid.UUID) (*Buyer, error) {
	var b Buyer
	query := `SELECT id, name, contact_email, country, user_id, created_at FROM traceability.buyers WHERE id = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &b, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query buyer: %w", err)
	}
	return &b, nil
}

// GetBuyerByUserID retrieves a buyer associated with a specific user ID.
func (r *repo) GetBuyerByUserID(ctx context.Context, userID uuid.UUID) (*Buyer, error) {
	var b Buyer
	query := `SELECT id, name, contact_email, country, user_id, created_at FROM traceability.buyers WHERE user_id = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &b, query, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query buyer by user_id: %w", err)
	}
	return &b, nil
}

// ListBuyers returns paginated registered buyers.
func (r *repo) ListBuyers(ctx context.Context, limit, offset int) ([]Buyer, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var buyers []Buyer
	query := `SELECT id, name, contact_email, country, user_id, created_at FROM traceability.buyers ORDER BY name ASC LIMIT $1 OFFSET $2`
	err := r.db.SelectContext(ctx, &buyers, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list buyers: %w", err)
	}
	return buyers, nil
}

// CreateDelivery registers shipment/delivery to a buyer.
func (r *repo) CreateDelivery(ctx context.Context, d *BatchDelivery) error {
	query := `
		INSERT INTO traceability.batch_deliveries (id, batch_id, buyer_id, delivered_at, invoice_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	d.CreatedAt = time.Now().UTC()

	_, err := r.db.ExecContext(ctx, query, d.ID, d.BatchID, d.BuyerID, d.DeliveredAt, d.InvoiceURL, d.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to record batch delivery: %w", err)
	}
	return nil
}

// GetDeliveriesByBatchID retrieves all deliveries recorded for a batch.
func (r *repo) GetDeliveriesByBatchID(ctx context.Context, batchID uuid.UUID) ([]BatchDelivery, error) {
	query := `
		SELECT 
			bd.id, bd.batch_id, bd.buyer_id, bd.delivered_at, bd.invoice_url, bd.created_at,
			b.name AS buyer_name, b.contact_email AS buyer_email, b.country
		FROM traceability.batch_deliveries bd
		JOIN traceability.buyers b ON bd.buyer_id = b.id
		WHERE bd.batch_id = $1
		ORDER BY bd.created_at DESC
	`
	var deliveries []BatchDelivery
	err := r.db.SelectContext(ctx, &deliveries, query, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to query batch deliveries: %w", err)
	}
	return deliveries, nil
}
