package worker

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/teavision/api/internal/httputil"
	"github.com/teavision/api/internal/middleware"
	"go.uber.org/zap"
)

// Handler handles HTTP requests for worker operations.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new worker HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// ListWorkers godoc
// @Summary List workers
// @Description Get paginated list of workers optionally filtered by garden_id (Admin, Supervisor)
// @Tags workers
// @Accept json
// @Produce json
// @Param garden_id query string false "Filter by Garden UUID"
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]Worker}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/workers [get]
func (h *Handler) ListWorkers(w http.ResponseWriter, r *http.Request) {
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

	var gardenID *uuid.UUID
	if gidStr := r.URL.Query().Get("garden_id"); gidStr != "" {
		if gid, err := uuid.Parse(gidStr); err == nil {
			gardenID = &gid
		}
	}

	workers, err := h.service.ListWorkers(r.Context(), gardenID, limit, offset)
	if err != nil {
		h.logger.Error("failed to list workers", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list workers")
		return
	}

	httputil.JSON(w, http.StatusOK, workers)
}

// GetWorker godoc
// @Summary Get worker by ID
// @Description Retrieve single worker profile details
// @Tags workers
// @Accept json
// @Produce json
// @Param id path string true "Worker UUID"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=Worker}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/workers/{id} [get]
func (h *Handler) GetWorker(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid worker id")
		return
	}

	worker, err := h.service.GetWorker(r.Context(), id)
	if err != nil {
		h.logger.Warn("worker not found", zap.String("id", idStr), zap.Error(err))
		httputil.NotFound(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, worker)
}

// CreateWorker godoc
// @Summary Create a worker profile
// @Description Link a user account to a field worker profile (Admin, Supervisor)
// @Tags workers
// @Accept json
// @Produce json
// @Param request body CreateWorkerRequest true "Worker creation payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=Worker}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/workers [post]
func (h *Handler) CreateWorker(w http.ResponseWriter, r *http.Request) {
	var req CreateWorkerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	created, err := h.service.CreateWorker(r.Context(), req)
	if err != nil {
		h.logger.Warn("failed to create worker", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, created)
}

// UpdateWorker godoc
// @Summary Update worker details
// @Description Update worker name, rate_per_kg, or assigned garden (Admin, Supervisor)
// @Tags workers
// @Accept json
// @Produce json
// @Param id path string true "Worker UUID"
// @Param request body UpdateWorkerRequest true "Worker update payload"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=Worker}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/workers/{id} [put]
func (h *Handler) UpdateWorker(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid worker id")
		return
	}

	var req UpdateWorkerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	updated, err := h.service.UpdateWorker(r.Context(), id, req)
	if err != nil {
		h.logger.Warn("failed to update worker", zap.String("id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, updated)
}

// GetWorkerHarvests godoc
// @Summary Get worker harvests
// @Description Retrieve harvest lots recorded for a specific worker (Admin, Supervisor, Field Worker own)
// @Tags workers
// @Accept json
// @Produce json
// @Param id path string true "Worker UUID"
// @Param limit query int false "Number of records to return (default 50)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]WorkerHarvestLot}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/workers/{id}/harvests [get]
func (h *Handler) GetWorkerHarvests(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	workerID, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid worker id")
		return
	}

	callerUserID, _ := middleware.GetUserID(r.Context())
	callerRole, _ := middleware.GetUserRole(r.Context())

	limit := 50
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

	harvests, err := h.service.GetWorkerHarvests(r.Context(), callerUserID, callerRole, workerID, limit, offset)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			httputil.Forbidden(w, err.Error())
			return
		}
		h.logger.Warn("failed to get worker harvests", zap.String("worker_id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, harvests)
}
