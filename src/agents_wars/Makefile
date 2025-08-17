SHELL := /bin/bash

# Root-level orchestrator for the web app under ./web

WEB_DIR := web

.PHONY: install dev build typecheck lint lint-fix format format-check test test-watch \
        e2e e2e-headed prisma-format prisma-validate prisma-migrate prisma-seed prisma-studio \
        a11y lhci check ci

install:
	cd $(WEB_DIR) && npm install
	git config core.hooksPath .githooks || true
	chmod +x .githooks/pre-commit || true

dev:
	cd $(WEB_DIR) && npm run dev

build:
	cd $(WEB_DIR) && npm run build

typecheck:
	cd $(WEB_DIR) && npm run typecheck

lint:
	cd $(WEB_DIR) && npm run lint

lint-fix:
	cd $(WEB_DIR) && npm run lint:fix

format:
	cd $(WEB_DIR) && npm run format

format-check:
	cd $(WEB_DIR) && npm run format:check

test:
	cd $(WEB_DIR) && npm run test

test-watch:
	cd $(WEB_DIR) && npm run test:watch

e2e:
	cd $(WEB_DIR) && npm run e2e

e2e-headed:
	cd $(WEB_DIR) && npm run e2e:headed

prisma-format:
	cd $(WEB_DIR) && npm run prisma:format || true

prisma-validate:
	cd $(WEB_DIR) && npm run prisma:validate || true

prisma-migrate:
	cd $(WEB_DIR) && npm run prisma:migrate || true

prisma-seed:
	cd $(WEB_DIR) && npm run prisma:seed || true

prisma-studio:
	cd $(WEB_DIR) && npm run prisma:studio || true

a11y:
	cd $(WEB_DIR) && npm run a11y || true

lhci:
	cd $(WEB_DIR) && npm run lhci || true

quality:
	$(MAKE) prisma-format prisma-validate typecheck lint format-check a11y lhci

check:
	$(MAKE) prisma-format prisma-validate typecheck lint test

ci:
	cd $(WEB_DIR) && npm run prisma:format || true
	cd $(WEB_DIR) && npm run prisma:validate || true
	cd $(WEB_DIR) && npm run typecheck
	cd $(WEB_DIR) && npm run lint
	cd $(WEB_DIR) && npm run test
	cd $(WEB_DIR) && npm run e2e --reporter=line || true
	cd $(WEB_DIR) && npm run lhci || true

start:
	$(MAKE) prisma-migrate prisma-seed || true
	$(MAKE) dev

stop:
	@echo "No docker in this setup."


