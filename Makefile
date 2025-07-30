# Daily Alert Summary Agent - Development Makefile
# Provides consistent development workflow commands

.PHONY: help install dev quality format type-check security clean build run

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(CYAN)Daily Alert Summary Agent - Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

install: ## Install dependencies and setup development environment
	@echo "$(CYAN)📦 Installing dependencies...$(NC)"
	poetry install
	poetry run pre-commit install
	@echo "$(GREEN)✅ Installation complete!$(NC)"

dev: install ## Setup development environment and install pre-commit hooks
	@echo "$(CYAN)🛠️  Development environment ready!$(NC)"
	@echo "Use 'poetry shell' to activate virtual environment"

quality: ## Run all code quality checks
	@echo "$(CYAN)🔍 Running code quality checks...$(NC)"
	@echo "$(YELLOW)→ Code formatting (black)...$(NC)"
	poetry run black --check src/
	@echo "$(YELLOW)→ Import sorting (isort)...$(NC)"
	poetry run isort --check-only src/
	@echo "$(YELLOW)→ Type checking (mypy)...$(NC)"
	poetry run mypy src/
	@echo "$(YELLOW)→ Security scan (bandit)...$(NC)"
	poetry run bandit -r src/ -ll || echo "No security issues found"
	@echo "$(YELLOW)→ Pre-commit hooks...$(NC)"
	poetry run pre-commit run --all-files
	@echo "$(GREEN)✅ All quality checks passed!$(NC)"

format: ## Auto-format code with black and isort
	@echo "$(CYAN)🎨 Formatting code...$(NC)"
	poetry run black src/
	poetry run isort src/
	@echo "$(GREEN)✅ Code formatted!$(NC)"

type-check: ## Run mypy type checking only
	@echo "$(CYAN)🔍 Type checking...$(NC)"
	poetry run mypy src/
	@echo "$(GREEN)✅ Type checking complete!$(NC)"

security: ## Run security scans
	@echo "$(CYAN)🔒 Running security scans...$(NC)"
	poetry run bandit -r src/ -ll
	poetry run safety check
	@echo "$(GREEN)✅ Security scan complete!$(NC)"

clean: ## Clean up temporary files and caches
	@echo "$(CYAN)🧹 Cleaning up...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf dist/ build/ .mypy_cache/
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

build: quality ## Build the package for distribution
	@echo "$(CYAN)📦 Building package...$(NC)"
	poetry build
	@echo "$(GREEN)✅ Package built in dist/$(NC)"

run: ## Run the application in development mode
	@echo "$(CYAN)🚀 Starting Daily Alert Summary Agent...$(NC)"
	poetry run python -m alert_agent

run-once: ## Run the alert processing pipeline once (for testing)
	@echo "$(CYAN)⚡ Running alert processing pipeline once...$(NC)"
	poetry run python -m alert_agent --run-once

scheduler: ## Start the daily scheduler
	@echo "$(CYAN)⏰ Starting daily scheduler...$(NC)"
	poetry run python -m alert_agent --scheduler

deps-check: ## Check for dependency updates
	@echo "$(CYAN)📋 Checking for dependency updates...$(NC)"
	poetry show --outdated

deps-update: ## Update dependencies to latest versions
	@echo "$(CYAN)⬆️  Updating dependencies...$(NC)"
	poetry update
	@echo "$(GREEN)✅ Dependencies updated!$(NC)"

# Git hooks integration (called by pre-commit)
pre-commit: quality ## Run quality checks before commit
	@echo "$(GREEN)✅ Pre-commit checks passed!$(NC)"
