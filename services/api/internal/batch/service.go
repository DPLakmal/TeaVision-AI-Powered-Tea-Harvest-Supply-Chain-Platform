package batch

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/user"
)

// Service defines business operations for tea batch tracking, stage progress, and traceability.
type Service interface {
	CreateBatch(ctx context.Context, createdBy uuid.UUID, req CreateBatchRequest) (*Batch, error)
	GetBatch(ctx context.Context, id uuid.UUID) (*Batch, error)
	ListBatches(ctx context.Context, stage *string, limit, offset int) ([]Batch, error)
	AdvanceStage(ctx context.Context, batchID uuid.UUID, actorID uuid.UUID, req AdvanceStageRequest) (*BatchStage, error)
	GetTrace(ctx context.Context, callerUserID string, callerRole string, batchID uuid.UUID) (*BatchTrace, error)

	CreateBuyer(ctx context.Context, req CreateBuyerRequest) (*Buyer, error)
	ListBuyers(ctx context.Context, limit, offset int) ([]Buyer, error)
	CreateDelivery(ctx context.Context, req CreateDeliveryRequest) (*BatchDelivery, error)
}

type service struct {
	repo Repository
}

// NewService creates a new batch service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// CreateBatch initiates a new batch linked to specified harvest lots.
func (s *service) CreateBatch(ctx context.Context, createdBy uuid.UUID, req CreateBatchRequest) (*Batch, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("batch name is required")
	}

	b := &Batch{
		ID:           uuid.New(),
		Name:         req.Name,
		CurrentStage: StageField,
		CreatedBy:    &createdBy,
	}

	if err := s.repo.CreateBatch(ctx, b, req.LotIDs, req.InitialWeightKg, req.Notes); err != nil {
		return nil, fmt.Errorf("failed to create batch: %w", err)
	}

	return s.repo.GetBatchByID(ctx, b.ID)
}

// GetBatch retrieves a batch by ID.
func (s *service) GetBatch(ctx context.Context, id uuid.UUID) (*Batch, error) {
	b, err := s.repo.GetBatchByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get batch: %w", err)
	}
	if b == nil {
		return nil, errors.New("batch not found")
	}
	return b, nil
}

// ListBatches returns paginated batches.
func (s *service) ListBatches(ctx context.Context, stage *string, limit, offset int) ([]Batch, error) {
	batches, err := s.repo.ListBatches(ctx, stage, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list batches: %w", err)
	}
	return batches, nil
}

// AdvanceStage progresses the batch to the next production step and computes history.
func (s *service) AdvanceStage(ctx context.Context, batchID uuid.UUID, actorID uuid.UUID, req AdvanceStageRequest) (*BatchStage, error) {
	if !ValidStages[req.Stage] {
		return nil, fmt.Errorf("invalid stage: %s", req.Stage)
	}

	b, err := s.repo.GetBatchByID(ctx, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify batch: %w", err)
	}
	if b == nil {
		return nil, errors.New("batch not found")
	}

	stage := &BatchStage{
		ID:        uuid.New(),
		BatchID:   batchID,
		Stage:     req.Stage,
		WeightKg:  req.WeightKg,
		Notes:     req.Notes,
		ActorID:   &actorID,
	}

	if err := s.repo.AddStage(ctx, stage); err != nil {
		return nil, fmt.Errorf("failed to advance batch stage: %w", err)
	}

	return stage, nil
}

// GetTrace compiles the complete supply chain journey, calculates weight loss, and validates buyer authorization.
func (s *service) GetTrace(ctx context.Context, callerUserID string, callerRole string, batchID uuid.UUID) (*BatchTrace, error) {
	b, err := s.repo.GetBatchByID(ctx, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify batch: %w", err)
	}
	if b == nil {
		return nil, errors.New("batch not found")
	}

	deliveries, err := s.repo.GetDeliveriesByBatchID(ctx, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to query batch deliveries: %w", err)
	}

	// If caller is buyer, ensure they own a delivery of this batch
	if callerRole == user.RoleBuyer {
		authorized := false
		buyerUserUUID, _ := uuid.Parse(callerUserID)
		buyerProfile, err := s.repo.GetBuyerByUserID(ctx, buyerUserUUID)
		if err == nil && buyerProfile != nil {
			for _, d := range deliveries {
				if d.BuyerID == buyerProfile.ID {
					authorized = true
					break
				}
			}
		}
		if !authorized {
			return nil, errors.New("forbidden: buyers can only trace batches assigned to their deliveries")
		}
	}

	stages, err := s.repo.GetStagesByBatchID(ctx, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stages for batch: %w", err)
	}

	// Compute weight loss percentages across consecutive stages
	var prevWeight *float64
	for i := range stages {
		currWeight := stages[i].WeightKg
		if i > 0 && prevWeight != nil && *prevWeight > 0 && currWeight != nil {
			diff := *prevWeight - *currWeight
			lossPct := math.Round((diff / *prevWeight) * 10000) / 100 // 2 decimal places
			stages[i].WeightLossPercentage = &lossPct
		}
		if currWeight != nil {
			prevWeight = currWeight
		}
	}

	lots, err := s.repo.GetLotsByBatchID(ctx, batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to get linked lots for batch: %w", err)
	}

	var initialKg, currentKg float64
	if len(stages) > 0 {
		if stages[0].WeightKg != nil {
			initialKg = *stages[0].WeightKg
		}
		if stages[len(stages)-1].WeightKg != nil {
			currentKg = *stages[len(stages)-1].WeightKg
		}
	}
	if initialKg == 0 && len(lots) > 0 {
		for _, l := range lots {
			initialKg += l.WeightKg
		}
	}

	trace := &BatchTrace{
		Batch:      *b,
		Stages:     stages,
		Lots:       lots,
		Deliveries: deliveries,
		TotalLots:  len(lots),
		InitialKg:  initialKg,
		CurrentKg:  currentKg,
	}

	return trace, nil
}

// CreateBuyer registers a new buyer client.
func (s *service) CreateBuyer(ctx context.Context, req CreateBuyerRequest) (*Buyer, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("buyer name is required")
	}

	b := &Buyer{
		ID:           uuid.New(),
		Name:         req.Name,
		ContactEmail: req.ContactEmail,
		Country:      req.Country,
		UserID:       req.UserID,
	}

	if err := s.repo.CreateBuyer(ctx, b); err != nil {
		return nil, fmt.Errorf("failed to create buyer: %w", err)
	}

	return s.repo.GetBuyerByID(ctx, b.ID)
}

// ListBuyers returns paginated buyer profiles.
func (s *service) ListBuyers(ctx context.Context, limit, offset int) ([]Buyer, error) {
	buyers, err := s.repo.ListBuyers(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list buyers: %w", err)
	}
	return buyers, nil
}

// CreateDelivery associates a batch delivery with a buyer.
func (s *service) CreateDelivery(ctx context.Context, req CreateDeliveryRequest) (*BatchDelivery, error) {
	if req.BatchID == uuid.Nil {
		return nil, errors.New("batch_id is required")
	}
	if req.BuyerID == uuid.Nil {
		return nil, errors.New("buyer_id is required")
	}

	d := &BatchDelivery{
		ID:          uuid.New(),
		BatchID:     req.BatchID,
		BuyerID:     req.BuyerID,
		DeliveredAt: req.DeliveredAt,
		InvoiceURL:  req.InvoiceURL,
	}

	if err := s.repo.CreateDelivery(ctx, d); err != nil {
		return nil, fmt.Errorf("failed to create batch delivery: %w", err)
	}

	return d, nil
}
