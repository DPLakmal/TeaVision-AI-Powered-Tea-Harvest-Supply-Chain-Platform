package analytics

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository defines aggregate database queries for business intelligence and reporting.
type Repository interface {
	GetYield(ctx context.Context, gardenID *uuid.UUID, startDate, endDate *time.Time) ([]YieldData, error)
	GetQuality(ctx context.Context, gardenID *uuid.UUID, startDate, endDate *time.Time) ([]QualityData, error)
	GetTopWorkers(ctx context.Context, limit int, startDate, endDate *time.Time) ([]WorkerPerformance, error)
	GetPayrollSummaries(ctx context.Context, startDate, endDate *time.Time) ([]PayrollSummary, error)
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new analytics repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// GetYield aggregates harvested weight grouped by calendar day.
func (r *repo) GetYield(ctx context.Context, gardenID *uuid.UUID, startDate, endDate *time.Time) ([]YieldData, error) {
	query := `
		SELECT 
			DATE_TRUNC('day', hl.created_at) AS date,
			COALESCE(SUM(hl.weight_kg), 0) AS total_weight_kg,
			COUNT(hl.id)::bigint AS lot_count
		FROM harvest.lots hl
		JOIN harvest.sessions hs ON hl.session_id = hs.id
		WHERE ($1::uuid IS NULL OR hs.garden_id = $1)
		  AND ($2::timestamptz IS NULL OR hl.created_at >= $2)
		  AND ($3::timestamptz IS NULL OR hl.created_at <= $3)
		GROUP BY 1
		ORDER BY 1 ASC
	`
	var results []YieldData
	err := r.db.SelectContext(ctx, &results, query, gardenID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query yield analytics: %w", err)
	}
	return results, nil
}

// GetQuality aggregates leaf counts and total weight grouped by grade classification.
func (r *repo) GetQuality(ctx context.Context, gardenID *uuid.UUID, startDate, endDate *time.Time) ([]QualityData, error) {
	query := `
		SELECT 
			COALESCE(hl.grade, 'ungraded') AS grade,
			COUNT(hl.id)::bigint AS count,
			COALESCE(SUM(hl.weight_kg), 0) AS total_weight_kg
		FROM harvest.lots hl
		JOIN harvest.sessions hs ON hl.session_id = hs.id
		WHERE ($1::uuid IS NULL OR hs.garden_id = $1)
		  AND ($2::timestamptz IS NULL OR hl.created_at >= $2)
		  AND ($3::timestamptz IS NULL OR hl.created_at <= $3)
		GROUP BY hl.grade
		ORDER BY count DESC
	`
	var results []QualityData
	err := r.db.SelectContext(ctx, &results, query, gardenID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query quality analytics: %w", err)
	}

	var totalWeight float64
	for _, row := range results {
		totalWeight += row.TotalWeightKg
	}

	if totalWeight > 0 {
		for i := range results {
			results[i].Percentage = math.Round((results[i].TotalWeightKg/totalWeight)*10000) / 100
		}
	}

	return results, nil
}

// GetTopWorkers ranks workers by total harvested kilograms within the period.
func (r *repo) GetTopWorkers(ctx context.Context, limit int, startDate, endDate *time.Time) ([]WorkerPerformance, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT 
			w.id AS worker_id,
			w.name AS worker_name,
			COALESCE(SUM(hl.weight_kg), 0) AS total_weight_kg,
			COUNT(hl.id)::bigint AS lot_count,
			COALESCE(AVG(hl.weight_kg), 0) AS average_weight_kg
		FROM workers w
		JOIN harvest.lots hl ON hl.worker_id = w.id
		WHERE ($1::timestamptz IS NULL OR hl.created_at >= $1)
		  AND ($2::timestamptz IS NULL OR hl.created_at <= $2)
		GROUP BY w.id, w.name
		ORDER BY total_weight_kg DESC
		LIMIT $3
	`
	var results []WorkerPerformance
	err := r.db.SelectContext(ctx, &results, query, startDate, endDate, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query worker performance analytics: %w", err)
	}
	return results, nil
}

// GetPayrollSummaries aggregates wage payouts across completed payroll runs.
func (r *repo) GetPayrollSummaries(ctx context.Context, startDate, endDate *time.Time) ([]PayrollSummary, error) {
	query := `
		SELECT 
			pr.id,
			pr.period_start,
			pr.period_end,
			COUNT(pe.id)::bigint AS total_workers,
			COALESCE(SUM(pe.total_kg), 0) AS total_weight_kg,
			COALESCE(SUM(pe.total_amount), 0) AS total_payout
		FROM payroll.runs pr
		LEFT JOIN payroll.entries pe ON pe.run_id = pr.id
		WHERE ($1::timestamptz IS NULL OR pr.period_start >= $1)
		  AND ($2::timestamptz IS NULL OR pr.period_end <= $2)
		GROUP BY pr.id, pr.period_start, pr.period_end
		ORDER BY pr.period_start DESC
	`
	var results []PayrollSummary
	err := r.db.SelectContext(ctx, &results, query, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query payroll summaries: %w", err)
	}
	return results, nil
}
