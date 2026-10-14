package harvest

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/config"
	"go.uber.org/zap"
)

// Service defines business operations for harvest sessions and lots.
type Service interface {
	CreateSession(ctx context.Context, supervisorID uuid.UUID, req CreateSessionRequest) (*HarvestSession, error)
	GetSession(ctx context.Context, id uuid.UUID) (*HarvestSession, error)
	ListSessions(ctx context.Context, gardenID *uuid.UUID, supervisorID *uuid.UUID, limit, offset int) ([]HarvestSession, error)
	CompleteSession(ctx context.Context, id uuid.UUID, notes *string) (*HarvestSession, error)

	CreateLot(ctx context.Context, req CreateLotRequest) (*HarvestLot, error)
	GetLot(ctx context.Context, id uuid.UUID) (*HarvestLot, error)
	ListSessionLots(ctx context.Context, sessionID uuid.UUID) ([]HarvestLot, error)
	GradeLot(ctx context.Context, id uuid.UUID, req GradeLotRequest) (*HarvestLot, error)
}

type service struct {
	repo       Repository
	cfg        *config.Config
	logger     *zap.Logger
	httpClient *http.Client
}

// NewService creates a new harvest service.
func NewService(repo Repository, cfg *config.Config, logger *zap.Logger) Service {
	return &service{
		repo:   repo,
		cfg:    cfg,
		logger: logger,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// CreateSession initiates a new tea collection session.
func (s *service) CreateSession(ctx context.Context, supervisorID uuid.UUID, req CreateSessionRequest) (*HarvestSession, error) {
	if req.GardenID == uuid.Nil {
		return nil, errors.New("garden_id is required")
	}

	supID := supervisorID
	if req.SupervisorID != nil && *req.SupervisorID != uuid.Nil {
		supID = *req.SupervisorID
	}

	session := &HarvestSession{
		ID:           uuid.New(),
		GardenID:     req.GardenID,
		SupervisorID: supID,
		StartedAt:    time.Now().UTC(),
		Notes:        req.Notes,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return s.repo.GetSessionByID(ctx, session.ID)
}

// GetSession retrieves session details by ID.
func (s *service) GetSession(ctx context.Context, id uuid.UUID) (*HarvestSession, error) {
	session, err := s.repo.GetSessionByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get harvest session: %w", err)
	}
	if session == nil {
		return nil, errors.New("harvest session not found")
	}
	return session, nil
}

// ListSessions returns filtered and paginated harvest sessions.
func (s *service) ListSessions(ctx context.Context, gardenID *uuid.UUID, supervisorID *uuid.UUID, limit, offset int) ([]HarvestSession, error) {
	sessions, err := s.repo.ListSessions(ctx, gardenID, supervisorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list harvest sessions: %w", err)
	}
	return sessions, nil
}

// CompleteSession finishes an active harvesting session.
func (s *service) CompleteSession(ctx context.Context, id uuid.UUID, notes *string) (*HarvestSession, error) {
	now := time.Now().UTC()
	if err := s.repo.CompleteSession(ctx, id, now, notes); err != nil {
		return nil, fmt.Errorf("failed to complete session: %w", err)
	}
	return s.repo.GetSessionByID(ctx, id)
}

// CreateLot records a weighed harvest lot for a worker.
func (s *service) CreateLot(ctx context.Context, req CreateLotRequest) (*HarvestLot, error) {
	if req.SessionID == uuid.Nil {
		return nil, errors.New("session_id is required")
	}
	if req.WorkerID == uuid.Nil {
		return nil, errors.New("worker_id is required")
	}
	if req.WeightKg <= 0 {
		return nil, errors.New("weight_kg must be greater than zero")
	}

	var gradedAt *time.Time
	if req.Grade != nil && *req.Grade != "" {
		if !ValidGrades[*req.Grade] {
			return nil, fmt.Errorf("invalid grade: %s (must be high, medium, or low)", *req.Grade)
		}
		now := time.Now().UTC()
		gradedAt = &now
	}

	lot := &HarvestLot{
		ID:               uuid.New(),
		SessionID:        req.SessionID,
		WorkerID:         req.WorkerID,
		WeightKg:         req.WeightKg,
		Grade:            req.Grade,
		Confidence:       req.Confidence,
		ImageURL:         req.ImageURL,
		GradedAt:         gradedAt,
		SyncedFromMobile: req.SyncedFromMobile,
		CreatedAt:        time.Now().UTC(),
	}

	if err := s.repo.CreateLot(ctx, lot); err != nil {
		return nil, fmt.Errorf("failed to create harvest lot: %w", err)
	}

	return s.repo.GetLotByID(ctx, lot.ID)
}

// GetLot retrieves a single lot by its ID.
func (s *service) GetLot(ctx context.Context, id uuid.UUID) (*HarvestLot, error) {
	lot, err := s.repo.GetLotByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get lot: %w", err)
	}
	if lot == nil {
		return nil, errors.New("harvest lot not found")
	}
	return lot, nil
}

// ListSessionLots retrieves all lots associated with a session.
func (s *service) ListSessionLots(ctx context.Context, sessionID uuid.UUID) ([]HarvestLot, error) {
	lots, err := s.repo.ListLotsBySession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to list session lots: %w", err)
	}
	return lots, nil
}

