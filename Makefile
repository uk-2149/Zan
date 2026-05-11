SHELL := /bin/bash

PNPM ?= pnpm

COLOR_RESET := \033[0m
COLOR_BOLD := \033[1m
COLOR_CYAN := \033[36m
COLOR_GREEN := \033[32m
COLOR_YELLOW := \033[33m
COLOR_RED := \033[31m

.DEFAULT_GOAL := help

.PHONY: \
  help \
  install \
  dev \
  dev-web \
  dev-server \
  dev-agent \
  dev-db \
  build \
  lint \
  typecheck \
  format \
  db-generate \
  db-reset

help:
	@printf "$(COLOR_BOLD)Local dev commands$(COLOR_RESET)\n"
	@printf "  $(COLOR_CYAN)make install$(COLOR_RESET)      Install dependencies\n"
	@printf "  $(COLOR_CYAN)make dev$(COLOR_RESET)          Dev all apps (turbo)\n"
	@printf "  $(COLOR_CYAN)make dev-web$(COLOR_RESET)      Next.js web dev server\n"
	@printf "  $(COLOR_CYAN)make dev-server$(COLOR_RESET)   API server dev\n"
	@printf "  $(COLOR_CYAN)make dev-agent$(COLOR_RESET)    Electron agent dev\n"
	@printf "  $(COLOR_CYAN)make dev-db$(COLOR_RESET)       Watch build for db package\n"
	@printf "  $(COLOR_CYAN)make build$(COLOR_RESET)        Build all\n"
	@printf "  $(COLOR_CYAN)make lint$(COLOR_RESET)         Lint all\n"
	@printf "  $(COLOR_CYAN)make typecheck$(COLOR_RESET)    Typecheck all\n"
	@printf "  $(COLOR_CYAN)make format$(COLOR_RESET)       Format repo\n"
	@printf "  $(COLOR_CYAN)make db-generate$(COLOR_RESET)  Prisma generate\n"
	@printf "  $(COLOR_CYAN)make db-reset$(COLOR_RESET)     Reset seed db\n"

install:
	@printf "$(COLOR_GREEN)Installing deps...$(COLOR_RESET)\n"
	$(PNPM) install

dev:
	@printf "$(COLOR_GREEN)Starting all dev tasks...$(COLOR_RESET)\n"
	$(PNPM) dev

dev-web:
	@printf "$(COLOR_GREEN)Starting web dev server...$(COLOR_RESET)\n"
	$(PNPM) --filter web dev

dev-server:
	@printf "$(COLOR_GREEN)Starting API server...$(COLOR_RESET)\n"
	$(PNPM) --filter server dev

dev-agent:
	@printf "$(COLOR_GREEN)Starting agent app...$(COLOR_RESET)\n"
	$(PNPM) --filter @repo/provider-agent dev

dev-db:
	@printf "$(COLOR_GREEN)Starting db watch build...$(COLOR_RESET)\n"
	$(PNPM) --filter @repo/db dev

build:
	@printf "$(COLOR_GREEN)Building all packages...$(COLOR_RESET)\n"
	$(PNPM) build

lint:
	@printf "$(COLOR_GREEN)Linting all packages...$(COLOR_RESET)\n"
	$(PNPM) lint

typecheck:
	@printf "$(COLOR_GREEN)Typechecking all packages...$(COLOR_RESET)\n"
	$(PNPM) check-types

format:
	@printf "$(COLOR_GREEN)Formatting repo...$(COLOR_RESET)\n"
	$(PNPM) format

db-generate:
	@printf "$(COLOR_GREEN)Generating Prisma client...$(COLOR_RESET)\n"
	$(PNPM) --filter @repo/db exec prisma generate --schema prisma/schema.prisma

db-reset:
	@printf "$(COLOR_YELLOW)Resetting database via seed script...$(COLOR_RESET)\n"
	$(PNPM) --filter @repo/db seed:reset
