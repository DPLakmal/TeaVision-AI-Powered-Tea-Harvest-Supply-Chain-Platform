package user

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Service defines business operations for managing users.
type Service interface {
	CreateUser(ctx context.Context, req CreateUserRequest) (*UserResponse, error)
	GetUser(ctx context.Context, id uuid.UUID) (*UserResponse, error)
	UpdateRole(ctx context.Context, id uuid.UUID, role string) (*UserResponse, error)
	ListUsers(ctx context.Context, limit, offset int) ([]UserResponse, error)
}

type service struct {
	repo Repository
}

// NewService creates a new user service.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// CreateUser validates input, hashes password with bcrypt cost 12, and persists the user.
func (s *service) CreateUser(ctx context.Context, req CreateUserRequest) (*UserResponse, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		return nil, errors.New("email is required")
	}
	if len(req.Password) < 8 {
		return nil, errors.New("password must be at least 8 characters long")
	}
	if !ValidRoles[req.Role] {
		return nil, fmt.Errorf("invalid role: %s", req.Role)
	}

	existing, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	u := &User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         req.Role,
	}

	if err := s.repo.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	resp := u.ToResponse()
	return &resp, nil
}

// GetUser finds a user by ID.
func (s *service) GetUser(ctx context.Context, id uuid.UUID) (*UserResponse, error) {
	u, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if u == nil {
		return nil, errors.New("user not found")
	}

	resp := u.ToResponse()
	return &resp, nil
}

// UpdateRole updates a user's role after validating it.
func (s *service) UpdateRole(ctx context.Context, id uuid.UUID, role string) (*UserResponse, error) {
	if !ValidRoles[role] {
		return nil, fmt.Errorf("invalid role: %s", role)
	}

	if err := s.repo.UpdateRole(ctx, id, role); err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	return s.GetUser(ctx, id)
}

// ListUsers returns paginated user responses.
func (s *service) ListUsers(ctx context.Context, limit, offset int) ([]UserResponse, error) {
	users, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	responses := make([]UserResponse, len(users))
	for i, u := range users {
		responses[i] = u.ToResponse()
	}
	return responses, nil
}
