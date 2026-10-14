// Package garden provides models, database operations, business logic, and HTTP handlers for tea gardens.
package garden

import (
	"time"

	"github.com/google/uuid"
)

// TeaGarden represents a tea estate or garden.
type TeaGarden struct {
	ID           uuid.UUID `db:"id" json:"id"`
	Name         string    `db:"name" json:"name"`
	LocationLat  *float64  `db:"location_lat" json:"location_lat"`
	LocationLng  *float64  `db:"location_lng" json:"location_lng"`
	AreaHectares *float64  `db:"area_hectares" json:"area_hectares"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

// CreateGardenRequest defines the payload for creating a new tea garden.
type CreateGardenRequest struct {
	Name         string   `json:"name" example:"Nuwara Eliya High Peak Estate"`
	LocationLat  *float64 `json:"location_lat,omitempty" example:"6.9497"`
	LocationLng  *float64 `json:"location_lng,omitempty" example:"80.7891"`
	AreaHectares *float64 `json:"area_hectares,omitempty" example:"120.5"`
}

// UpdateGardenRequest defines the payload for updating an existing tea garden.
type UpdateGardenRequest struct {
	Name         string   `json:"name" example:"Nuwara Eliya High Peak Estate - Block A"`
	LocationLat  *float64 `json:"location_lat,omitempty" example:"6.9497"`
	LocationLng  *float64 `json:"location_lng,omitempty" example:"80.7891"`
	AreaHectares *float64 `json:"area_hectares,omitempty" example:"125.0"`
}
