package analytics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/teavision/api/internal/httputil"
	"go.uber.org/zap"
)

// Handler handles HTTP requests for reporting and analytics.
type Handler struct {
	repo   Repository
	logger *zap.Logger
}

// NewHandler creates a new analytics HTTP handler.
func NewHandler(repo Repository, logger *zap.Logger) *Handler {
	return &Handler{
		repo:   repo,
		logger: logger,
	}
}

// parseDateFilters parses start_date and end_date query parameters.
func parseDateFilters(r *http.Request) (*time.Time, *time.Time) {
	var start, end *time.Time

	if s := r.URL.Query().Get("start_date"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			start = &t
		}
	}
	if e := r.URL.Query().Get("end_date"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			endOfDay := t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			end = &endOfDay
		}
	}

	return start, end
}

// GetYield godoc
// @Summary Get harvest yield analytics
// @Description Retrieve daily aggregated harvest volumes with optional garden and date filters (Admin, Supervisor)
// @Tags analytics
// @Accept json
// @Produce json
// @Param garden_id query string false "Filter by Garden UUID"
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]YieldData}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/analytics/yield [get]
func (h *Handler) GetYield(w http.ResponseWriter, r *http.Request) {
	var gardenID *uuid.UUID
	if gidStr := r.URL.Query().Get("garden_id"); gidStr != "" {
		if gid, err := uuid.Parse(gidStr); err == nil {
			gardenID = &gid
		}
	}

	start, end := parseDateFilters(r)

	yieldData, err := h.repo.GetYield(r.Context(), gardenID, start, end)
	if err != nil {
		h.logger.Error("failed to get yield analytics", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to query yield analytics")
		return
	}

	httputil.JSON(w, http.StatusOK, yieldData)
}

// GetQuality godoc
// @Summary Get tea quality distribution
// @Description Retrieve leaf grade distribution breakdown and percentages (Admin, Supervisor)
// @Tags analytics
// @Accept json
// @Produce json
// @Param garden_id query string false "Filter by Garden UUID"
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]QualityData}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/analytics/quality [get]
func (h *Handler) GetQuality(w http.ResponseWriter, r *http.Request) {
	var gardenID *uuid.UUID
	if gidStr := r.URL.Query().Get("garden_id"); gidStr != "" {
		if gid, err := uuid.Parse(gidStr); err == nil {
			gardenID = &gid
		}
	}

	start, end := parseDateFilters(r)

	qualityData, err := h.repo.GetQuality(r.Context(), gardenID, start, end)
	if err != nil {
		h.logger.Error("failed to get quality analytics", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to query quality analytics")
		return
	}

	httputil.JSON(w, http.StatusOK, qualityData)
}

// GetWorkers godoc
// @Summary Get top field worker performance
// @Description Retrieve highest producing workers ranked by total kilograms harvested (Admin, Supervisor)
// @Tags analytics
// @Accept json
// @Produce json
// @Param limit query int false "Top N workers (default 10)"
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]WorkerPerformance}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/analytics/workers [get]
func (h *Handler) GetWorkers(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	start, end := parseDateFilters(r)

	topWorkers, err := h.repo.GetTopWorkers(r.Context(), limit, start, end)
	if err != nil {
		h.logger.Error("failed to get top workers analytics", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to query worker analytics")
		return
	}

	httputil.JSON(w, http.StatusOK, topWorkers)
}

// GetPayroll godoc
// @Summary Get payroll summary analytics
// @Description Retrieve aggregate payouts, worker counts, and weight totals per payroll cycle (Admin only)
// @Tags analytics
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]PayrollSummary}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/analytics/payroll [get]
func (h *Handler) GetPayroll(w http.ResponseWriter, r *http.Request) {
	start, end := parseDateFilters(r)

	payrollSummaries, err := h.repo.GetPayrollSummaries(r.Context(), start, end)
	if err != nil {
		h.logger.Error("failed to get payroll analytics", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to query payroll analytics")
		return
	}

	httputil.JSON(w, http.StatusOK, payrollSummaries)
}
