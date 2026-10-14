package harvest

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository defines database operations for harvest sessions and lots.
type Repository interface {
	CreateSession(ctx context.Context, session *HarvestSession) error
	GetSessionByID(ctx context.Context, id uuid.UUID) (*HarvestSession, error)
	ListSessions(ctx context.Context, gardenID *uuid.UUID, supervisorID *uuid.UUID, limit, offset int) ([]HarvestSession, error)
	CompleteSession(ctx context.Context, id uuid.UUID, completedAt time.Time, notes *string) error

	CreateLot(ctx context.Context, lot *HarvestLot) error
	GetLotByID(ctx context.Context, id uuid.UUID) (*HarvestLot, error)
	ListLotsBySession(ctx context.Context, sessionID uuid.UUID) ([]HarvestLot, error)
	UpdateLotGrade(ctx context.Context, id uuid.UUID, grade string, confidence float64, gradedAt time.Time, imageURL *string) error
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new harvest repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// CreateSession inserts a new harvest session.
func (r *repo) CreateSession(ctx context.Context, s *HarvestSession) error {
	query := `
		INSERT INTO harvest.sessions (id, garden_id, supervisor_id, started_at, completed_at, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.StartedAt.IsZero() {
		s.StartedAt = time.Now().UTC()
	}

	_, err := r.db.ExecContext(ctx, query, s.ID, s.GardenID, s.SupervisorID, s.StartedAt, s.CompletedAt, s.Notes)
	if err != nil {
		return fmt.Errorf("failed to insert harvest session: %w", err)
	}
	return nil
}

// GetSessionByID retrieves a single harvest session with summary statistics.
func (r *repo) GetSessionByID(ctx context.Context, id uuid.UUID) (*HarvestSession, error) {
	var s HarvestSession
	query := `
		SELECT 
			hs.id, hs.garden_id, hs.supervisor_id, hs.started_at, hs.completed_at, hs.notes,
			tg.name AS garden_name,
			u.email AS supervisor_name,
			COALESCE(SUM(hl.weight_kg), 0) AS total_weight_kg,
			COUNT(hl.id)::int AS total_lots
		FROM harvest.sessions hs
		JOIN tea_gardens tg ON hs.garden_id = tg.id
		JOIN users u ON hs.supervisor_id = u.id
		LEFT JOIN harvest.lots hl ON hl.session_id = hs.id
		WHERE hs.id = $1
		GROUP BY hs.id, hs.garden_id, hs.supervisor_id, hs.started_at, hs.completed_at, hs.notes, tg.name, u.email
		LIMIT 1
	`
	err := r.db.GetContext(ctx, &s, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query harvest session: %w", err)
	}
	return &s, nil
}

// ListSessions retrieves paginated harvest sessions with optional filters.
func (r *repo) ListSessions(ctx context.Context, gardenID *uuid.UUID, supervisorID *uuid.UUID, limit, offset int) ([]HarvestSession, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			hs.id, hs.garden_id, hs.supervisor_id, hs.started_at, hs.completed_at, hs.notes,
			tg.name AS garden_name,
			u.email AS supervisor_name,
			COALESCE(SUM(hl.weight_kg), 0) AS total_weight_kg,
			COUNT(hl.id)::int AS total_lots
		FROM harvest.sessions hs
		JOIN tea_gardens tg ON hs.garden_id = tg.id
		JOIN users u ON hs.supervisor_id = u.id
		LEFT JOIN harvest.lots hl ON hl.session_id = hs.id
		WHERE ($1::uuid IS NULL OR hs.garden_id = $1)
		  AND ($2::uuid IS NULL OR hs.supervisor_id = $2)
		GROUP BY hs.id, hs.garden_id, hs.supervisor_id, hs.started_at, hs.completed_at, hs.notes, tg.name, u.email
		ORDER BY hs.started_at DESC
		LIMIT $3 OFFSET $4
	`
	var sessions []HarvestSession
	err := r.db.SelectContext(ctx, &sessions, query, gardenID, supervisorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list harvest sessions: %w", err)
	}
	return sessions, nil
}

// CompleteSession updates a session with its completion timestamp and notes.
func (r *repo) CompleteSession(ctx context.Context, id uuid.UUID, completedAt time.Time, notes *string) error {
	query := `
		UPDATE harvest.sessions
		SET completed_at = $1,
		    notes = COALESCE($2, notes)
		WHERE id = $3
	`
	res, err := r.db.ExecContext(ctx, query, completedAt, notes, id)
	if err != nil {
		return fmt.Errorf("failed to complete harvest session: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to read affected rows: %w", err)
	}
	if rows == 0 {
		return errors.New("harvest session not found")
	}
	return nil
}

// CreateLot inserts a new harvest lot record.
func (r *repo) CreateLot(ctx context.Context, l *HarvestLot) error {
	query := `
		INSERT INTO harvest.lots (
			id, session_id, worker_id, weight_kg, grade, confidence, image_url, graded_at, synced_from_mobile, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	if l.CreatedAt.IsZero() {
		l.CreatedAt = time.Now().UTC()
	}

	_, err := r.db.ExecContext(ctx, query,
		l.ID, l.SessionID, l.WorkerID, l.WeightKg, l.Grade, l.Confidence, l.ImageURL, l.GradedAt, l.SyncedFromMobile, l.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert harvest lot: %w", err)
	}
	return nil
}

// GetLotByID retrieves a lot by its ID.
func (r *repo) GetLotByID(ctx context.Context, id uuid.UUID) (*HarvestLot, error) {
	var l HarvestLot
	query := `
		SELECT 
			hl.id, hl.session_id, hl.worker_id, hl.weight_kg, hl.grade, hl.confidence, 
			hl.image_url, hl.graded_at, hl.synced_from_mobile, hl.created_at,
			w.name AS worker_name
		FROM harvest.lots hl
		JOIN workers w ON hl.worker_id = w.id
		WHERE hl.id = $1 LIMIT 1
	`
	err := r.db.GetContext(ctx, &l, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query lot by id: %w", err)
	}
	return &l, nil
}

// ListLotsBySession retrieves all lots recorded in a given session.
func (r *repo) ListLotsBySession(ctx context.Context, sessionID uuid.UUID) ([]HarvestLot, error) {
	var lots []HarvestLot
	query := `
		SELECT 
			hl.id, hl.session_id, hl.worker_id, hl.weight_kg, hl.grade, hl.confidence, 
			hl.image_url, hl.graded_at, hl.synced_from_mobile, hl.created_at,
			w.name AS worker_name
		FROM harvest.lots hl
		JOIN workers w ON hl.worker_id = w.id
		WHERE hl.session_id = $1
		ORDER BY hl.created_at ASC
	`
	err := r.db.SelectContext(ctx, &lots, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to list lots by session: %w", err)
	}
	return lots, nil
}

// UpdateLotGrade updates the AI grade, confidence score, and graded timestamp.
func (r *repo) UpdateLotGrade(ctx context.Context, id uuid.UUID, grade string, confidence float64, gradedAt time.Time, imageURL *string) error {
	query := `
		UPDATE harvest.lots
		SET grade = $1, confidence = $2, graded_at = $3,
		    image_url = COALESCE($4, image_url)
		WHERE id = $5
	`
	res, err := r.db.ExecContext(ctx, query, grade, confidence, gradedAt, imageURL, id)
	if err != nil {
		return fmt.Errorf("failed to update lot grade: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check affected rows: %w", err)
	}
	if rows == 0 {
		return errors.New("harvest lot not found")
	}
	return nil
}
