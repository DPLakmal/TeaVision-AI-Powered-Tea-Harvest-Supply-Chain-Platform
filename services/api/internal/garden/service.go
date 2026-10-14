package garden

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// Service defines business operations for tea gardens.
type Service interface {
	CreateGarden(ctx context.Context, req CreateGardenRequest) (*TeaGarden, error)
	GetGarden(ctx context.Context, id uuid.UUID) (*TeaGarden, error)
	UpdateGarden(ctx context.Context, id uuid.UUID, req UpdateGardenRequest) (*TeaGarden, error)
	ListGardens(ctx context.Context, limit, offset int) ([]TeaGarden, error)
}

type service struct {
	repo Repository
}

// NewService creates a new garden service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// CreateGarden validates input and inserts a new tea garden.
func (s *service) CreateGarden(ctx context.Context, req CreateGardenRequest) (*TeaGarden, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("garden name is required")
	}

	g := &TeaGarden{
		ID:           uuid.New(),
		Name:         req.Name,
		LocationLat:  req.LocationLat,
		LocationLng:  req.LocationLng,
		AreaHectares: req.AreaHectares,
	}

	if err := s.repo.Create(ctx, g); err != nil {
		return nil, fmt.Errorf("failed to create garden: %w", err)
	}

	return g, nil
}

// GetGarden retrieves a tea garden by its ID.
func (s *service) GetGarden(ctx context.Context, id uuid.UUID) (*TeaGarden, error) {
	g, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get garden: %w", err)
	}
	if g == nil {
		return nil, errors.New("garden not found")
	}
	return g, nil
}

// UpdateGarden modifies an existing tea garden's details.
func (s *service) UpdateGarden(ctx context.Context, id uuid.UUID, req UpdateGardenRequest) (*TeaGarden, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("garden name cannot be empty")
	}

	g, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to verify garden: %w", err)
	}
	if g == nil {
		return nil, errors.New("garden not found")
	}

	g.Name = req.Name
	g.LocationLat = req.LocationLat
	g.LocationLng = req.LocationLng
	g.AreaHectares = req.AreaHectares

	if err := s.repo.Update(ctx, g); err != nil {
		return nil, fmt.Errorf("failed to update garden: %w", err)
	}

	return g, nil
}

// ListGardens returns paginated tea gardens.
func (s *service) ListGardens(ctx context.Context, limit, offset int) ([]TeaGarden, error) {
	gardens, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list gardens: %w", err)
	}
	return gardens, nil
}
