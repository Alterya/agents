.PHONY: install-playwright

NPM_CACHE_DIR := .npm-cache

install-playwright:
	poetry install
	mkdir -p $(NPM_CACHE_DIR)
	NPM_CONFIG_CACHE=$(NPM_CACHE_DIR) npm install --no-fund --no-audit
	NPM_CONFIG_CACHE=$(NPM_CACHE_DIR) npx playwright install chromium


