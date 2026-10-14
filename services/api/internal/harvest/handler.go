package harvest

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/teavision/api/internal/httputil"
	"github.com/teavision/api/internal/middleware"
	"go.uber.org/zap"
)

// Handler handles HTTP requests for harvest sessions and lots.
type Handler struct {
	service Service
	logger  *zap.Logger
}

// NewHandler creates a new harvest HTTP handler.
func NewHandler(service Service, logger *zap.Logger) *Handler {
	return &Handler{
		service: service,
		logger:  logger,
	}
}

// CreateSession godoc
// @Summary Create a harvest session
// @Description Start a new harvesting session in a tea garden (Admin, Supervisor)
// @Tags harvest
// @Accept json
// @Produce json
// @Param request body CreateSessionRequest true "Harvest session initiation payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=HarvestSession}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/harvests [post]
func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	userIDStr, _ := middleware.GetUserID(r.Context())
	supervisorID, _ := uuid.Parse(userIDStr)

	session, err := h.service.CreateSession(r.Context(), supervisorID, req)
	if err != nil {
		h.logger.Warn("failed to create harvest session", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, session)
}

// ListSessions godoc
// @Summary List harvest sessions
// @Description Get paginated list of harvesting sessions (Admin, Supervisor, Factory Manager)
// @Tags harvest
// @Accept json
// @Produce json
// @Param garden_id query string false "Filter by Garden UUID"
// @Param supervisor_id query string false "Filter by Supervisor UUID"
// @Param limit query int false "Number of records to return (default 20)"
// @Param offset query int false "Number of records to skip (default 0)"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=[]HarvestSession}
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/harvests [get]
func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
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

	var supervisorID *uuid.UUID
	if sidStr := r.URL.Query().Get("supervisor_id"); sidStr != "" {
		if sid, err := uuid.Parse(sidStr); err == nil {
			supervisorID = &sid
		}
	}

	sessions, err := h.service.ListSessions(r.Context(), gardenID, supervisorID, limit, offset)
	if err != nil {
		h.logger.Error("failed to list harvest sessions", zap.Error(err))
		httputil.InternalServerError(w, h.logger, err, "failed to list harvest sessions")
		return
	}

	httputil.JSON(w, http.StatusOK, sessions)
}

// GetSession godoc
// @Summary Get harvest session by ID
// @Description Retrieve single harvest session details and statistics (Admin, Supervisor, Factory Manager)
// @Tags harvest
// @Accept json
// @Produce json
// @Param id path string true "Harvest Session UUID"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=HarvestSession}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/harvests/{id} [get]
func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid session id")
		return
	}

	session, err := h.service.GetSession(r.Context(), id)
	if err != nil {
		h.logger.Warn("harvest session not found", zap.String("id", idStr), zap.Error(err))
		httputil.NotFound(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, session)
}

// CompleteSession godoc
// @Summary Complete a harvest session
// @Description Mark an open harvest session as finished (Admin, Supervisor)
// @Tags harvest
// @Accept json
// @Produce json
// @Param id path string true "Harvest Session UUID"
// @Param request body CompleteSessionRequest true "Completion notes and timestamp"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=HarvestSession}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/harvests/{id}/complete [put]
func (h *Handler) CompleteSession(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid session id")
		return
	}

	var req CompleteSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err.Error() != "EOF" {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	session, err := h.service.CompleteSession(r.Context(), id, req.Notes)
	if err != nil {
		h.logger.Warn("failed to complete harvest session", zap.String("id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, session)
}

// CreateLot godoc
// @Summary Create a harvest lot
// @Description Weigh and record a lot of tea leaves for a worker (Admin, Supervisor, Field Worker)
// @Tags harvest
// @Accept json
// @Produce json
// @Param request body CreateLotRequest true "Lot payload"
// @Security BearerAuth
// @Success 201 {object} httputil.Response{data=HarvestLot}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/lots [post]
func (h *Handler) CreateLot(w http.ResponseWriter, r *http.Request) {
	var req CreateLotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	lot, err := h.service.CreateLot(r.Context(), req)
	if err != nil {
		h.logger.Warn("failed to create harvest lot", zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusCreated, lot)
}

// GetLot godoc
// @Summary Get harvest lot by ID
// @Description Retrieve single harvest lot details (Admin, Supervisor)
// @Tags harvest
// @Accept json
// @Produce json
// @Param id path string true "Harvest Lot UUID"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=HarvestLot}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 404 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/lots/{id} [get]
func (h *Handler) GetLot(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid lot id")
		return
	}

	lot, err := h.service.GetLot(r.Context(), id)
	if err != nil {
		h.logger.Warn("lot not found", zap.String("id", idStr), zap.Error(err))
		httputil.NotFound(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, lot)
}

// GradeLot godoc
// @Summary Grade a harvest lot
// @Description Trigger ML leaf grading from an image or apply a supervisor quality grade override (Admin, Supervisor)
// @Tags harvest
// @Accept json
// @Produce json
// @Param id path string true "Harvest Lot UUID"
// @Param request body GradeLotRequest true "Grading payload"
// @Security BearerAuth
// @Success 200 {object} httputil.Response{data=HarvestLot}
// @Failure 400 {object} httputil.Response
// @Failure 401 {object} httputil.Response
// @Failure 403 {object} httputil.Response
// @Failure 500 {object} httputil.Response
// @Router /api/v1/lots/{id}/grade [put]
func (h *Handler) GradeLot(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		httputil.BadRequest(w, "invalid lot id")
		return
	}

	var req GradeLotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.BadRequest(w, "invalid request body")
		return
	}

	graded, err := h.service.GradeLot(r.Context(), id, req)
	if err != nil {
		h.logger.Warn("failed to grade harvest lot", zap.String("id", idStr), zap.Error(err))
		httputil.BadRequest(w, err.Error())
		return
	}

	httputil.JSON(w, http.StatusOK, graded)
}
