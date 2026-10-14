package payroll

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/user"
	"github.com/teavision/api/internal/worker"
)

// Service defines business operations for executing payroll calculations.
type Service interface {
	RunPayroll(ctx context.Context, runBy uuid.UUID, req RunPayrollRequest) (*PayrollRun, error)
	GetRun(ctx context.Context, id uuid.UUID) (*PayrollRun, error)
	ListRuns(ctx context.Context, limit, offset int) ([]PayrollRun, error)
	GetWorkerPayroll(ctx context.Context, callerUserID string, callerRole string, workerID uuid.UUID, limit, offset int) ([]PayrollEntry, error)
}

type service struct {
	repo       Repository
	workerRepo worker.Repository
}

// NewService creates a new payroll service.
func NewService(repo Repository, workerRepo worker.Repository) Service {
	return &service{
		repo:       repo,
		workerRepo: workerRepo,
	}
}

// RunPayroll aggregates all lots collected during the period and executes a payroll calculation run.
func (s *service) RunPayroll(ctx context.Context, runBy uuid.UUID, req RunPayrollRequest) (*PayrollRun, error) {
	if req.PeriodStart == "" || req.PeriodEnd == "" {
		return nil, errors.New("both period_start and period_end are required (YYYY-MM-DD)")
	}

	start, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		return nil, fmt.Errorf("invalid period_start format (must be YYYY-MM-DD): %w", err)
	}

	end, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		return nil, fmt.Errorf("invalid period_end format (must be YYYY-MM-DD): %w", err)
	}

	if end.Before(start) {
		return nil, errors.New("period_end cannot be before period_start")
	}

	// Adjust end time to end of day UTC
	endOfDay := end.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	aggregations, err := s.repo.AggregateWorkerLots(ctx, start, endOfDay)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate worker harvest lots: %w", err)
	}

	if len(aggregations) == 0 {
		return nil, errors.New("no harvest activity found for workers within the specified period")
	}

	run := &PayrollRun{
		ID:          uuid.New(),
		PeriodStart: start,
		PeriodEnd:   end,
		RunBy:       runBy,
		CreatedAt:   time.Now().UTC(),
	}

	entries := make([]PayrollEntry, 0, len(aggregations))
	for _, agg := range aggregations {
		// Round total amount to 2 decimal places
		amount := math.Round(agg.TotalKg*agg.RatePerKg*100) / 100

		entries = append(entries, PayrollEntry{
			ID:          uuid.New(),
			RunID:       run.ID,
			WorkerID:    agg.WorkerID,
			TotalKg:     agg.TotalKg,
			RatePerKg:   agg.RatePerKg,
			TotalAmount: amount,
		})
	}

	if err := s.repo.CreateRun(ctx, run, entries); err != nil {
		return nil, fmt.Errorf("failed to persist payroll run: %w", err)
	}

	createdRun, err := s.repo.GetRunByID(ctx, run.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to load created payroll run: %w", err)
	}

	createdRun.Entries = entries
	return createdRun, nil
}

// GetRun retrieves a payroll run and its associated line items.
func (s *service) GetRun(ctx context.Context, id uuid.UUID) (*PayrollRun, error) {
	run, err := s.repo.GetRunByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get payroll run: %w", err)
	}
	if run == nil {
		return nil, errors.New("payroll run not found")
	}

	entries, err := s.repo.GetEntriesByRunID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get payroll entries: %w", err)
	}
	run.Entries = entries

	return run, nil
}

// ListRuns returns paginated payroll runs.
func (s *service) ListRuns(ctx context.Context, limit, offset int) ([]PayrollRun, error) {
	runs, err := s.repo.ListRuns(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list payroll runs: %w", err)
	}
	return runs, nil
}

// GetWorkerPayroll retrieves historical payroll entries for a worker with RBAC enforcement.
func (s *service) GetWorkerPayroll(ctx context.Context, callerUserID string, callerRole string, workerID uuid.UUID, limit, offset int) ([]PayrollEntry, error) {
	w, err := s.workerRepo.FindByID(ctx, workerID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify worker: %w", err)
	}
	if w == nil {
		return nil, errors.New("worker not found")
	}

	if callerRole == user.RoleFieldWorker && w.UserID.String() != callerUserID {
		return nil, errors.New("forbidden: field workers can only view their own payroll records")
	}

	return s.repo.GetEntriesByWorkerID(ctx, workerID, limit, offset)
}
