// Package harvest provides models, database operations, business logic, and HTTP handlers for tea harvests and lot grading.
package harvest

import (
	"time"

	"github.com/google/uuid"
)

// Allowed grades
const (
	GradeHigh   = "high"
	GradeMedium = "medium"
	GradeLow    = "low"
)

// ValidGrades maps allowed grade strings.
var ValidGrades = map[string]bool{
	GradeHigh:   true,
	GradeMedium: true,
	GradeLow:    true,
}

// HarvestSession represents a collection session supervised in a tea garden.
type HarvestSession struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	GardenID       uuid.UUID  `db:"garden_id" json:"garden_id"`
	SupervisorID   uuid.UUID  `db:"supervisor_id" json:"supervisor_id"`
	StartedAt      time.Time  `db:"started_at" json:"started_at"`
	CompletedAt    *time.Time `db:"completed_at" json:"completed_at"`
	Notes          *string    `db:"notes" json:"notes"`
	GardenName     *string    `db:"garden_name" json:"garden_name,omitempty"`
	SupervisorName *string    `db:"supervisor_name" json:"supervisor_name,omitempty"`
	TotalWeightKg  *float64   `db:"total_weight_kg" json:"total_weight_kg,omitempty"`
	TotalLots      *int       `db:"total_lots" json:"total_lots,omitempty"`
}

// HarvestLot represents an individual batch/bag of tea leaves weighed for a worker.
type HarvestLot struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	SessionID        uuid.UUID  `db:"session_id" json:"session_id"`
	WorkerID         uuid.UUID  `db:"worker_id" json:"worker_id"`
	WeightKg         float64    `db:"weight_kg" json:"weight_kg"`
	Grade            *string    `db:"grade" json:"grade"`
	Confidence       *float64   `db:"confidence" json:"confidence"`
	ImageURL         *string    `db:"image_url" json:"image_url"`
	GradedAt         *time.Time `db:"graded_at" json:"graded_at"`
	SyncedFromMobile bool       `db:"synced_from_mobile" json:"synced_from_mobile"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	WorkerName       *string    `db:"worker_name" json:"worker_name,omitempty"`
}

// CreateSessionRequest defines payload to start a new harvest session.
type CreateSessionRequest struct {
	GardenID     uuid.UUID  `json:"garden_id" example:"b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"`
	SupervisorID *uuid.UUID `json:"supervisor_id,omitempty"`
	Notes        *string    `json:"notes,omitempty" example:"Morning plucking session - Zone 3"`
}

// CompleteSessionRequest defines payload to mark a harvest session as finished.
type CompleteSessionRequest struct {
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Notes       *string    `json:"notes,omitempty" example:"Finished early due to rain"`
}

// CreateLotRequest defines payload for recording a harvest lot.
type CreateLotRequest struct {
	SessionID        uuid.UUID `json:"session_id" example:"c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"`
	WorkerID         uuid.UUID `json:"worker_id" example:"d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44"`
	WeightKg         float64   `json:"weight_kg" example:"14.85"`
	Grade            *string   `json:"grade,omitempty" example:"high"`
	Confidence       *float64  `json:"confidence,omitempty" example:"0.94"`
	ImageURL         *string   `json:"image_url,omitempty" example:"https://s3.amazonaws.com/teavision/lots/123.jpg"`
	SyncedFromMobile bool      `json:"synced_from_mobile"`
}

// GradeLotRequest defines payload to trigger AI leaf grading or override manually.
type GradeLotRequest struct {
	ImageURL    *string  `json:"image_url,omitempty" example:"https://s3.amazonaws.com/teavision/lots/123.jpg"`
	ImageBase64 *string  `json:"image_base64,omitempty"`
	Grade       *string  `json:"grade,omitempty" example:"high"`
	Confidence  *float64 `json:"confidence,omitempty" example:"0.95"`
}

// MLPredictResponse represents the response from the ML vision service.
type MLPredictResponse struct {
	Grade      string  `json:"grade"`
	Confidence float64 `json:"confidence"`
	Model      string  `json:"model,omitempty"`
}
