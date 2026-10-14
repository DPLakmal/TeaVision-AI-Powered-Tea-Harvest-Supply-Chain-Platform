// Package main provides the entry point for the TeaVision REST API server.
//
// @title TeaVision API
// @version 1.0
// @description AI-Powered Tea Harvest & Supply Chain Platform REST API.
// @termsOfService http://swagger.io/terms/
//
// @contact.name TeaVision Engineering
// @contact.url https://teavision.io
// @contact.email dev@teavision.io
//
// @license.name MIT
// @license.url https://opensource.org/licenses/MIT
//
// @host localhost:8080
// @BasePath /
//
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type 'Bearer' followed by a space and your JWT access token.
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/pressly/goose/v3"
	httpSwagger "github.com/swaggo/http-swagger/v2"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/teavision/api/internal/analytics"
	"github.com/teavision/api/internal/auth"
	"github.com/teavision/api/internal/batch"
	"github.com/teavision/api/internal/config"
	"github.com/teavision/api/internal/db"
	"github.com/teavision/api/internal/garden"
	"github.com/teavision/api/internal/harvest"
	"github.com/teavision/api/internal/httputil"
	"github.com/teavision/api/internal/middleware"
	"github.com/teavision/api/internal/payroll"
	"github.com/teavision/api/internal/seeder"
	"github.com/teavision/api/internal/user"
	"github.com/teavision/api/internal/worker"
	"github.com/teavision/api/migrations"
	_ "github.com/teavision/api/docs"
)

func initLogger(levelStr string, env string) (*zap.Logger, error) {
	var zapLevel zapcore.Level
	switch strings.ToLower(levelStr) {
	case "debug":
		zapLevel = zapcore.DebugLevel
	case "info":
		zapLevel = zapcore.InfoLevel
	case "warn", "warning":
		zapLevel = zapcore.WarnLevel
	case "error":
		zapLevel = zapcore.ErrorLevel
	default:
		zapLevel = zapcore.InfoLevel
	}

	var zapCfg zap.Config
	if env == "production" {
		zapCfg = zap.NewProductionConfig()
	} else {
		zapCfg = zap.NewDevelopmentConfig()
	}
	zapCfg.Level = zap.NewAtomicLevelAt(zapLevel)
	return zapCfg.Build()
}

