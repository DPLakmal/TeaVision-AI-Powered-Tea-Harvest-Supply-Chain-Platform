package garden

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository defines database operations for tea gardens.
type Repository interface {
	Create(ctx context.Context, g *TeaGarden) error
	FindByID(ctx context.Context, id uuid.UUID) (*TeaGarden, error)
	Update(ctx context.Context, g *TeaGarden) error
	List(ctx context.Context, limit, offset int) ([]TeaGarden, error)
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new tea garden repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// Create inserts a new tea garden record.
func (r *repo) Create(ctx context.Context, g *TeaGarden) error {
	query := `
		INSERT INTO tea_gardens (id, name, location_lat, location_lng, area_hectares, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	g.CreatedAt = time.Now().UTC()

	_, err := r.db.ExecContext(ctx, query, g.ID, g.Name, g.LocationLat, g.LocationLng, g.AreaHectares, g.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert tea garden: %w", err)
	}
	return nil
}

// FindByID retrieves a tea garden by its ID.
func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*TeaGarden, error) {
	var g TeaGarden
	query := `SELECT id, name, location_lat, location_lng, area_hectares, created_at FROM tea_gardens WHERE id = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &g, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query tea garden: %w", err)
	}
	return &g, nil
}

// Update updates an existing tea garden.
func (r *repo) Update(ctx context.Context, g *TeaGarden) error {
	query := `
		UPDATE tea_gardens
		SET name = $1, location_lat = $2, location_lng = $3, area_hectares = $4
		WHERE id = $5
	`
	res, err := r.db.ExecContext(ctx, query, g.Name, g.LocationLat, g.LocationLng, g.AreaHectares, g.ID)
	if err != nil {
		return fmt.Errorf("failed to update tea garden: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check affected rows: %w", err)
	}
	if rows == 0 {
		return errors.New("tea garden not found")
	}
	return nil
}

// List returns paginated tea gardens ordered by name.
func (r *repo) List(ctx context.Context, limit, offset int) ([]TeaGarden, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var gardens []TeaGarden
	query := `SELECT id, name, location_lat, location_lng, area_hectares, created_at FROM tea_gardens ORDER BY name ASC LIMIT $1 OFFSET $2`
	err := r.db.SelectContext(ctx, &gardens, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list tea gardens: %w", err)
	}
	return gardens, nil
}