// GradeLot invokes the ML vision service for automated leaf quality grading or applies manual override.
func (s *service) GradeLot(ctx context.Context, id uuid.UUID, req GradeLotRequest) (*HarvestLot, error) {
	existing, err := s.repo.GetLotByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup lot: %w", err)
	}
	if existing == nil {
		return nil, errors.New("harvest lot not found")
	}

	var finalGrade string
	var finalConfidence float64
	var imageURL *string = req.ImageURL
	if imageURL == nil {
		imageURL = existing.ImageURL
	}

	mlSuccess := false

	// Attempt ML grading if MLServiceURL is set and an image is present
	if s.cfg.MLServiceURL != "" && (req.ImageURL != nil || req.ImageBase64 != nil || existing.ImageURL != nil) {
		reqPayload := map[string]interface{}{}
		if req.ImageURL != nil {
			reqPayload["image_url"] = *req.ImageURL
		} else if existing.ImageURL != nil {
			reqPayload["image_url"] = *existing.ImageURL
		}
		if req.ImageBase64 != nil {
			reqPayload["image_base64"] = *req.ImageBase64
		}

		bodyBytes, err := json.Marshal(reqPayload)
		if err == nil {
			url := strings.TrimRight(s.cfg.MLServiceURL, "/") + "/predict"
			httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(bodyBytes))
			if err == nil {
				httpReq.Header.Set("Content-Type", "application/json")
				resp, err := s.httpClient.Do(httpReq)
				if err == nil && resp.StatusCode == http.StatusOK {
					defer resp.Body.Close()
					var mlResp MLPredictResponse
					if err := json.NewDecoder(resp.Body).Decode(&mlResp); err == nil && ValidGrades[mlResp.Grade] {
						finalGrade = mlResp.Grade
						finalConfidence = mlResp.Confidence
						mlSuccess = true
						s.logger.Info("ml grading succeeded",
							zap.String("lot_id", id.String()),
							zap.String("grade", finalGrade),
							zap.Float64("confidence", finalConfidence),
						)
					}
				} else if err != nil {
					s.logger.Warn("ml grading service call failed", zap.Error(err))
				}
			}
		}
	}

	// Fallback or explicit manual override
	if !mlSuccess {
		if req.Grade != nil && ValidGrades[*req.Grade] {
			finalGrade = *req.Grade
			if req.Confidence != nil {
				finalConfidence = *req.Confidence
			} else {
				finalConfidence = 1.0 // Manual supervisor grade is 100% confident
			}
			s.logger.Info("applied manual grade override",
				zap.String("lot_id", id.String()),
				zap.String("grade", finalGrade),
			)
		} else {
			return nil, errors.New("ml grading unavailable and valid manual grade not provided (must be high, medium, or low)")
		}
	}

	now := time.Now().UTC()
	if err := s.repo.UpdateLotGrade(ctx, id, finalGrade, finalConfidence, now, imageURL); err != nil {
		return nil, fmt.Errorf("failed to persist lot grade: %w", err)
	}

	return s.repo.GetLotByID(ctx, id)
}