func main() {
	// 1. Load Configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// 2. Initialize Structured Logger
	logger, err := initLogger(cfg.LogLevel, cfg.Env)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = logger.Sync() }()

	logger.Info("starting TeaVision API",
		zap.String("env", cfg.Env),
		zap.String("port", cfg.Port),
		zap.String("log_level", cfg.LogLevel),
	)

	// 3. Connect to Database with Retry
	dbConn, err := db.Connect(cfg.DatabaseURL, logger)
	if err != nil {
		logger.Fatal("could not establish database connection", zap.Error(err))
	}
	defer func() {
		if closeErr := dbConn.Close(); closeErr != nil {
			logger.Error("error closing database connection", zap.Error(closeErr))
		}
	}()

	// 4. Run Goose Database Migrations
	logger.Info("applying database migrations...")
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		logger.Fatal("failed to set goose dialect", zap.Error(err))
	}
	if err := goose.Up(dbConn.DB, "."); err != nil {
		logger.Fatal("failed to apply migrations", zap.Error(err))
	}
	logger.Info("database migrations applied successfully")

	// 5. Handle "seed" Subcommand
	if len(os.Args) > 1 && os.Args[1] == "seed" {
		logger.Info("executing dev database seeder...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := seeder.Seed(ctx, dbConn, logger); err != nil {
			logger.Fatal("seeder execution failed", zap.Error(err))
		}
		logger.Info("seeding completed successfully")
		return
	}

	// 6. Wire Repositories
	userRepo := user.NewRepository(dbConn)
	gardenRepo := garden.NewRepository(dbConn)
	workerRepo := worker.NewRepository(dbConn)
	harvestRepo := harvest.NewRepository(dbConn)
	payrollRepo := payroll.NewRepository(dbConn)
	batchRepo := batch.NewRepository(dbConn)
	analyticsRepo := analytics.NewRepository(dbConn)

	// 7. Wire Services
	userService := user.NewService(userRepo)
	authService := auth.NewService(dbConn, userRepo, cfg)
	gardenService := garden.NewService(gardenRepo)
	workerService := worker.NewService(workerRepo)
	harvestService := harvest.NewService(harvestRepo, cfg, logger)
	payrollService := payroll.NewService(payrollRepo, workerRepo)
	batchService := batch.NewService(batchRepo)

	// 8. Wire Handlers
	userHandler := user.NewHandler(userService, logger)
	authHandler := auth.NewHandler(authService, logger)
	gardenHandler := garden.NewHandler(gardenService, logger)
	workerHandler := worker.NewHandler(workerService, logger)
	harvestHandler := harvest.NewHandler(harvestService, logger)
	payrollHandler := payroll.NewHandler(payrollService, logger)
	batchHandler := batch.NewHandler(batchService, logger)
	analyticsHandler := analytics.NewHandler(analyticsRepo, logger)

	// 9. Setup Chi Router & Global Middlewares
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.Recoverer(logger))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// 10. Health & Readiness Probes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.Ping(ctx, dbConn); err != nil {
			httputil.Error(w, http.StatusServiceUnavailable, "database ping failed")
			return
		}
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	// 11. Swagger Documentation Route
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// 12. API v1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public Auth Endpoints
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
		})

		// Protected Routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(cfg.JWTSecret))

			// Users Management [admin]
			r.Route("/users", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin)).Get("/", userHandler.ListUsers)
				r.With(middleware.RequireRole(user.RoleAdmin)).Post("/", userHandler.CreateUser)
				r.With(middleware.RequireRole(user.RoleAdmin)).Put("/{id}/role", userHandler.UpdateRole)
			})

			// Workers Management
			r.Route("/workers", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Get("/", workerHandler.ListWorkers)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Post("/", workerHandler.CreateWorker)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFieldWorker)).Get("/{id}", workerHandler.GetWorker)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Put("/{id}", workerHandler.UpdateWorker)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFieldWorker)).Get("/{id}/harvests", workerHandler.GetWorkerHarvests)
			})

			// Tea Gardens Management
			r.Route("/gardens", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFactoryManager)).Get("/", gardenHandler.ListGardens)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFactoryManager)).Get("/{id}", gardenHandler.GetGarden)
				r.With(middleware.RequireRole(user.RoleAdmin)).Post("/", gardenHandler.CreateGarden)
				r.With(middleware.RequireRole(user.RoleAdmin)).Put("/{id}", gardenHandler.UpdateGarden)
			})

			// Harvest Sessions & Lots
			r.Route("/harvests", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Post("/", harvestHandler.CreateSession)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFactoryManager)).Get("/", harvestHandler.ListSessions)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFactoryManager)).Get("/{id}", harvestHandler.GetSession)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Put("/{id}/complete", harvestHandler.CompleteSession)
			})

			r.Route("/lots", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFieldWorker)).Post("/", harvestHandler.CreateLot)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Get("/{id}", harvestHandler.GetLot)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Put("/{id}/grade", harvestHandler.GradeLot)
			})

			// Payroll Management
			r.Route("/payroll", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin)).Post("/run", payrollHandler.RunPayroll)
				r.With(middleware.RequireRole(user.RoleAdmin)).Get("/runs", payrollHandler.ListRuns)
				r.With(middleware.RequireRole(user.RoleAdmin)).Get("/runs/{id}", payrollHandler.GetRun)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFieldWorker)).Get("/workers/{id}", payrollHandler.GetWorkerPayroll)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor, user.RoleFieldWorker)).Get("/{worker_id}", payrollHandler.GetWorkerPayroll)
			})

			// Batches & Traceability
			r.Route("/batches", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Post("/", batchHandler.CreateBatch)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleFactoryManager)).Get("/", batchHandler.ListBatches)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleFactoryManager, user.RoleBuyer)).Get("/{id}/trace", batchHandler.GetTrace)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleFactoryManager)).Put("/{id}/stage", batchHandler.AdvanceStage)
			})

			// Buyers
			r.Route("/buyers", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin)).Post("/", batchHandler.CreateBuyer)
				r.With(middleware.RequireRole(user.RoleAdmin)).Get("/", batchHandler.ListBuyers)
			})

			// Analytics
			r.Route("/analytics", func(r chi.Router) {
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Get("/yield", analyticsHandler.GetYield)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Get("/quality", analyticsHandler.GetQuality)
				r.With(middleware.RequireRole(user.RoleAdmin, user.RoleSupervisor)).Get("/workers", analyticsHandler.GetWorkers)
				r.With(middleware.RequireRole(user.RoleAdmin)).Get("/payroll", analyticsHandler.GetPayroll)
			})
		})
	})

	// 13. HTTP Server Initialization
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("HTTP server listening", zap.String("addr", server.Addr))
		serverErrors <- server.ListenAndServe()
	}()

	// 14. Graceful Shutdown on SIGINT/SIGTERM
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("server fatal error", zap.Error(err))
		}
	case sig := <-shutdown:
		logger.Info("shutdown signal received", zap.String("signal", sig.String()))

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			logger.Error("graceful server shutdown failed, forcing close", zap.Error(err))
			_ = server.Close()
		}
		logger.Info("server shutdown gracefully completed")
	}
}
