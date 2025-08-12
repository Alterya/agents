SHELL := /bin/bash

# Root-level orchestrator for the web app under ./web

WEB_DIR := web

.PHONY: install dev build typecheck lint lint-fix format format-check test test-watch \
        e2e e2e-headed prisma-format prisma-validate prisma-migrate prisma-seed prisma-studio \
        a11y lhci check ci

install:
	cd $(WEB_DIR) && pnpm install
	git config core.hooksPath .githooks || true
	chmod +x .githooks/pre-commit || true

dev:
	cd $(WEB_DIR) && pnpm dev

build:
	cd $(WEB_DIR) && pnpm build

typecheck:
	cd $(WEB_DIR) && pnpm typecheck

lint:
	cd $(WEB_DIR) && pnpm lint

lint-fix:
	cd $(WEB_DIR) && pnpm lint:fix

format:
	cd $(WEB_DIR) && pnpm format

format-check:
	cd $(WEB_DIR) && pnpm format:check

test:
	cd $(WEB_DIR) && pnpm test

test-watch:
	cd $(WEB_DIR) && pnpm test:watch

e2e:
	cd $(WEB_DIR) && pnpm e2e

e2e-headed:
	cd $(WEB_DIR) && pnpm e2e:headed

prisma-format:
	cd $(WEB_DIR) && pnpm prisma:format || true

prisma-validate:
	cd $(WEB_DIR) && pnpm prisma:validate || true

prisma-migrate:
	cd $(WEB_DIR) && pnpm prisma:migrate || true

prisma-seed:
	cd $(WEB_DIR) && pnpm prisma:seed || true

prisma-studio:
	cd $(WEB_DIR) && pnpm prisma:studio || true

a11y:
	cd $(WEB_DIR) && pnpm a11y || true

lhci:
	cd $(WEB_DIR) && pnpm lhci || true

quality:
	$(MAKE) prisma-format prisma-validate typecheck lint format-check a11y lhci

check:
	$(MAKE) prisma-format prisma-validate typecheck lint test

ci:
	cd $(WEB_DIR) && pnpm prisma:format || true
	cd $(WEB_DIR) && pnpm prisma:validate || true
	cd $(WEB_DIR) && pnpm typecheck
	cd $(WEB_DIR) && pnpm lint
	cd $(WEB_DIR) && pnpm test
	cd $(WEB_DIR) && pnpm e2e --reporter=line || true
	cd $(WEB_DIR) && pnpm lhci || true

start:
	docker compose up -d
	$(MAKE) prisma-migrate prisma-seed || true
	$(MAKE) dev

stop:
	docker compose down -v


