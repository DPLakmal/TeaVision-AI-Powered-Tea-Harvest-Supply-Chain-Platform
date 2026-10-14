// Package db provides database connection and management using sqlx and pgx.
package db

import (
	"context"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// Connect opens a connection to the PostgreSQL database with retry logic and connection pooling.
func Connect(databaseURL string, logger *zap.Logger) (*sqlx.DB, error) {
	const maxRetries = 5
	const retryInterval = 2 * time.Second

	var (
		db  *sqlx.DB
		err error
	)

	for attempt := 1; attempt <= maxRetries; attempt++ {
		logger.Info("attempting to connect to database",
			zap.Int("attempt", attempt),
			zap.Int("max_retries", maxRetries),
		)

		db, err = sqlx.Open("pgx", databaseURL)
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			pingErr := db.PingContext(ctx)
			cancel()

			if pingErr == nil {
				logger.Info("successfully connected to database")
				// Configure connection pooling
				db.SetMaxOpenConns(25)
				db.SetMaxIdleConns(10)
				db.SetConnMaxLifetime(15 * time.Minute)
				db.SetConnMaxIdleTime(5 * time.Minute)
				return db, nil
			}
			err = pingErr
			_ = db.Close()
		}

		logger.Warn("database connection attempt failed",
			zap.Int("attempt", attempt),
			zap.Error(err),
		)

		if attempt < maxRetries {
			time.Sleep(retryInterval)
		}
	}

	return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", maxRetries, err)
}

// Ping checks if the database connection is alive.
func Ping(ctx context.Context, db *sqlx.DB) error {
	if db == nil {
		return fmt.Errorf("database client is not initialized")
	}
	return db.PingContext(ctx)
}
