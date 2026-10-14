package worker

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/user"
)

// Service defines business operations for managing workers.
type Service interface {
	CreateWorker(ctx context.Context, req CreateWorkerRequest) (*Worker, error)
	GetWorker(ctx context.Context, id uuid.UUID) (*Worker, error)
	UpdateWorker(ctx context.Context, id uuid.UUID, req UpdateWorkerRequest) (*Worker, error)
	ListWorkers(ctx context.Context, gardenID *uuid.UUID, limit, offset int) ([]Worker, error)
	GetWorkerHarvests(ctx context.Context, callerUserID string, callerRole string, workerID uuid.UUID, limit, offset int) ([]WorkerHarvestLot, error)
}

type service struct {
	repo Repository
}

// NewService creates a new worker service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// CreateWorker registers a new worker linked to an existing user account.
func (s *service) CreateWorker(ctx context.Context, req CreateWorkerRequest) (*Worker, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("worker name is required")
	}
	if req.UserID == uuid.Nil {
		return nil, errors.New("valid user_id is required")
	}
	if req.RatePerKg < 0 {
		return nil, errors.New("rate_per_kg cannot be negative")
	}

	existing, err := s.repo.FindByUserID(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing worker: %w", err)
	}
	if existing != nil {
		return nil, errors.New("worker profile already exists for this user")
	}

	joinedAt := time.Now().UTC()
	if req.JoinedAt != nil && *req.JoinedAt != "" {
		t, err := time.Parse("2006-01-02", *req.JoinedAt)
		if err == nil {
			joinedAt = t
		}
	}

	w := &Worker{
		ID:        uuid.New(),
		UserID:    req.UserID,
		Name:      req.Name,
		GardenID:  req.GardenID,
		RatePerKg: req.RatePerKg,
		JoinedAt:  joinedAt,
	}

	if err := s.repo.Create(ctx, w); err != nil {
		return nil, fmt.Errorf("failed to create worker: %w", err)
	}

	return s.repo.FindByID(ctx, w.ID)
}

// GetWorker retrieves worker details by ID.
func (s *service) GetWorker(ctx context.Context, id uuid.UUID) (*Worker, error) {
	w, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get worker: %w", err)
	}
	if w == nil {
		return nil, errors.New("worker not found")
	}
	return w, nil
}

// UpdateWorker updates worker name, assigned garden, and rate.
func (s *service) UpdateWorker(ctx context.Context, id uuid.UUID, req UpdateWorkerRequest) (*Worker, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("worker name cannot be empty")
	}
	if req.RatePerKg < 0 {
		return nil, errors.New("rate_per_kg cannot be negative")
	}

	w, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to verify worker: %w", err)
	}
	if w == nil {
		return nil, errors.New("worker not found")
	}

	w.Name = req.Name
	w.GardenID = req.GardenID
	w.RatePerKg = req.RatePerKg

	if err := s.repo.Update(ctx, w); err != nil {
		return nil, fmt.Errorf("failed to update worker: %w", err)
	}

	return s.repo.FindByID(ctx, id)
}

// ListWorkers returns paginated workers.
func (s *service) ListWorkers(ctx context.Context, gardenID *uuid.UUID, limit, offset int) ([]Worker, error) {
	workers, err := s.repo.List(ctx, gardenID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list workers: %w", err)
	}
	return workers, nil
}

// GetWorkerHarvests returns harvest lots collected by a worker with permission validation.
func (s *service) GetWorkerHarvests(ctx context.Context, callerUserID string, callerRole string, workerID uuid.UUID, limit, offset int) ([]WorkerHarvestLot, error) {
	w, err := s.repo.FindByID(ctx, workerID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify worker: %w", err)
	}
	if w == nil {
		return nil, errors.New("worker not found")
	}

	// If field worker, restrict access to only their own records
	if callerRole == user.RoleFieldWorker && w.UserID.String() != callerUserID {
		return nil, errors.New("forbidden: field workers may only view their own harvests")
	}

	return s.repo.GetHarvestsByWorkerID(ctx, workerID, limit, offset)
}
