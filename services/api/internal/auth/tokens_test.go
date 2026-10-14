package auth

import (
	"testing"
	"time"
)

func TestCreateAndParseAccessToken(t *testing.T) {
	secret := "test-secret-key-at-least-32-chars-long"
	userID := "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
	role := "admin"
	ttl := 15 * time.Minute

	tokenStr, err := CreateAccessToken(userID, role, secret, ttl)
	if err != nil {
		t.Fatalf("failed to create access token: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("expected non-empty token string")
	}

	claims, err := ParseToken(tokenStr, secret)
	if err != nil {
		t.Fatalf("failed to parse token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("expected UserID %s, got %s", userID, claims.UserID)
	}
	if claims.Role != role {
		t.Errorf("expected Role %s, got %s", role, claims.Role)
	}
}

func TestParseTokenInvalidSecret(t *testing.T) {
	secret := "test-secret-key-at-least-32-chars-long"
	wrongSecret := "wrong-secret-key-at-least-32-chars-long"
	userID := "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
	role := "supervisor"

	tokenStr, err := CreateAccessToken(userID, role, secret, 10*time.Minute)
	if err != nil {
		t.Fatalf("failed to create access token: %v", err)
	}

	_, err = ParseToken(tokenStr, wrongSecret)
	if err == nil {
		t.Fatal("expected error parsing token with wrong secret, got nil")
	}
}

func TestHashToken(t *testing.T) {
	token := "some-random-sample-token"
	h1 := HashToken(token)
	h2 := HashToken(token)

	if h1 != h2 {
		t.Errorf("hash should be deterministic: %s != %s", h1, h2)
	}
	if len(h1) != 64 { // SHA-256 hex is 64 characters
		t.Errorf("expected 64 characters hex string, got %d", len(h1))
	}
}
