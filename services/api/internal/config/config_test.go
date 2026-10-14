package config

import (
	"testing"
	"time"
)

func TestParseDuration(t *testing.T) {
	tests := []struct {
		input    string
		expected time.Duration
		hasError bool
	}{
		{"15m", 15 * time.Minute, false},
		{"1h", 1 * time.Hour, false},
		{"7d", 7 * 24 * time.Hour, false},
		{"30d", 30 * 24 * time.Hour, false},
		{"invalid", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			d, err := parseDuration(tt.input)
			if tt.hasError && err == nil {
				t.Errorf("expected error for input %s, got nil", tt.input)
			}
			if !tt.hasError && err != nil {
				t.Errorf("unexpected error for input %s: %v", tt.input, err)
			}
			if !tt.hasError && d != tt.expected {
				t.Errorf("expected duration %v, got %v", tt.expected, d)
			}
		})
	}
}
