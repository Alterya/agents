# Daily Alert Summary Agent

A Python application that collects, processes, and summarizes alerts from Grafana MCP, then delivers intelligent summaries via Slack notifications.

## Requirements

- Python 3.10+
- Poetry for dependency management

## Setup

### 1. Install Dependencies

```bash
# Install Poetry if not already installed
curl -sSL https://install.python-poetry.org | python3 -

# Install project dependencies
poetry install
```

### 2. Environment Activation

```bash
# Activate the Poetry virtual environment
poetry shell

# OR run commands within the Poetry environment
poetry run <command>
```

### 3. Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
# Edit .env with your actual configuration values
```

Required environment variables:
- `GRAFANA_MCP_TOKEN` - Authentication token for Grafana MCP API
- `GRAFANA_MCP_BASE_URL` - Base URL for Grafana MCP instance
- `OPENROUTER_API_KEY` - API key for OpenRouter (Claude AI access)
- `SLACK_BOT_TOKEN` - Slack bot token for posting messages
- `SLACK_CHANNEL_ID` - Target Slack channel for alert summaries

### 4. Usage

```bash
# Run the alert processing pipeline once
poetry run alert-agent run-now

# Start the daily scheduler (runs at 10:00 AM Jerusalem time)
poetry run alert-agent start-scheduler
```

## Development

### Code Quality

```bash
# Format code
poetry run black src/ tests/

# Sort imports
poetry run isort src/ tests/

# Type checking
poetry run mypy src/

# Run tests
poetry run pytest

# Run all quality checks
poetry run pre-commit run --all-files
```

### Pre-commit Hooks

Install pre-commit hooks to ensure code quality:

```bash
poetry run pre-commit install
```

## Architecture

The application consists of several modules:

- **config.py** - Configuration management with environment variables
- **scheduler.py** - Jerusalem timezone-aware daily scheduling
- **collector.py** - Grafana MCP alert data collection
- **ai_processor.py** - OpenRouter Claude integration for alert grouping
- **summary.py** - Markdown summary generation with Jinja2
- **notifier.py** - Slack API integration with retry logic
- **orchestrator.py** - Main workflow coordination

## License

[Add your license here]
