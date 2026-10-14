package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/teavision/api/internal/httputil"
	"go.uber.org/zap"
)

// Recoverer returns a middleware that recovers from panics, logs stack traces, and returns a 500 error.
func Recoverer(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rvr := recover(); rvr != nil {
					if rvr == http.ErrAbortHandler {
						panic(rvr)
					}

					stack := string(debug.Stack())
					logger.Error("panic recovered",
						zap.Any("error", rvr),
						zap.String("stack", stack),
						zap.String("method", r.Method),
						zap.String("path", r.URL.Path),
					)

					httputil.Error(w, http.StatusInternalServerError, fmt.Sprintf("internal server error: %v", rvr))
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
