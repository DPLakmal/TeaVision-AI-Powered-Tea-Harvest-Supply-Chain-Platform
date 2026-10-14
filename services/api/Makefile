.PHONY: build run test migrate-up migrate-down swagger seed

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./... -v -cover

migrate-up:
	goose -dir migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir migrations postgres "$(DATABASE_URL)" down

swagger:
	swag init -g cmd/server/main.go -o docs

seed:
	./bin/server seed
