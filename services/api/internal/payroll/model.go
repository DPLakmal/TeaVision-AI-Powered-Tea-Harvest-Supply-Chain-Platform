// Package payroll provides models, calculation logic, and HTTP endpoints for worker wage payrolls.
package payroll

import (
	"time"

	"github.com/google/uuid"
)

// PayrollRun represents a finalized wage distribution run for a time period.
type PayrollRun struct {
	ID          uuid.UUID      `db:"id" json:"id"`
	PeriodStart time.Time      `db:"period_start" json:"period_start"`
	PeriodEnd   time.Time      `db:"period_end" json:"period_end"`
	RunBy       uuid.UUID      `db:"run_by" json:"run_by"`
	CreatedAt   time.Time      `db:"created_at" json:"created_at"`
	RunByEmail  *string        `db:"run_by_email" json:"run_by_email,omitempty"`
	Entries     []PayrollEntry `json:"entries,omitempty"`
	TotalAmount float64        `db:"total_amount" json:"total_amount,omitempty"`
	TotalKg     float64        `db:"total_kg" json:"total_kg,omitempty"`
	WorkerCount int            `db:"worker_count" json:"worker_count,omitempty"`
}

// PayrollEntry represents a single worker's compensation line item in a payroll run.
type PayrollEntry struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	RunID       uuid.UUID  `db:"run_id" json:"run_id"`
	WorkerID    uuid.UUID  `db:"worker_id" json:"worker_id"`
	TotalKg     float64    `db:"total_kg" json:"total_kg"`
	RatePerKg   float64    `db:"rate_per_kg" json:"rate_per_kg"`
	TotalAmount float64    `db:"total_amount" json:"total_amount"`
	PaidAt      *time.Time `db:"paid_at" json:"paid_at"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	WorkerName  *string    `db:"worker_name" json:"worker_name,omitempty"`
}

// RunPayrollRequest defines the payload to execute a payroll run for a date range.
type RunPayrollRequest struct {
	PeriodStart string `json:"period_start" example:"2025-01-01"`
	PeriodEnd   string `json:"period_end" example:"2025-01-15"`
}

// WorkerAggregation represents aggregated harvest weight for a worker in a date range.
type WorkerAggregation struct {
	WorkerID   uuid.UUID `db:"worker_id"`
	WorkerName string    `db:"worker_name"`
	UserID     uuid.UUID `db:"user_id"`
	RatePerKg  float64   `db:"rate_per_kg"`
	TotalKg    float64   `db:"total_kg"`
}
