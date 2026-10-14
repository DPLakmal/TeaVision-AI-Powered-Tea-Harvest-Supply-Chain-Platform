package auth

import (
	"time"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/user"
)

// LoginRequest defines credentials for logging in.
type LoginRequest struct {
	Email    string `json:"email" example:"admin@teavision.io"`
	Password string `json:"password" example:"Admin@1234"`
}

// RefreshRequest defines payload for refreshing tokens.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOi..."`
}

// LogoutRequest defines payload for revoking a refresh token.
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOi..."`
}

// AuthResponse defines successful authentication payload.
type AuthResponse struct {
	AccessToken  string            `json:"access_token"`
	RefreshToken string            `json:"refresh_token"`
	TokenType    string            `json:"token_type"`
	ExpiresIn    int64             `json:"expires_in"` // seconds until access token expires
	User         user.UserResponse `json:"user"`
}

// RefreshTokenRecord maps to the refresh_tokens table in PostgreSQL.
type RefreshTokenRecord struct {
	ID        uuid.UUID `db:"id"`
	UserID    uuid.UUID `db:"user_id"`
	TokenHash string    `db:"token_hash"`
	ExpiresAt time.Time `db:"expires_at"`
	Revoked   bool      `db:"revoked"`
	CreatedAt time.Time `db:"created_at"`
}
