package middleware

import (
	"net/http"

	"github.com/teavision/api/internal/httputil"
)

// RequireRole returns a middleware verifying that the authenticated user possesses one of the allowed roles.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowedRoles := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowedRoles[role] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := GetUserRole(r.Context())
			if !ok {
				httputil.Forbidden(w, "access denied: role not present")
				return
			}

			if _, allowed := allowedRoles[userRole]; !allowed {
				httputil.Forbidden(w, "access denied: insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
