// Package worker provides models, database operations, business logic, and HTTP handlers for field workers.
package worker

import (
	"time"

	"github.com/google/uuid"
)

// Worker represents a field worker employed in the tea estate.
type Worker struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	UserID     uuid.UUID  `db:"user_id" json:"user_id"`
	Name       string     `db:"name" json:"name"`
	GardenID   *uuid.UUID `db:"garden_id" json:"garden_id"`
	RatePerKg  float64    `db:"rate_per_kg" json:"rate_per_kg"`
	JoinedAt   time.Time  `db:"joined_at" json:"joined_at"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	GardenName *string    `db:"garden_name" json:"garden_name,omitempty"`
	UserEmail  *string    `db:"user_email" json:"user_email,omitempty"`
}

// WorkerHarvestLot represents a harvest lot recorded for a worker.
type WorkerHarvestLot struct {
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
}

// CreateWorkerRequest defines payload for registering a worker.
type CreateWorkerRequest struct {
	UserID    uuid.UUID  `json:"user_id" example:"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"`
	Name      string     `json:"name" example:"Sunil Shantha"`
	GardenID  *uuid.UUID `json:"garden_id,omitempty" example:"b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"`
	RatePerKg float64    `json:"rate_per_kg" example:"30.50"`
	JoinedAt  *string    `json:"joined_at,omitempty" example:"2025-01-15"`
}

// UpdateWorkerRequest defines payload for updating worker details.
type UpdateWorkerRequest struct {
	Name      string     `json:"name" example:"Sunil Shantha Silva"`
	GardenID  *uuid.UUID `json:"garden_id,omitempty"`
	RatePerKg float64    `json:"rate_per_kg" example:"32.00"`
}
