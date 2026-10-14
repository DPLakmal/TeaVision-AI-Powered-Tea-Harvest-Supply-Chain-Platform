// Package analytics provides aggregate metrics, yield analysis, quality distributions, and labor statistics.
package analytics

import (
	"time"

	"github.com/google/uuid"
)

// YieldData represents daily or periodic harvest yield volume.
type YieldData struct {
	Date          time.Time `db:"date" json:"date"`
	TotalWeightKg float64   `db:"total_weight_kg" json:"total_weight_kg"`
	LotCount      int64     `db:"lot_count" json:"lot_count"`
}

// QualityData represents tea leaf quality distribution by grade.
type QualityData struct {
	Grade         string  `db:"grade" json:"grade"`
	Count         int64   `db:"count" json:"count"`
	TotalWeightKg float64 `db:"total_weight_kg" json:"total_weight_kg"`
	Percentage    float64 `json:"percentage"`
}

// WorkerPerformance represents productivity metrics for a field worker.
type WorkerPerformance struct {
	WorkerID        uuid.UUID `db:"worker_id" json:"worker_id"`
	WorkerName      string    `db:"worker_name" json:"worker_name"`
	TotalWeightKg   float64   `db:"total_weight_kg" json:"total_weight_kg"`
	LotCount        int64     `db:"lot_count" json:"lot_count"`
	AverageWeightKg float64   `db:"average_weight_kg" json:"average_weight_kg"`
}

// PayrollSummary represents macro financial and harvest totals per payroll cycle.
type PayrollSummary struct {
	RunID         uuid.UUID `db:"id" json:"run_id"`
	PeriodStart   time.Time `db:"period_start" json:"period_start"`
	PeriodEnd     time.Time `db:"period_end" json:"period_end"`
	TotalWorkers  int64     `db:"total_workers" json:"total_workers"`
	TotalWeightKg float64   `db:"total_weight_kg" json:"total_weight_kg"`
	TotalPayout   float64   `db:"total_payout" json:"total_payout"`
}
