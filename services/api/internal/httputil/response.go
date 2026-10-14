// Package httputil provides consistent HTTP response formatting and helpers.
package httputil

import (
	"encoding/json"
	"net/http"

	"go.uber.org/zap"
)

// Response defines the standard envelope for all API responses.
type Response struct {
	Data  any     `json:"data"`
	Error *string `json:"error"`
}

// JSON sends a JSON response with status code and data envelope.
func JSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	resp := Response{
		Data:  data,
		Error: nil,
	}

	_ = json.NewEncoder(w).Encode(resp)
}

// Error sends a JSON error response with status code and error message.
func Error(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	resp := Response{
		Data:  nil,
		Error: &message,
	}

	_ = json.NewEncoder(w).Encode(resp)
}

// BadRequest sends a 400 Bad Request error.
func BadRequest(w http.ResponseWriter, message string) {
	Error(w, http.StatusBadRequest, message)
}

// Unauthorized sends a 401 Unauthorized error.
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, message)
}

// Forbidden sends a 403 Forbidden error.
func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, message)
}

// NotFound sends a 404 Not Found error.
func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, message)
}

// InternalServerError logs the error and sends a 500 Internal Server Error.
func InternalServerError(w http.ResponseWriter, logger *zap.Logger, err error, msg string) {
	if logger != nil && err != nil {
		logger.Error(msg, zap.Error(err))
	}
	Error(w, http.StatusInternalServerError, "an internal error occurred")
}
