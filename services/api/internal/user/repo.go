package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository defines database operations for users.
type Repository interface {
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	Create(ctx context.Context, user *User) error
	UpdateRole(ctx context.Context, id uuid.UUID, role string) error
	List(ctx context.Context, limit, offset int) ([]User, error)
}

type repo struct {
	db *sqlx.DB
}

// NewRepository creates a new user repository.
func NewRepository(db *sqlx.DB) Repository {
	return &repo{db: db}
}

// FindByEmail retrieves a user by their unique email address.
func (r *repo) FindByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	query := `SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &u, query, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}
	return &u, nil
}

// FindByID retrieves a user by their UUID.
func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var u User
	query := `SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &u, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query user by id: %w", err)
	}
	return &u, nil
}

// Create inserts a new user record into the database.
func (r *repo) Create(ctx context.Context, u *User) error {
	query := `
		INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	now := time.Now().UTC()
	u.CreatedAt = now
	u.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, query, u.ID, u.Email, u.PasswordHash, u.Role, u.CreatedAt, u.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert user: %w", err)
	}
	return nil
}

// UpdateRole updates the role and updated_at timestamp for a user.
func (r *repo) UpdateRole(ctx context.Context, id uuid.UUID, role string) error {
	query := `UPDATE users SET role = $1, updated_at = $2 WHERE id = $3`
	res, err := r.db.ExecContext(ctx, query, role, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to read affected rows: %w", err)
	}
	if rows == 0 {
		return errors.New("user not found")
	}
	return nil
}

// List retrieves paginated users ordered by created_at descending.
func (r *repo) List(ctx context.Context, limit, offset int) ([]User, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var users []User
	query := `SELECT id, email, password_hash, role, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	err := r.db.SelectContext(ctx, &users, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return users, nil
}
