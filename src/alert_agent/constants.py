"""Constants and configuration values for the Daily Alert Summary Agent.

This module centralizes all magic numbers, strings, and configuration constants
used throughout the application.
"""

from enum import Enum
from typing import Dict, List

# Application metadata
APP_NAME = "daily-alert-summary-agent"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = "Daily Alert Summary Agent for Grafana to Slack notifications"

# Timing constants
DEFAULT_SCHEDULE_TIME = "10:00"  # 10:00 AM
DEFAULT_TIMEZONE = "Asia/Jerusalem"
DEFAULT_LOOKBACK_HOURS = 24
SCHEDULER_CHECK_INTERVAL_SECONDS = 30
MAX_EXECUTION_TIME_MINUTES = 15

# HTTP timeouts and retries
DEFAULT_HTTP_TIMEOUT_SECONDS = 30
GRAFANA_TIMEOUT_SECONDS = 45
SLACK_TIMEOUT_SECONDS = 20
OPENROUTER_TIMEOUT_SECONDS = 120
MAX_RETRY_ATTEMPTS = 3
RETRY_BASE_DELAY_SECONDS = 1
RETRY_MAX_DELAY_SECONDS = 60

# Rate limiting
GRAFANA_REQUESTS_PER_MINUTE = 30
SLACK_MESSAGES_PER_MINUTE = 10
OPENROUTER_REQUESTS_PER_MINUTE = 20

# Message size limits
SLACK_MAX_MESSAGE_LENGTH = 4000
SLACK_MAX_BLOCKS = 50
SUMMARY_MAX_LENGTH = 3500  # Leave room for headers
ALERT_DESCRIPTION_MAX_LENGTH = 500

# AI Processing constants
CLAUDE_MODEL_NAME = "anthropic/claude-3.5-sonnet"
DEFAULT_AI_MAX_TOKENS = 4000
AI_TEMPERATURE = 0.1  # Low temperature for consistent results
MAX_ALERTS_PER_AI_REQUEST = 100
MIN_ALERTS_FOR_GROUPING = 2

# Alert processing
MIN_ALERT_SEVERITY_LEVEL = "info"
CRITICAL_ALERT_KEYWORDS = [
    "down",
    "failed",
    "error",
    "critical",
    "emergency",
    "outage",
    "unavailable",
    "timeout",
    "crashed",
]
HIGH_PRIORITY_SERVICES = ["api", "database", "payment", "auth", "core"]

# File paths and directories
DEFAULT_LOG_FILE = "logs/alert_agent.log"
CONFIG_FILE_NAME = "alert_agent_config.yml"
CACHE_DIRECTORY = ".cache"
TEMP_DIRECTORY = ".tmp"

# Logging configuration
LOG_FORMAT = "%(asctime)s | %(levelname)8s | %(name)s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_LOG_LEVEL = "INFO"
LOG_ROTATION_SIZE = "10 MB"
LOG_RETENTION_DAYS = 30


# Environment variable names
class EnvVars:
    """Environment variable names."""

    # Core configuration
    LOG_LEVEL = "ALERT_AGENT_LOG_LEVEL"
    CONFIG_FILE = "ALERT_AGENT_CONFIG_FILE"
    ENVIRONMENT = "ALERT_AGENT_ENV"

    # Grafana MCP
    GRAFANA_BASE_URL = "GRAFANA_MCP_BASE_URL"
    GRAFANA_TOKEN = "GRAFANA_MCP_TOKEN"  # nosec B105 - env var name, not password
    GRAFANA_ORG_ID = "GRAFANA_MCP_ORG_ID"

    # Slack
    SLACK_BOT_TOKEN = "SLACK_BOT_TOKEN"  # nosec B105 - env var name, not password
    SLACK_CHANNEL_ID = "SLACK_CHANNEL_ID"
    SLACK_THREAD_REPLIES = "SLACK_THREAD_REPLIES"

    # AI/OpenRouter
    OPENROUTER_API_KEY = "OPENROUTER_API_KEY"
    OPENROUTER_MODEL = "OPENROUTER_MODEL"
    OPENROUTER_MAX_TOKENS = "OPENROUTER_MAX_TOKENS"

    # Scheduling
    SCHEDULE_TIME = "ALERT_AGENT_SCHEDULE_TIME"
    SCHEDULE_TIMEZONE = "ALERT_AGENT_TIMEZONE"
    LOOKBACK_HOURS = "ALERT_AGENT_LOOKBACK_HOURS"

    # Feature flags
    ENABLE_AI_PROCESSING = "ENABLE_AI_PROCESSING"
    ENABLE_SLACK_NOTIFICATIONS = "ENABLE_SLACK_NOTIFICATIONS"
    ENABLE_SUMMARY_REFINEMENT = "ENABLE_SUMMARY_REFINEMENT"


# API endpoints and paths
class APIEndpoints:
    """API endpoint path constants."""

    # Grafana MCP endpoints
    GRAFANA_ALERTS = "/api/v1/alerts"
    GRAFANA_HEALTH = "/api/health"
    GRAFANA_RULES = "/api/v1/rules"

    # Slack API endpoints
    SLACK_POST_MESSAGE = "chat.postMessage"
    SLACK_AUTH_TEST = "auth.test"
    SLACK_CONVERSATIONS_INFO = "conversations.info"

    # OpenRouter endpoints
    OPENROUTER_COMPLETIONS = "/api/v1/chat/completions"
    OPENROUTER_MODELS = "/api/v1/models"


