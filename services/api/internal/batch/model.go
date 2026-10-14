// Package batch provides models, stage progression, supply chain traceability, and buyer management.
package batch

import (
	"time"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/harvest"
)

// Allowed stages in the tea production life-cycle.
const (
	StageField          = "field"
	StageProcessing     = "processing"
	StageFactory        = "factory"
	StageQualityControl = "quality_control"
	StagePackaging      = "packaging"
	StageShipped        = "shipped"
	StageDelivered      = "delivered"
)

// ValidStages maps all allowed stages.
var ValidStages = map[string]bool{
	StageField:          true,
	StageProcessing:     true,
	StageFactory:        true,
	StageQualityControl: true,
	StagePackaging:      true,
	StageShipped:        true,
	StageDelivered:      true,
}

// Batch represents a processed aggregation of tea harvest lots.
type Batch struct {
	ID           uuid.UUID `db:"id" json:"id"`
	Name         string    `db:"name" json:"name"`
	CurrentStage string    `db:"current_stage" json:"current_stage"`
	CreatedBy    *uuid.UUID `db:"created_by" json:"created_by"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	CreatorEmail *string   `db:"creator_email" json:"creator_email,omitempty"`
}

// BatchStage represents a milestone transition recorded in the batch's processing timeline.
type BatchStage struct {
	ID                   uuid.UUID  `db:"id" json:"id"`
	BatchID              uuid.UUID  `db:"batch_id" json:"batch_id"`
	Stage                string     `db:"stage" json:"stage"`
	WeightKg             *float64   `db:"weight_kg" json:"weight_kg"`
	Notes                *string    `db:"notes" json:"notes"`
	ActorID              *uuid.UUID `db:"actor_id" json:"actor_id"`
	CreatedAt            time.Time  `db:"created_at" json:"created_at"`
	ActorEmail           *string    `db:"actor_email" json:"actor_email,omitempty"`
	WeightLossPercentage *float64   `json:"weight_loss_percentage,omitempty"`
}

// Buyer represents an export or domestic tea customer.
type Buyer struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	Name         string     `db:"name" json:"name"`
	ContactEmail *string    `db:"contact_email" json:"contact_email"`
	Country      *string    `db:"country" json:"country"`
	UserID       *uuid.UUID `db:"user_id" json:"user_id"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
}

// BatchDelivery represents delivery of a batch to a buyer.
type BatchDelivery struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	BatchID     uuid.UUID  `db:"batch_id" json:"batch_id"`
	BuyerID     uuid.UUID  `db:"buyer_id" json:"buyer_id"`
	DeliveredAt *time.Time `db:"delivered_at" json:"delivered_at"`
	InvoiceURL  *string    `db:"invoice_url" json:"invoice_url"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	BuyerName   *string    `db:"buyer_name" json:"buyer_name,omitempty"`
	BuyerEmail  *string    `db:"buyer_email" json:"buyer_email,omitempty"`
	Country     *string    `db:"country" json:"country,omitempty"`
}

// BatchTrace represents the comprehensive farm-to-cup traceability dossier.
type BatchTrace struct {
	Batch        Batch                `json:"batch"`
	Stages       []BatchStage         `json:"stages"`
	Lots         []harvest.HarvestLot `json:"lots"`
	Deliveries   []BatchDelivery      `json:"deliveries"`
	TotalLots    int                  `json:"total_lots"`
	InitialKg    float64              `json:"initial_weight_kg"`
	CurrentKg    float64              `json:"current_weight_kg"`
}

// CreateBatchRequest defines payload to create a new tea batch from harvest lots.
type CreateBatchRequest struct {
	Name            string      `json:"name" example:"Batch-2025-OP1-001"`
	LotIDs          []uuid.UUID `json:"lot_ids"`
	InitialWeightKg *float64    `json:"initial_weight_kg,omitempty" example:"150.50"`
	Notes           *string     `json:"notes,omitempty" example:"Initial batch created from morning harvest"`
}

// AdvanceStageRequest defines payload to transition a batch to the next production stage.
type AdvanceStageRequest struct {
	Stage    string   `json:"stage" example:"processing"`
	WeightKg *float64 `json:"weight_kg,omitempty" example:"142.30"`
	Notes    *string  `json:"notes,omitempty" example:"Withering completed, proceeding to rolling"`
}

// CreateBuyerRequest defines payload to register a buyer profile.
type CreateBuyerRequest struct {
	Name         string     `json:"name" example:"Ceylon Royal Teas Ltd"`
	ContactEmail *string    `json:"contact_email,omitempty" example:"purchasing@ceylonroyal.co.uk"`
	Country      *string    `json:"country,omitempty" example:"United Kingdom"`
	UserID       *uuid.UUID `json:"user_id,omitempty"`
}

// CreateDeliveryRequest defines payload to link a batch delivery with a buyer.
type CreateDeliveryRequest struct {
	BatchID     uuid.UUID  `json:"batch_id"`
	BuyerID     uuid.UUID  `json:"buyer_id"`
	DeliveredAt *time.Time `json:"delivered_at,omitempty"`
	InvoiceURL  *string    `json:"invoice_url,omitempty" example:"https://invoices.teavision.io/inv-1049.pdf"`
}
