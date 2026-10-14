package batch

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

// Handler handles HTTP requests for batch tracking, traceability, and buyers.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new batch HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// CreateBatch godoc
// @Summary Create a new tea batch
// @Description Aggregate harvest lots into a tracked production batch (Admin, Supervisor)
// @Tags batches
// @Accept json
// @Produce json
// @Param request body CreateBatchRequest true "Batch creation payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=Batch}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/batches [post]
func (h *Handler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	var req CreateBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	userIDStr, _ := middleware.GetUserID(r.Context())
	createdBy, _ := uuid.Parse(userIDStr)

	batch, err := h.service.CreateBatch(r.Context(), createdBy, req)
	if err != nil {
		h.logger.Warn("failed to create batch", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, batch)
}

// ListBatches godoc
// @Summary List tea batches
// @Description Retrieve paginated tea batches optionally filtered by production stage (Admin, Factory Manager)
// @Tags batches
// @Accept json
// @Produce json
// @Param stage query string false "Filter by Stage (e.g. processing, factory, delivered)"
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]Batch}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/batches [get]
func (h *Handler) ListBatches(w http.ResponseWriter, r *http.Request) {
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

	var stageFilter *string
	if s := r.URL.Query().Get("stage"); s != "" {
		stageFilter = &s
	}

	batches, err := h.service.ListBatches(r.Context(), stageFilter, limit, offset)
	if err != nil {
		h.logger.Error("failed to list batches", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list batches")
		return
	}

	httputil.JSON(w, http.StatusOK, batches)
}

// GetTrace godoc
// @Summary Get complete batch traceability
// @Description Retrieve end-to-end farm-to-cup journey including stages, weight loss calculations, lots, and buyers (Admin, Factory Manager, Buyer own)
// @Tags batches
// @Accept json
// @Produce json
// @Param id path string true "Batch UUID"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=BatchTrace}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/batches/{id}/trace [get]
func (h *Handler) GetTrace(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid batch id")
		return
	}

	callerUserID, _ := middleware.GetUserID(r.Context())
	callerRole, _ := middleware.GetUserRole(r.Context())

	trace, err := h.service.GetTrace(r.Context(), callerUserID, callerRole, id)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			httputil.Forbidden(w, err.Error())
			return
		}
		h.logger.Warn("failed to fetch batch trace", zap.String("batch_id", idStr), zap.Error(err))
		httputil.NotFound(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, trace)
}

// AdvanceStage godoc
// @Summary Advance batch production stage
// @Description Transition a batch to the next stage in processing (Admin, Factory Manager)
// @Tags batches
// @Accept json
// @Produce json
// @Param id path string true "Batch UUID"
// @Param request body AdvanceStageRequest true "Stage transition payload"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=BatchStage}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/batches/{id}/stage [put]
func (h *Handler) AdvanceStage(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	batchID, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid batch id")
		return
	}

	var req AdvanceStageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	userIDStr, _ := middleware.GetUserID(r.Context())
	actorID, _ := uuid.Parse(userIDStr)

	stage, err := h.service.AdvanceStage(r.Context(), batchID, actorID, req)
	if err != nil {
		h.logger.Warn("failed to advance stage", zap.String("batch_id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, stage)
}

// CreateBuyer godoc
// @Summary Create buyer customer profile
// @Description Register an export or domestic tea buyer customer (Admin only)
// @Tags buyers
// @Accept json
// @Produce json
// @Param request body CreateBuyerRequest true "Buyer registration payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=Buyer}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/buyers [post]
func (h *Handler) CreateBuyer(w http.ResponseWriter, r *http.Request) {
	var req CreateBuyerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	buyer, err := h.service.CreateBuyer(r.Context(), req)
	if err != nil {
		h.logger.Warn("failed to create buyer", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, buyer)
}

// ListBuyers godoc
// @Summary List buyers
// @Description Get paginated list of registered buyer profiles (Admin only)
// @Tags buyers
// @Accept json
// @Produce json
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]Buyer}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/buyers [get]
func (h *Handler) ListBuyers(w http.ResponseWriter, r *http.Request) {
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

	buyers, err := h.service.ListBuyers(r.Context(), limit, offset)
	if err != nil {
		h.logger.Error("failed to list buyers", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list buyers")
		return
	}

	httputil.JSON(w, http.StatusOK, buyers)
}
