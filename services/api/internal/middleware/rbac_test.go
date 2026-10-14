package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireRole(t *testing.T) {
	tests := []struct {
		name         string
		userRole     string
		allowedRoles []string
		expectedCode int
	}{
		{
			name:         "allowed single role",
			userRole:     "admin",
			allowedRoles: []string{"admin"},
			expectedCode: http.StatusOK,
		},
		{
			name:         "allowed multi role",
			userRole:     "supervisor",
			allowedRoles: []string{"admin", "supervisor"},
			expectedCode: http.StatusOK,
		},
		{
			name:         "denied role",
			userRole:     "field_worker",
			allowedRoles: []string{"admin", "supervisor"},
			expectedCode: http.StatusForbidden,
		},
		{
			name:         "empty context role",
			userRole:     "",
			allowedRoles: []string{"admin"},
			expectedCode: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := RequireRole(tt.allowedRoles...)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.userRole != "" {
				ctx := context.WithValue(req.Context(), RoleKey, tt.userRole)
				req = req.WithContext(ctx)
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tt.expectedCode {
				t.Errorf("expected status %d, got %d", tt.expectedCode, rr.Code)
			}
		})
	}
}
