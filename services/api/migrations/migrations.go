// Package migrations embeds all SQL migration files for goose.
package migrations

import "embed"

// FS embeds the SQL migration files for the TeaVision database.
//
//go:embed *.sql
var FS embed.FS
