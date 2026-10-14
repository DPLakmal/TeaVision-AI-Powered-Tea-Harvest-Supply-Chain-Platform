package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/teavision/api/internal/config"
	"github.com/teavision/api/internal/user"
	"golang.org/x/crypto/bcrypt"
)

// Service defines authentication and token management operations.
type Service interface {
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
	RefreshToken(ctx context.Context, req RefreshRequest) (*AuthResponse, error)
	Logout(ctx context.Context, req LogoutRequest) error
}

type service struct {
	db       *sqlx.DB
	userRepo user.Repository
	cfg      *config.Config
}

// NewService creates a new auth service.
func NewService(db *sqlx.DB, userRepo user.Repository, cfg *config.Config) Service {
	return &service{
		db:       db,
		userRepo: userRepo,
		cfg:      cfg,
	}
}

// Login verifies user credentials and generates access and refresh tokens.
func (s *service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, errors.New("email and password are required")
	}

	u, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup user: %w", err)
	}
	if u == nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	accessToken, err := CreateAccessToken(u.ID.String(), u.Role, s.cfg.JWTSecret, s.cfg.JWTAccessTTL)
	if err != nil {
		return nil, fmt.Errorf("failed to create access token: %w", err)
	}

	refreshToken, claims, err := CreateRefreshToken(u.ID.String(), s.cfg.JWTSecret, s.cfg.JWTRefreshTTL)
	if err != nil {
		return nil, fmt.Errorf("failed to create refresh token: %w", err)
	}

	tokenHash := HashToken(refreshToken)
	now := time.Now().UTC()
	record := RefreshTokenRecord{
		ID:        uuid.New(),
		UserID:    u.ID,
		TokenHash: tokenHash,
		ExpiresAt: claims.ExpiresAt.Time,
		Revoked:   false,
		CreatedAt: now,
	}

	insertQuery := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = s.db.ExecContext(ctx, insertQuery, record.ID, record.UserID, record.TokenHash, record.ExpiresAt, record.Revoked, record.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.cfg.JWTAccessTTL.Seconds()),
		User:         u.ToResponse(),
	}, nil
}

// RefreshToken validates an active refresh token, revokes it, and issues a new pair.
func (s *service) RefreshToken(ctx context.Context, req RefreshRequest) (*AuthResponse, error) {
	if req.RefreshToken == "" {
		return nil, errors.New("refresh token is required")
	}

	claims, err := ParseToken(req.RefreshToken, s.cfg.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	tokenHash := HashToken(req.RefreshToken)
	var record RefreshTokenRecord
	query := `SELECT id, user_id, token_hash, expires_at, revoked, created_at FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`
	err = s.db.GetContext(ctx, &record, query, tokenHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("refresh token not found or already revoked")
		}
		return nil, fmt.Errorf("failed to query refresh token: %w", err)
	}

	if record.Revoked {
		return nil, errors.New("refresh token has been revoked")
	}
	if time.Now().UTC().After(record.ExpiresAt) {
		return nil, errors.New("refresh token has expired")
	}

	// Token rotation: revoke current refresh token
	revokeQuery := `UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`
	if _, err := s.db.ExecContext(ctx, revokeQuery, record.ID); err != nil {
		return nil, fmt.Errorf("failed to revoke old refresh token: %w", err)
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id in token claims: %w", err)
	}

	u, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup user: %w", err)
	}
	if u == nil {
		return nil, errors.New("user no longer exists")
	}

	newAccessToken, err := CreateAccessToken(u.ID.String(), u.Role, s.cfg.JWTSecret, s.cfg.JWTAccessTTL)
	if err != nil {
		return nil, fmt.Errorf("failed to create new access token: %w", err)
	}

	newRefreshToken, newClaims, err := CreateRefreshToken(u.ID.String(), s.cfg.JWTSecret, s.cfg.JWTRefreshTTL)
	if err != nil {
		return nil, fmt.Errorf("failed to create new refresh token: %w", err)
	}

	newTokenHash := HashToken(newRefreshToken)
	newRecord := RefreshTokenRecord{
		ID:        uuid.New(),
		UserID:    u.ID,
		TokenHash: newTokenHash,
		ExpiresAt: newClaims.ExpiresAt.Time,
		Revoked:   false,
		CreatedAt: time.Now().UTC(),
	}

	insertQuery := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	if _, err := s.db.ExecContext(ctx, insertQuery, newRecord.ID, newRecord.UserID, newRecord.TokenHash, newRecord.ExpiresAt, newRecord.Revoked, newRecord.CreatedAt); err != nil {
		return nil, fmt.Errorf("failed to save new refresh token: %w", err)
	}

	return &AuthResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.cfg.JWTAccessTTL.Seconds()),
		User:         u.ToResponse(),
	}, nil
}

// Logout revokes the given refresh token.
func (s *service) Logout(ctx context.Context, req LogoutRequest) error {
	if req.RefreshToken == "" {
		return errors.New("refresh token is required")
	}

	tokenHash := HashToken(req.RefreshToken)
	query := `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`
	_, err := s.db.ExecContext(ctx, query, tokenHash)
	if err != nil {
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}

	return nil
}
