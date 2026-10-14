package payroll

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository defines database operations for payroll runs and wage entries.
type Repository interface {
	CreateRun(ctx context.Context, run *PayrollRun, entries []PayrollEntry) error
	GetRunByID(ctx context.Context, id uuid.UUID) (*PayrollRun, error)
	ListRuns(ctx context.Context, limit, offset int) ([]PayrollRun, error)
	GetEntriesByRunID(ctx context.Context, runID uuid.UUID) ([]PayrollEntry, error)
	GetEntriesByWorkerID(ctx context.Context, workerID uuid.UUID, limit, offset int) ([]PayrollEntry, error)
	AggregateWorkerLots(ctx context.Context, start, end time.Time) ([]WorkerAggregation, error)
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new payroll repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// AggregateWorkerLots sums harvest weight for workers who picked tea leaves within the period.
func (r *repo) AggregateWorkerLots(ctx context.Context, start, end time.Time) ([]WorkerAggregation, error) {
	query := `
		SELECT 
			w.id AS worker_id,
			w.name AS worker_name,
			w.user_id,
			w.rate_per_kg,
			COALESCE(SUM(hl.weight_kg), 0) AS total_kg
		FROM workers w
		JOIN harvest.lots hl ON hl.worker_id = w.id
		WHERE hl.created_at >= $1 AND hl.created_at <= $2
		GROUP BY w.id, w.name, w.user_id, w.rate_per_kg
		HAVING SUM(hl.weight_kg) > 0
	`
	var results []WorkerAggregation
	err := r.db.SelectContext(ctx, &results, query, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate worker lots: %w", err)
	}
	return results, nil
}

// CreateRun inserts the payroll run header and all associated worker line entries within a transaction.
func (r *repo) CreateRun(ctx context.Context, run *PayrollRun, entries []PayrollEntry) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	runQuery := `
		INSERT INTO payroll.runs (id, period_start, period_end, run_by, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	if run.ID == uuid.Nil {
		run.ID = uuid.New()
	}
	if run.CreatedAt.IsZero() {
		run.CreatedAt = time.Now().UTC()
	}

	_, err = tx.ExecContext(ctx, runQuery, run.ID, run.PeriodStart, run.PeriodEnd, run.RunBy, run.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert payroll run: %w", err)
	}

	entryQuery := `
		INSERT INTO payroll.entries (id, run_id, worker_id, total_kg, rate_per_kg, total_amount, paid_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	now := time.Now().UTC()
	for i := range entries {
		if entries[i].ID == uuid.Nil {
			entries[i].ID = uuid.New()
		}
		entries[i].RunID = run.ID
		entries[i].CreatedAt = now

		_, err = tx.ExecContext(ctx, entryQuery,
			entries[i].ID, entries[i].RunID, entries[i].WorkerID,
			entries[i].TotalKg, entries[i].RatePerKg, entries[i].TotalAmount,
			entries[i].PaidAt, entries[i].CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert payroll entry: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit payroll transaction: %w", err)
	}

	return nil
}

// GetRunByID retrieves a payroll run with summary calculations.
func (r *repo) GetRunByID(ctx context.Context, id uuid.UUID) (*PayrollRun, error) {
	var run PayrollRun
	query := `
		SELECT 
			pr.id, pr.period_start, pr.period_end, pr.run_by, pr.created_at,
			u.email AS run_by_email,
			COALESCE(SUM(pe.total_amount), 0) AS total_amount,
			COALESCE(SUM(pe.total_kg), 0) AS total_kg,
			COUNT(pe.id)::int AS worker_count
		FROM payroll.runs pr
		JOIN users u ON pr.run_by = u.id
		LEFT JOIN payroll.entries pe ON pe.run_id = pr.id
		WHERE pr.id = $1
		GROUP BY pr.id, pr.period_start, pr.period_end, pr.run_by, pr.created_at, u.email
		LIMIT 1
	`
	err := r.db.GetContext(ctx, &run, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query payroll run: %w", err)
	}
	return &run, nil
}

// ListRuns retrieves paginated payroll runs ordered by period_start descending.
func (r *repo) ListRuns(ctx context.Context, limit, offset int) ([]PayrollRun, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			pr.id, pr.period_start, pr.period_end, pr.run_by, pr.created_at,
			u.email AS run_by_email,
			COALESCE(SUM(pe.total_amount), 0) AS total_amount,
			COALESCE(SUM(pe.total_kg), 0) AS total_kg,
			COUNT(pe.id)::int AS worker_count
		FROM payroll.runs pr
		JOIN users u ON pr.run_by = u.id
		LEFT JOIN payroll.entries pe ON pe.run_id = pr.id
		GROUP BY pr.id, pr.period_start, pr.period_end, pr.run_by, pr.created_at, u.email
		ORDER BY pr.period_start DESC
		LIMIT $1 OFFSET $2
	`
	var runs []PayrollRun
	err := r.db.SelectContext(ctx, &runs, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list payroll runs: %w", err)
	}
	return runs, nil
}

// GetEntriesByRunID retrieves all payroll lines for a specific run.
func (r *repo) GetEntriesByRunID(ctx context.Context, runID uuid.UUID) ([]PayrollEntry, error) {
	query := `
		SELECT 
			pe.id, pe.run_id, pe.worker_id, pe.total_kg, pe.rate_per_kg, pe.total_amount, pe.paid_at, pe.created_at,
			w.name AS worker_name
		FROM payroll.entries pe
		JOIN workers w ON pe.worker_id = w.id
		WHERE pe.run_id = $1
		ORDER BY w.name ASC
	`
	var entries []PayrollEntry
	err := r.db.SelectContext(ctx, &entries, query, runID)
	if err != nil {
		return nil, fmt.Errorf("failed to query payroll entries for run: %w", err)
	}
	return entries, nil
}

// GetEntriesByWorkerID retrieves payment records for a specific worker.
func (r *repo) GetEntriesByWorkerID(ctx context.Context, workerID uuid.UUID, limit, offset int) ([]PayrollEntry, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			pe.id, pe.run_id, pe.worker_id, pe.total_kg, pe.rate_per_kg, pe.total_amount, pe.paid_at, pe.created_at,
			w.name AS worker_name
		FROM payroll.entries pe
		JOIN workers w ON pe.worker_id = w.id
		WHERE pe.worker_id = $1
		ORDER BY pe.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var entries []PayrollEntry
	err := r.db.SelectContext(ctx, &entries, query, workerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query worker payroll history: %w", err)
	}
	return entries, nil
}
