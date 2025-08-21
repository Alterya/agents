SHELL := /bin/bash

WEB_DIR := src/agents_wars

.PHONY: install dev build typecheck lint lint-fix format format-check test test-watch \
        e2e e2e-headed a11y lhci quality start stop install-playwright

install:
	poetry install
	$(MAKE) -C $(WEB_DIR) install
	cd $(WEB_DIR)/web && npx playwright install chromium || true

dev:
	$(MAKE) -C $(WEB_DIR) dev

build:
	$(MAKE) -C $(WEB_DIR) build

typecheck:
	$(MAKE) -C $(WEB_DIR) typecheck

lint:
	$(MAKE) -C $(WEB_DIR) lint

lint-fix:
	$(MAKE) -C $(WEB_DIR) lint-fix

format:
	$(MAKE) -C $(WEB_DIR) format

format-check:
	$(MAKE) -C $(WEB_DIR) format-check

test:
	$(MAKE) -C $(WEB_DIR) test

test-watch:
	$(MAKE) -C $(WEB_DIR) test-watch

e2e:
	$(MAKE) -C $(WEB_DIR) e2e

e2e-headed:
	$(MAKE) -C $(WEB_DIR) e2e-headed

a11y:
	$(MAKE) -C $(WEB_DIR) a11y || true

lhci:
	$(MAKE) -C $(WEB_DIR) lhci || true

quality:
	$(MAKE) -C $(WEB_DIR) quality

start:
	$(MAKE) install
	$(MAKE) -C $(WEB_DIR) start

stop:
	$(MAKE) -C $(WEB_DIR) stop

# Backward-compat helper: keep a target to install Playwright quickly
install-playwright:
	poetry install
	cd $(WEB_DIR)/web && npm install --no-fund --no-audit
	cd $(WEB_DIR)/web && npx playwright install chromium

