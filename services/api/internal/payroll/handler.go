package payroll

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

// Handler handles HTTP requests for payroll management.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new payroll HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// RunPayroll godoc
// @Summary Execute payroll run
// @Description Calculate wages for all active workers within the specified period (Admin only)
// @Tags payroll
// @Accept json
// @Produce json
// @Param request body RunPayrollRequest true "Period dates payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=PayrollRun}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/payroll/run [post]
func (h *Handler) RunPayroll(w http.ResponseWriter, r *http.Request) {
	var req RunPayrollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	userIDStr, _ := middleware.GetUserID(r.Context())
	adminID, err := uuid.Parse(userIDStr)
	if err != nil {
		httputil.Unauthorized(w, "invalid caller identity")
		return
	}

	run, err := h.service.RunPayroll(r.Context(), adminID, req)
	if err != nil {
		h.logger.Warn("payroll calculation failed", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, run)
}

// ListRuns godoc
// @Summary List payroll runs
// @Description Get paginated list of historical payroll runs (Admin only)
// @Tags payroll
// @Accept json
// @Produce json
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]PayrollRun}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/payroll/runs [get]
func (h *Handler) ListRuns(w http.ResponseWriter, r *http.Request) {
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

	runs, err := h.service.ListRuns(r.Context(), limit, offset)
	if err != nil {
		h.logger.Error("failed to list payroll runs", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list payroll runs")
		return
	}

	httputil.JSON(w, http.StatusOK, runs)
}

// GetRun godoc
// @Summary Get payroll run details
// @Description Retrieve single payroll run with worker wage line items (Admin only)
// @Tags payroll
// @Accept json
// @Produce json
// @Param id path string true "Payroll Run UUID"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=PayrollRun}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/payroll/runs/{id} [get]
func (h *Handler) GetRun(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid run id")
		return
	}

	run, err := h.service.GetRun(r.Context(), id)
	if err != nil {
		h.logger.Warn("payroll run not found", zap.String("id", idStr), zap.Error(err))
		httputil.NotFound(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, run)
}

// GetWorkerPayroll godoc
// @Summary Get worker payroll history
// @Description Retrieve wage payment line items for a specific worker (Admin, Supervisor, Field Worker own)
// @Tags payroll
// @Accept json
// @Produce json
// @Param id path string true "Worker UUID"
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]PayrollEntry}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/payroll/workers/{id} [get]
func (h *Handler) GetWorkerPayroll(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		idStr = chi.URLParam(r, "worker_id")
	}

	workerID, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid worker id")
		return
	}

	callerUserID, _ := middleware.GetUserID(r.Context())
	callerRole, _ := middleware.GetUserRole(r.Context())

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

	entries, err := h.service.GetWorkerPayroll(r.Context(), callerUserID, callerRole, workerID, limit, offset)
	if err != nil {
		if strings.Contains(err.Error(), "forbidden") {
			httputil.Forbidden(w, err.Error())
			return
		}
		h.logger.Warn("failed to get worker payroll", zap.String("worker_id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, entries)
}
