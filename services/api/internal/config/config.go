// Package config provides configuration parsing via viper with environment variable support.
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all configuration parameters required by the TeaVision API service.
type Config struct {
	DatabaseURL   string        `mapstructure:"DATABASE_URL"`
	JWTSecret     string        `mapstructure:"JWT_SECRET"`
	JWTAccessTTL  time.Duration `mapstructure:"JWT_ACCESS_TTL"`
	JWTRefreshTTL time.Duration `mapstructure:"JWT_REFRESH_TTL"`
	Port          string        `mapstructure:"API_PORT"`
	Env           string        `mapstructure:"API_ENV"`
	LogLevel      string        `mapstructure:"LOG_LEVEL"`
	MLServiceURL  string        `mapstructure:"ML_SERVICE_URL"`
	AWSS3Bucket   string        `mapstructure:"AWS_S3_BUCKET"`
	AWSRegion     string        `mapstructure:"AWS_REGION"`
}

// Load reads configuration from environment variables and optional .env files.
func Load() (*Config, error) {
	v := viper.New()

	// Default configurations
	v.SetDefault("DATABASE_URL", "postgres://teavision:changeme_strong_password@localhost:5432/teavision?sslmode=disable")
	v.SetDefault("JWT_SECRET", "changeme_jwt_secret_at_least_32_chars")
	v.SetDefault("JWT_ACCESS_TTL", "15m")
	v.SetDefault("JWT_REFRESH_TTL", "168h")
	v.SetDefault("API_PORT", "8080")
	v.SetDefault("API_ENV", "development")
	v.SetDefault("LOG_LEVEL", "debug")
	v.SetDefault("ML_SERVICE_URL", "http://localhost:8000")
	v.SetDefault("AWS_S3_BUCKET", "teavision-leaf-images")
	v.SetDefault("AWS_REGION", "us-east-1")

	// Allow reading from .env file if available in working directories
	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	v.AddConfigPath("../..")
	v.AddConfigPath("../../..")
	_ = v.ReadInConfig()

	// Bind environment variables automatically
	v.AutomaticEnv()

	// Fallback bindings for standard aliases
	if port := v.GetString("PORT"); port != "" {
		v.Set("API_PORT", port)
	}
	if env := v.GetString("ENV"); env != "" {
		v.Set("API_ENV", env)
	}
	if mlURL := v.GetString("NEXT_PUBLIC_ML_URL"); mlURL != "" && v.GetString("ML_SERVICE_URL") == "http://localhost:8000" {
		v.Set("ML_SERVICE_URL", mlURL)
	}

	accessTTLStr := v.GetString("JWT_ACCESS_TTL")
	accessTTL, err := parseDuration(accessTTLStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JWT_ACCESS_TTL: %w", err)
	}

	refreshTTLStr := v.GetString("JWT_REFRESH_TTL")
	refreshTTL, err := parseDuration(refreshTTLStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JWT_REFRESH_TTL: %w", err)
	}

	cfg := &Config{
		DatabaseURL:   v.GetString("DATABASE_URL"),
		JWTSecret:     v.GetString("JWT_SECRET"),
		JWTAccessTTL:  accessTTL,
		JWTRefreshTTL: refreshTTL,
		Port:          v.GetString("API_PORT"),
		Env:           v.GetString("API_ENV"),
		LogLevel:      v.GetString("LOG_LEVEL"),
		MLServiceURL:  v.GetString("ML_SERVICE_URL"),
		AWSS3Bucket:   v.GetString("AWS_S3_BUCKET"),
		AWSRegion:     v.GetString("AWS_REGION"),
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	return cfg, nil
}

// parseDuration handles standard durations as well as day expressions like "7d".
func parseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	if strings.HasSuffix(s, "d") {
		var days int
		_, err := fmt.Sscanf(s, "%dd", &days)
		if err == nil {
			return time.Duration(days) * 24 * time.Hour, nil
		}
	}
	return time.ParseDuration(s)
}
