package worker

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository defines database operations for workers.
type Repository interface {
	Create(ctx context.Context, w *Worker) error
	FindByID(ctx context.Context, id uuid.UUID) (*Worker, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) (*Worker, error)
	Update(ctx context.Context, w *Worker) error
	List(ctx context.Context, gardenID *uuid.UUID, limit, offset int) ([]Worker, error)
	GetHarvestsByWorkerID(ctx context.Context, workerID uuid.UUID, limit, offset int) ([]WorkerHarvestLot, error)
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new worker repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// Create inserts a new worker record.
func (r *repo) Create(ctx context.Context, w *Worker) error {
	query := `
		INSERT INTO workers (id, user_id, name, garden_id, rate_per_kg, joined_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	if w.JoinedAt.IsZero() {
		w.JoinedAt = time.Now().UTC()
	}
	w.CreatedAt = time.Now().UTC()

	_, err := r.db.ExecContext(ctx, query, w.ID, w.UserID, w.Name, w.GardenID, w.RatePerKg, w.JoinedAt, w.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert worker: %w", err)
	}
	return nil
}

// FindByID retrieves a worker by ID with garden name and user email joined.
func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*Worker, error) {
	var w Worker
	query := `
		SELECT 
			w.id, w.user_id, w.name, w.garden_id, w.rate_per_kg, w.joined_at, w.created_at,
			tg.name AS garden_name,
			u.email AS user_email
		FROM workers w
		LEFT JOIN tea_gardens tg ON w.garden_id = tg.id
		LEFT JOIN users u ON w.user_id = u.id
		WHERE w.id = $1 LIMIT 1
	`
	err := r.db.GetContext(ctx, &w, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query worker by id: %w", err)
	}
	return &w, nil
}

// FindByUserID retrieves a worker by user_id.
func (r *repo) FindByUserID(ctx context.Context, userID uuid.UUID) (*Worker, error) {
	var w Worker
	query := `
		SELECT 
			w.id, w.user_id, w.name, w.garden_id, w.rate_per_kg, w.joined_at, w.created_at,
			tg.name AS garden_name,
			u.email AS user_email
		FROM workers w
		LEFT JOIN tea_gardens tg ON w.garden_id = tg.id
		LEFT JOIN users u ON w.user_id = u.id
		WHERE w.user_id = $1 LIMIT 1
	`
	err := r.db.GetContext(ctx, &w, query, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query worker by user_id: %w", err)
	}
	return &w, nil
}

// Update modifies worker fields.
func (r *repo) Update(ctx context.Context, w *Worker) error {
	query := `
		UPDATE workers
		SET name = $1, garden_id = $2, rate_per_kg = $3
		WHERE id = $4
	`
	res, err := r.db.ExecContext(ctx, query, w.Name, w.GardenID, w.RatePerKg, w.ID)
	if err != nil {
		return fmt.Errorf("failed to update worker: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check affected rows: %w", err)
	}
	if rows == 0 {
		return errors.New("worker not found")
	}
	return nil
}

// List returns workers optionally filtered by garden_id.
func (r *repo) List(ctx context.Context, gardenID *uuid.UUID, limit, offset int) ([]Worker, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var workers []Worker
	var err error

	if gardenID != nil {
		query := `
			SELECT 
				w.id, w.user_id, w.name, w.garden_id, w.rate_per_kg, w.joined_at, w.created_at,
				tg.name AS garden_name,
				u.email AS user_email
			FROM workers w
			LEFT JOIN tea_gardens tg ON w.garden_id = tg.id
			LEFT JOIN users u ON w.user_id = u.id
			WHERE w.garden_id = $1
			ORDER BY w.name ASC
			LIMIT $2 OFFSET $3
		`
		err = r.db.SelectContext(ctx, &workers, query, gardenID, limit, offset)
	} else {
		query := `
			SELECT 
				w.id, w.user_id, w.name, w.garden_id, w.rate_per_kg, w.joined_at, w.created_at,
				tg.name AS garden_name,
				u.email AS user_email
			FROM workers w
			LEFT JOIN tea_gardens tg ON w.garden_id = tg.id
			LEFT JOIN users u ON w.user_id = u.id
			ORDER BY w.name ASC
			LIMIT $1 OFFSET $2
		`
		err = r.db.SelectContext(ctx, &workers, query, limit, offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list workers: %w", err)
	}
	return workers, nil
}

// GetHarvestsByWorkerID returns paginated harvest lots for a specific worker.
func (r *repo) GetHarvestsByWorkerID(ctx context.Context, workerID uuid.UUID, limit, offset int) ([]WorkerHarvestLot, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var lots []WorkerHarvestLot
	query := `
		SELECT 
			id, session_id, worker_id, weight_kg, grade, confidence, image_url, graded_at, synced_from_mobile, created_at
		FROM harvest.lots
		WHERE worker_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	err := r.db.SelectContext(ctx, &lots, query, workerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query worker harvest lots: %w", err)
	}
	return lots, nil
}