# HTTP headers and content types
class HTTPHeaders:
    """Standard HTTP headers."""

    CONTENT_TYPE_JSON = "application/json"
    CONTENT_TYPE_TEXT = "text/plain"
    USER_AGENT = f"{APP_NAME}/{APP_VERSION}"
    ACCEPT_JSON = "application/json"


# Alert severity mappings
SEVERITY_WEIGHTS = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}

SEVERITY_EMOJIS = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "⚪"}

SEVERITY_COLORS = {
    "critical": "#FF0000",
    "high": "#FF8C00",
    "medium": "#FFD700",
    "low": "#0080FF",
    "info": "#808080",
}

# Summary templates and formatting
SUMMARY_TEMPLATE_SECTIONS = [
    "executive_summary",
    "critical_alerts",
    "high_priority_alerts",
    "service_impact",
    "recommendations",
    "detailed_breakdown",
]

MARKDOWN_FORMATTING = {
    "bold": "**",
    "italic": "_",
    "code": "`",
    "code_block": "```",
    "bullet": "- ",
    "numbered": "1. ",
}


# CLI command names and descriptions
class CLICommands:
    """CLI command definitions."""

    RUN_ONCE = "run-once"
    START_SCHEDULER = "scheduler"
    HEALTH_CHECK = "health"
    CONFIG_VALIDATE = "config-validate"
    TEST_SLACK = "test-slack"
    TEST_GRAFANA = "test-grafana"


# Status and state values
class ProcessingStatus:
    """Processing pipeline status values."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class HealthStatus:
    """Health check status values."""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


# Feature flags and toggles
class FeatureFlags:
    """Feature flag names."""

    AI_GROUPING = "ai_grouping"
    SUMMARY_REFINEMENT = "summary_refinement"
    SLACK_THREADING = "slack_threading"
    ADVANCED_FILTERING = "advanced_filtering"
    METRIC_COLLECTION = "metric_collection"


# Validation patterns and limits
EMAIL_PATTERN = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
URL_PATTERN = r"^https?://[^\s/$.?#].[^\s]*$"
SLACK_CHANNEL_PATTERN = r"^[A-Z0-9]{9,}$"
TIMEZONE_PATTERN = r"^[A-Za-z][A-Za-z0-9_+-/]*$"

MAX_ALERTS_PER_BATCH = 1000
MAX_SUMMARY_SECTIONS = 10
MAX_ACTION_ITEMS = 20
MAX_KEYWORDS_PER_GROUP = 10

# Cache and persistence
CACHE_TTL_SECONDS = 300  # 5 minutes
CACHE_MAX_SIZE_MB = 50
PERSISTENCE_RETRY_ATTEMPTS = 3

# Monitoring and metrics
METRICS_COLLECTION_INTERVAL = 60  # seconds
HEALTH_CHECK_INTERVAL = 30  # seconds
PERFORMANCE_THRESHOLD_MS = 1000


# Error messages
class ErrorMessages:
    """Standard error message templates."""

    CONFIG_MISSING = "Required configuration missing: {key}"
    API_CONNECTION_FAILED = "Failed to connect to {service}: {error}"
    AUTHENTICATION_FAILED = "Authentication failed for {service}"
    INVALID_DATA_FORMAT = "Invalid data format received from {source}"
    RATE_LIMIT_EXCEEDED = "Rate limit exceeded for {service}"
    TIMEOUT_EXCEEDED = "Operation timed out after {seconds} seconds"
    PROCESSING_FAILED = "Processing failed at stage: {stage}"


# Success messages
class SuccessMessages:
    """Standard success message templates."""

    ALERTS_COLLECTED = "Successfully collected {count} alerts"
    GROUPING_COMPLETED = "Alert grouping completed: {groups} groups created"
    SUMMARY_GENERATED = "Summary generated successfully"
    SLACK_SENT = "Slack notification sent to {channel}"
    PIPELINE_COMPLETED = "Processing pipeline completed in {duration}s"


# Default configuration values
DEFAULT_CONFIG = {
    "app": {
        "name": APP_NAME,
        "version": APP_VERSION,
        "log_level": DEFAULT_LOG_LEVEL,
        "environment": "development",
    },
    "scheduler": {"time": DEFAULT_SCHEDULE_TIME, "timezone": DEFAULT_TIMEZONE, "enabled": True},
    "grafana": {
        "timeout": GRAFANA_TIMEOUT_SECONDS,
        "retry_attempts": MAX_RETRY_ATTEMPTS,
        "lookback_hours": DEFAULT_LOOKBACK_HOURS,
    },
    "ai": {
        "model": CLAUDE_MODEL_NAME,
        "max_tokens": DEFAULT_AI_MAX_TOKENS,
        "temperature": AI_TEMPERATURE,
        "enabled": True,
    },
    "slack": {
        "timeout": SLACK_TIMEOUT_SECONDS,
        "max_message_length": SLACK_MAX_MESSAGE_LENGTH,
        "enabled": True,
    },
    "features": {
        "ai_grouping": True,
        "summary_refinement": True,
        "slack_threading": False,
        "advanced_filtering": True,
    },
}
