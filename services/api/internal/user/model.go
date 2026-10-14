// Package user provides data models, database repositories, business logic, and HTTP handlers for user management.
package user

import (
	"time"

	"github.com/google/uuid"
)

// Role constants defined in the database schema.
const (
	RoleAdmin          = "admin"
	RoleSupervisor     = "supervisor"
	RoleFieldWorker    = "field_worker"
	RoleFactoryManager = "factory_manager"
	RoleBuyer          = "buyer"
)

// ValidRoles contains all allowed role strings.
var ValidRoles = map[string]bool{
	RoleAdmin:          true,
	RoleSupervisor:     true,
	RoleFieldWorker:    true,
	RoleFactoryManager: true,
	RoleBuyer:          true,
}

// User represents a user account record in the database.
type User struct {
	ID           uuid.UUID `db:"id" json:"id"`
	Email        string    `db:"email" json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Role         string    `db:"role" json:"role"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

// UserResponse represents safe user data for API responses without exposing sensitive hashes.
type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ToResponse converts a User model to UserResponse.
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// CreateUserRequest defines the payload for creating a new user.
type CreateUserRequest struct {
	Email    string `json:"email" example:"supervisor@teavision.io"`
	Password string `json:"password" example:"Password@1234"`
	Role     string `json:"role" example:"supervisor"`
}

// UpdateRoleRequest defines the payload for updating a user's role.
type UpdateRoleRequest struct {
	Role string `json:"role" example:"factory_manager"`
}
