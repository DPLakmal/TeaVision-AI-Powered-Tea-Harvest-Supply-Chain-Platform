package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"
)

// RequestLogger returns a middleware that logs incoming HTTP requests using zap.
func RequestLogger(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			defer func() {
				latency := time.Since(start)
				status := ww.Status()
				userID, _ := GetUserID(r.Context())

				fields := []zap.Field{
					zap.String("method", r.Method),
					zap.String("path", r.URL.Path),
					zap.Int("status", status),
					zap.Duration("latency", latency),
					zap.Int("bytes", ww.BytesWritten()),
					zap.String("ip", r.RemoteAddr),
					zap.String("request_id", middleware.GetReqID(r.Context())),
				}

				if userID != "" {
					fields = append(fields, zap.String("user_id", userID))
				}

				switch {
				case status >= 500:
					logger.Error("server error", fields...)
				case status >= 400:
					logger.Warn("client error", fields...)
				default:
					logger.Info("request completed", fields...)
				}
			}()

			next.ServeHTTP(ww, r)
		})
	}
}
