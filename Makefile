.PHONY: install-playwright

install-playwright:
	poetry install
	npm install --no-fund --no-audit
	npx playwright install chromium


