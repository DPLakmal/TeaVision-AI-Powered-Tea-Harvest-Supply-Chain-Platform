// Package seeder populates the TeaVision database with seed data for local development and testing.
package seeder

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/teavision/api/internal/batch"
	"github.com/teavision/api/internal/harvest"
	"github.com/teavision/api/internal/user"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// Seed populates default users, gardens, workers, harvest sessions, lots, and batches.
func Seed(ctx context.Context, db *sqlx.DB, logger *zap.Logger) error {
	logger.Info("starting database seeding...")

	// 1. Seed Core Users
	passHash, err := bcrypt.GenerateFromPassword([]byte("Admin@1234"), 12)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	adminID := uuid.New()
	supervisorID := uuid.New()
	factoryID := uuid.New()
	buyerUserID := uuid.New()

	users := []struct {
		id    uuid.UUID
		email string
		role  string
	}{
		{id: adminID, email: "admin@teavision.io", role: user.RoleAdmin},
		{id: supervisorID, email: "supervisor@teavision.io", role: user.RoleSupervisor},
		{id: factoryID, email: "factory@teavision.io", role: user.RoleFactoryManager},
		{id: buyerUserID, email: "buyer@teavision.io", role: user.RoleBuyer},
	}

	for _, u := range users {
		var existingID uuid.UUID
		err := db.GetContext(ctx, &existingID, `SELECT id FROM users WHERE email = $1`, u.email)
		if err == nil {
			logger.Info("user already exists, skipping", zap.String("email", u.email))
			continue
		}

		insertUser := `
			INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
		`
		if _, err := db.ExecContext(ctx, insertUser, u.id, u.email, string(passHash), u.role); err != nil {
			return fmt.Errorf("failed to seed user %s: %w", u.email, err)
		}
		logger.Info("created user", zap.String("email", u.email), zap.String("role", u.role))
	}

	// 2. Seed Tea Gardens
	garden1ID := uuid.New()
	garden2ID := uuid.New()

	gardens := []struct {
		id   uuid.UUID
		name string
		lat  float64
		lng  float64
		area float64
	}{
		{id: garden1ID, name: "Nuwara Eliya High Peak Estate", lat: 6.9497, lng: 80.7891, area: 120.5},
		{id: garden2ID, name: "Kandy Valley Organic Garden", lat: 7.2906, lng: 80.6337, area: 85.0},
	}

	for _, g := range gardens {
		var existingID uuid.UUID
		err := db.GetContext(ctx, &existingID, `SELECT id FROM tea_gardens WHERE name = $1`, g.name)
		if err == nil {
			logger.Info("garden already exists, skipping", zap.String("name", g.name))
			continue
		}

		insertGarden := `
			INSERT INTO tea_gardens (id, name, location_lat, location_lng, area_hectares, created_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
		`
		if _, err := db.ExecContext(ctx, insertGarden, g.id, g.name, g.lat, g.lng, g.area); err != nil {
			return fmt.Errorf("failed to seed garden %s: %w", g.name, err)
		}
		logger.Info("created tea garden", zap.String("name", g.name))
	}

	// 3. Seed 5 Workers
	workerNames := []string{
		"Kamal Perera",
		"Sunil Shantha",
		"Anura Kumara",
		"Nimal Siripala",
		"Priyantha Jayasuriya",
	}

	workerIDs := make([]uuid.UUID, 5)
	for i, name := range workerNames {
		email := fmt.Sprintf("worker%d@teavision.io", i+1)
		wUserID := uuid.New()

		var existingUserID uuid.UUID
		err := db.GetContext(ctx, &existingUserID, `SELECT id FROM users WHERE email = $1`, email)
		if err != nil {
			insertUser := `
				INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
				VALUES ($1, $2, $3, $4, NOW(), NOW())
			`
			if _, err := db.ExecContext(ctx, insertUser, wUserID, email, string(passHash), user.RoleFieldWorker); err != nil {
				return fmt.Errorf("failed to seed worker user %s: %w", email, err)
			}
		} else {
			wUserID = existingUserID
		}

		wID := uuid.New()
		var existingWorkerID uuid.UUID
		err = db.GetContext(ctx, &existingWorkerID, `SELECT id FROM workers WHERE user_id = $1`, wUserID)
		if err != nil {
			assignedGarden := garden1ID
			if i%2 == 1 {
				assignedGarden = garden2ID
			}
			rate := 25.0 + float64(i)*2.5

			insertWorker := `
				INSERT INTO workers (id, user_id, name, garden_id, rate_per_kg, joined_at, created_at)
				VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, NOW())
			`
			if _, err := db.ExecContext(ctx, insertWorker, wID, wUserID, name, assignedGarden, rate); err != nil {
				return fmt.Errorf("failed to seed worker %s: %w", name, err)
			}
			workerIDs[i] = wID
			logger.Info("created worker", zap.String("name", name), zap.Float64("rate", rate))
		} else {
			workerIDs[i] = existingWorkerID
		}
	}

	// 4. Seed Harvest Session with 10 Lots
	sessionID := uuid.New()
	var existingSessionID uuid.UUID
	err = db.GetContext(ctx, &existingSessionID, `SELECT id FROM harvest.sessions WHERE garden_id = $1 LIMIT 1`, garden1ID)
	if err != nil {
		notes := "Peak morning plucking session"
		insertSession := `
			INSERT INTO harvest.sessions (id, garden_id, supervisor_id, started_at, completed_at, notes)
			VALUES ($1, $2, $3, NOW() - INTERVAL '2 hours', NOW(), $4)
		`
		if _, err := db.ExecContext(ctx, insertSession, sessionID, garden1ID, supervisorID, notes); err != nil {
			return fmt.Errorf("failed to seed harvest session: %w", err)
		}
		logger.Info("created sample harvest session", zap.String("session_id", sessionID.String()))

		grades := []string{harvest.GradeHigh, harvest.GradeMedium, harvest.GradeHigh, harvest.GradeLow, harvest.GradeHigh}
		lotIDs := make([]uuid.UUID, 10)
		for j := 0; j < 10; j++ {
			lotID := uuid.New()
			lotIDs[j] = lotID
			wID := workerIDs[j%len(workerIDs)]
			weight := 12.5 + float64(j)*1.2
			grade := grades[j%len(grades)]
			conf := 0.88 + float64(j%10)*0.01

			insertLot := `
				INSERT INTO harvest.lots (
					id, session_id, worker_id, weight_kg, grade, confidence, image_url, graded_at, synced_from_mobile, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE, NOW())
			`
			imgURL := fmt.Sprintf("https://s3.amazonaws.com/teavision-leaf-images/sample_%d.jpg", j+1)
			if _, err := db.ExecContext(ctx, insertLot, lotID, sessionID, wID, weight, grade, conf, imgURL); err != nil {
				return fmt.Errorf("failed to seed lot: %w", err)
			}
		}
		logger.Info("created 10 sample harvest lots")

		// 5. Seed Batch with Stages
		batchID := uuid.New()
		insertBatch := `
			INSERT INTO traceability.batches (id, name, current_stage, created_by, created_at)
			VALUES ($1, $2, $3, $4, NOW())
		`
		if _, err := db.ExecContext(ctx, insertBatch, batchID, "Batch-2025-SilverTips-001", batch.StageQualityControl, supervisorID); err != nil {
			return fmt.Errorf("failed to seed batch: %w", err)
		}

		for _, lid := range lotIDs[:5] {
			_, _ = db.ExecContext(ctx, `INSERT INTO traceability.batch_lots (batch_id, lot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, batchID, lid)
		}

		// Insert progression stages
		stages := []struct {
			stage  string
			weight float64
			notes  string
		}{
			{stage: batch.StageField, weight: 100.0, notes: "Freshly harvested green leaf lots received"},
			{stage: batch.StageProcessing, weight: 92.5, notes: "Withering moisture reduction phase complete"},
			{stage: batch.StageFactory, weight: 88.0, notes: "Rolled, fermented, and fired in fluidized bed dryer"},
			{stage: batch.StageQualityControl, weight: 87.2, notes: "Aroma cupping and leaf particle size grading passed"},
		}

		for idx, st := range stages {
			stID := uuid.New()
			tOffset := time.Duration(len(stages)-idx) * time.Hour
			insertStage := `
				INSERT INTO traceability.batch_stages (id, batch_id, stage, weight_kg, notes, actor_id, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW() - $7::interval)
			`
			_, err = db.ExecContext(ctx, insertStage, stID, batchID, st.stage, st.weight, st.notes, supervisorID, fmt.Sprintf("%d hours", tOffset/time.Hour))
			if err != nil {
				return fmt.Errorf("failed to seed batch stage: %w", err)
			}
		}
		logger.Info("created sample batch with 4 production stages")

		// 6. Seed Buyer & Delivery
		buyerID := uuid.New()
		insertBuyer := `
			INSERT INTO traceability.buyers (id, name, contact_email, country, user_id, created_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
		`
		email := "buyer@teavision.io"
		country := "United Kingdom"
		if _, err := db.ExecContext(ctx, insertBuyer, buyerID, "Imperial Tea Merchants London", email, country, buyerUserID); err == nil {
			logger.Info("created sample buyer")
			deliveryID := uuid.New()
			invURL := "https://invoices.teavision.io/sample-inv-2025.pdf"
			insertDelivery := `
				INSERT INTO traceability.batch_deliveries (id, batch_id, buyer_id, delivered_at, invoice_url, created_at)
				VALUES ($1, $2, $3, NOW(), $4, NOW())
			`
			_, _ = db.ExecContext(ctx, insertDelivery, deliveryID, batchID, buyerID, invURL)
			logger.Info("linked batch delivery to buyer")
		}
	}

	logger.Info("========================================")
	logger.Info("Database seeding successfully completed!")
	logger.Info("Admin Login: admin@teavision.io / Admin@1234")
	logger.Info("Supervisor:  supervisor@teavision.io / Admin@1234")
	logger.Info("Factory:     factory@teavision.io / Admin@1234")
	logger.Info("Buyer:       buyer@teavision.io / Admin@1234")
	logger.Info("========================================")

	return nil
}
