package auth

import (
	"encoding/json"
	"net/http"

	"github.com/teavision/api/internal/httputil"
	"go.uber.org/zap"
)

// Handler handles HTTP requests for authentication.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new auth HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// Login godoc
// @Summary User login
// @Description Authenticates a user with email and password, returning JWT access and refresh tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "User credentials"
// @Success 200 {object} httputil.Response{data=AuthResponse}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/auth/login [post]
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	resp, err := h.service.Login(r.Context(), req)
	if err != nil {
		h.logger.Warn("login failed", zap.String("email", req.Email), zap.Error(err))
		httputil.Unauthorized(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// Refresh godoc
// @Summary Refresh access token
// @Description Issues a new access token and rotated refresh token using a valid refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "Refresh token payload"
// @Success 200 {object} httputil.Response{data=AuthResponse}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/auth/refresh [post]
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	resp, err := h.service.RefreshToken(r.Context(), req)
	if err != nil {
		h.logger.Warn("token refresh failed", zap.Error(err))
		httputil.Unauthorized(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// Logout godoc
// @Summary User logout
// @Description Revokes the specified refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LogoutRequest true "Refresh token to revoke"
// @Success 200 {object} httputil.Response{data=map[string]string}
// @Failure 400 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/auth/logout [post]
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	if err := h.service.Logout(r.Context(), req); err != nil {
		h.logger.Error("logout error", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to logout")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{
		"message": "successfully logged out",
	})
}
