package user

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/teavision/api/internal/httputil"
	"go.uber.org/zap"
)

// Handler handles HTTP requests for user management.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new user HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// ListUsers godoc
// @Summary List all users
// @Description Get paginated list of users (Admin only)
// @Tags users
// @Accept json
// @Produce json
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]UserResponse}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit := 20
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	users, err := h.service.ListUsers(r.Context(), limit, offset)
	if err != nil {
		h.logger.Error("failed to list users", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list users")
		return
	}

	httputil.JSON(w, http.StatusOK, users)
}

// CreateUser godoc
// @Summary Create a new user
// @Description Create a user account with assigned role (Admin only)
// @Tags users
// @Accept json
// @Produce json
// @Param request body CreateUserRequest true "User creation payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=UserResponse}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/users [post]
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	created, err := h.service.CreateUser(r.Context(), req)
	if err != nil {
		h.logger.Warn("failed to create user", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, created)
}

// UpdateRole godoc
// @Summary Update user role
// @Description Modify the system role of a user (Admin only)
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User UUID"
// @Param request body UpdateRoleRequest true "Role update payload"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=UserResponse}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/users/{id}/role [put]
func (h *Handler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid user id")
		return
	}

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	updated, err := h.service.UpdateRole(r.Context(), id, req.Role)
	if err != nil {
		h.logger.Warn("failed to update user role", zap.String("id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, updated)
}
