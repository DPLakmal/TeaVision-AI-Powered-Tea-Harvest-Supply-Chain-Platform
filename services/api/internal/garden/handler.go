package garden

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/teavision/api/internal/httputil"
	"go.uber.org/zap"
)

// Handler handles HTTP requests for tea gardens.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new tea garden HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// ListGardens godoc
// @Summary List all tea gardens
// @Description Get paginated list of tea gardens (Admin, Supervisor, Factory Manager)
// @Tags gardens
// @Accept json
// @Produce json
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]TeaGarden}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/gardens [get]
func (h *Handler) ListGardens(w http.ResponseWriter, r *http.Request) {
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

	gardens, err := h.service.ListGardens(r.Context(), limit, offset)
	if err != nil {
		h.logger.Error("failed to list tea gardens", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list tea gardens")
		return
	}

	httputil.JSON(w, http.StatusOK, gardens)
}

// GetGarden godoc
// @Summary Get tea garden by ID
// @Description Retrieve single tea garden details
// @Tags gardens
// @Accept json
// @Produce json
// @Param id path string true "Garden UUID"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=TeaGarden}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/gardens/{id} [get]
func (h *Handler) GetGarden(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid garden id")
		return
	}

	g, err := h.service.GetGarden(r.Context(), id)
	if err != nil {
		h.logger.Warn("garden not found", zap.String("id", idStr), zap.Error(err))
		httputil.NotFound(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, g)
}

// CreateGarden godoc
// @Summary Create a tea garden
// @Description Register a new tea garden / estate (Admin only)
// @Tags gardens
// @Accept json
// @Produce json
// @Param request body CreateGardenRequest true "Garden creation payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=TeaGarden}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/gardens [post]
func (h *Handler) CreateGarden(w http.ResponseWriter, r *http.Request) {
	var req CreateGardenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	g, err := h.service.CreateGarden(r.Context(), req)
	if err != nil {
		h.logger.Warn("failed to create tea garden", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, g)
}

// UpdateGarden godoc
// @Summary Update a tea garden
// @Description Update tea garden boundaries and information (Admin only)
// @Tags gardens
// @Accept json
// @Produce json
// @Param id path string true "Garden UUID"
// @Param request body UpdateGardenRequest true "Garden update payload"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=TeaGarden}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/gardens/{id} [put]
func (h *Handler) UpdateGarden(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid garden id")
		return
	}

	var req UpdateGardenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	updated, err := h.service.UpdateGarden(r.Context(), id, req)
	if err != nil {
		h.logger.Warn("failed to update tea garden", zap.String("id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, updated)
}
