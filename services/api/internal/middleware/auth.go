// Package middleware provides HTTP middlewares for authentication, RBAC, logging, and recovery.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/teavision/api/internal/auth"
	"github.com/teavision/api/internal/httputil"
)

type contextKey string

const (
	// UserIDKey is the context key for the authenticated user ID.
	UserIDKey contextKey = "user_id"
	// RoleKey is the context key for the authenticated user role.
	RoleKey contextKey = "user_role"
)

// Auth returns a middleware that validates Bearer JWT tokens.
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httputil.Unauthorized(w, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				httputil.Unauthorized(w, "invalid authorization header format")
				return
			}

			tokenString := parts[1]
			claims, err := auth.ParseToken(tokenString, secret)
			if err != nil {
				httputil.Unauthorized(w, "invalid or expired token")
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID retrieves the authenticated user ID from context.
func GetUserID(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(UserIDKey).(string)
	return val, ok && val != ""
}

// GetUserRole retrieves the authenticated user role from context.
func GetUserRole(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(RoleKey).(string)
	return val, ok && val != ""
}
