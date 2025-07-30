"""Configuration management for the Daily Alert Summary Agent.

Handles environment variables, YAML configuration files, and Pydantic settings validation
with precedence: CLI > ENV > YAML > code defaults.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from pydantic import Field, HttpUrl, validator
from pydantic_settings import BaseSettings

from .constants import (
    DEFAULT_CONFIG,
    DEFAULT_LOG_LEVEL,
    DEFAULT_LOOKBACK_HOURS,
    DEFAULT_SCHEDULE_TIME,
    DEFAULT_TIMEZONE,
    EnvVars,
)
from .exceptions import ConfigurationError


class GrafanaConfig(BaseSettings):
    """Grafana MCP configuration."""

    base_url: HttpUrl = Field(..., description="Grafana MCP base URL")
    token: str = Field(..., description="Grafana MCP authentication token")
    org_id: Optional[str] = Field(None, description="Grafana organization ID")
    timeout_seconds: int = Field(30, description="Request timeout in seconds")
    retry_attempts: int = Field(3, description="Number of retry attempts")
    lookback_hours: int = Field(DEFAULT_LOOKBACK_HOURS, description="Hours to look back for alerts")

    class Config:
        env_prefix = "GRAFANA_MCP_"
        case_sensitive = False

    @validator("base_url")
    def validate_base_url(cls, v: HttpUrl) -> str:
        """Ensure base URL doesn't end with slash."""
        return str(v).rstrip("/")

    @validator("token")
    def validate_token(cls, v: str) -> str:
        """Ensure token is not empty."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Grafana token cannot be empty")
        return v.strip()


class SlackConfig(BaseSettings):
    """Slack API configuration."""

    bot_token: str = Field(..., description="Slack bot token")
    channel_id: str = Field(..., description="Default Slack channel ID")
    timeout_seconds: int = Field(20, description="Request timeout in seconds")
    max_message_length: int = Field(4000, description="Maximum message length")
    thread_replies: bool = Field(False, description="Use threaded replies for long messages")
    retry_attempts: int = Field(3, description="Number of retry attempts")

    class Config:
        env_prefix = "SLACK_"
        case_sensitive = False

    @validator("bot_token")
    def validate_bot_token(cls, v: str) -> str:
        """Validate Slack bot token format."""
        if not v.startswith("xoxb-"):
            raise ValueError("Slack bot token must start with 'xoxb-'")
        return v

    @validator("channel_id")
    def validate_channel_id(cls, v: str) -> str:
        """Validate Slack channel ID format."""
        if not v or len(v) < 9:
            raise ValueError("Invalid Slack channel ID format")
        return v


class AIConfig(BaseSettings):
    """AI processing configuration."""

    openrouter_api_key: str = Field(..., description="OpenRouter API key")
    model: str = Field("anthropic/claude-3.5-sonnet", description="AI model to use")
    max_tokens: int = Field(4000, description="Maximum tokens for AI responses")
    temperature: float = Field(0.1, description="AI temperature (0.0-1.0)")
    timeout_seconds: int = Field(120, description="AI request timeout")
    enabled: bool = Field(True, description="Whether AI processing is enabled")

    class Config:
        env_prefix = "OPENROUTER_"
        case_sensitive = False

    @validator("temperature")
    def validate_temperature(cls, v: float) -> float:
        """Ensure temperature is between 0 and 1."""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Temperature must be between 0.0 and 1.0")
        return v

    @validator("max_tokens")
    def validate_max_tokens(cls, v: int) -> int:
        """Ensure max_tokens is reasonable."""
        if v < 100 or v > 10000:
            raise ValueError("max_tokens must be between 100 and 10000")
        return v


class SchedulerConfig(BaseSettings):
    """Scheduler configuration."""

    time: str = Field(DEFAULT_SCHEDULE_TIME, description="Daily execution time (HH:MM)")
    timezone: str = Field(DEFAULT_TIMEZONE, description="Timezone for scheduling")
    enabled: bool = Field(True, description="Whether scheduler is enabled")
    max_execution_minutes: int = Field(15, description="Maximum execution time in minutes")

    class Config:
        env_prefix = "ALERT_AGENT_"
        case_sensitive = False

    @validator("time")
    def validate_time_format(cls, v: str) -> str:
        """Validate time format HH:MM."""
        try:
            hours, minutes = v.split(":")
            hour_int = int(hours)
            minute_int = int(minutes)
            if not (0 <= hour_int <= 23) or not (0 <= minute_int <= 59):
                raise ValueError()
        except (ValueError, AttributeError):
            raise ValueError("Time must be in HH:MM format (24-hour)")
        return v

    @validator("timezone")
    def validate_timezone(cls, v: str) -> str:
        """Validate timezone string."""
        try:
            import zoneinfo

            zoneinfo.ZoneInfo(v)
        except Exception:
            raise ValueError(f"Invalid timezone: {v}")
        return v


class LoggingConfig(BaseSettings):
    """Logging configuration."""

    level: str = Field(DEFAULT_LOG_LEVEL, description="Log level")
    file: Optional[str] = Field(None, description="Log file path")
    format: str = Field(
        "%(asctime)s | %(levelname)8s | %(name)s | %(message)s", description="Log format string"
    )
    rotation_size: str = Field("10 MB", description="Log rotation size")
    retention_days: int = Field(30, description="Log retention in days")

    class Config:
        env_prefix = "ALERT_AGENT_"
        case_sensitive = False

    @validator("level")
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of: {', '.join(valid_levels)}")
        return v.upper()


class FeatureFlags(BaseSettings):
    """Feature flag configuration."""

    ai_grouping: bool = Field(True, description="Enable AI alert grouping")
    summary_refinement: bool = Field(True, description="Enable AI summary refinement")
    slack_threading: bool = Field(False, description="Use Slack message threading")
    advanced_filtering: bool = Field(True, description="Enable advanced alert filtering")
    metric_collection: bool = Field(False, description="Enable metrics collection")

    class Config:
        env_prefix = "ENABLE_"
        case_sensitive = False


class AppConfig(BaseSettings):
    """Main application configuration combining all sub-configurations."""

    # Application metadata
    name: str = Field("daily-alert-summary-agent", description="Application name")
    version: str = Field("0.1.0", description="Application version")
    environment: str = Field("development", description="Environment (dev/staging/prod)")
    debug: bool = Field(False, description="Enable debug mode")

    # Sub-configurations
    grafana: Optional[GrafanaConfig] = None
    slack: Optional[SlackConfig] = None
    ai: Optional[AIConfig] = None
    scheduler: Optional[SchedulerConfig] = None
    logging: Optional[LoggingConfig] = None
    features: Optional[FeatureFlags] = None

    class Config:
        env_prefix = "ALERT_AGENT_"
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        validate_assignment = True

    @validator("environment")
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        valid_envs = ["development", "staging", "production"]
        if v.lower() not in valid_envs:
            raise ValueError(f"Environment must be one of: {', '.join(valid_envs)}")
        return v.lower()

    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"

    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == "development"

    def __init__(self, **data: Any) -> None:
        """Initialize configuration with sub-configs."""
        super().__init__(**data)

        # Initialize sub-configurations if they weren't provided
        if self.grafana is None:
            self.grafana = GrafanaConfig()  # type: ignore[call-arg]
        if self.slack is None:
            self.slack = SlackConfig()  # type: ignore[call-arg]
        if self.ai is None:
            self.ai = AIConfig()  # type: ignore[call-arg]
        if self.scheduler is None:
            self.scheduler = SchedulerConfig()  # type: ignore[call-arg]
        if self.logging is None:
            self.logging = LoggingConfig()  # type: ignore[call-arg]
        if self.features is None:
            self.features = FeatureFlags()  # type: ignore[call-arg]


# Global configuration instance
_config: Optional[AppConfig] = None


def load_config(env_file: Optional[Union[str, Path]] = None, reload: bool = False) -> AppConfig:
    """Load and validate application configuration.

    Args:
        env_file: Optional path to .env file
        reload: Force reload configuration

    Returns:
        Validated configuration object

    Raises:
        ConfigurationError: If configuration is invalid or missing required values
    """
    global _config

    if _config is not None and not reload:
        return _config

    try:
        # Set up environment file if provided
        if env_file:
            env_path = Path(env_file)
            if not env_path.exists():
                raise ConfigurationError(f"Environment file not found: {env_file}")

        # Load configuration with automatic environment variable detection
        _config = AppConfig()

        return _config

    except Exception as e:
        if isinstance(e, ConfigurationError):
            raise
        raise ConfigurationError(f"Failed to load configuration: {str(e)}")


def get_config() -> AppConfig:
    """Get the current configuration instance.

    Returns:
        Current configuration object

    Raises:
        ConfigurationError: If configuration has not been loaded
    """
    if _config is None:
        raise ConfigurationError("Configuration not loaded. Call load_config() first.")
    return _config


def validate_config(config: Optional[AppConfig] = None) -> List[str]:
    """Validate configuration and return any issues found.

    Args:
        config: Configuration to validate (uses current if None)

    Returns:
        List of validation errors (empty if valid)
    """
    if config is None:
        config = get_config()

    errors = []

    # Check required environment variables
    required_env_vars = [
        (EnvVars.GRAFANA_BASE_URL, "Grafana MCP base URL"),
        (EnvVars.GRAFANA_TOKEN, "Grafana MCP token"),
        (EnvVars.SLACK_BOT_TOKEN, "Slack bot token"),
        (EnvVars.SLACK_CHANNEL_ID, "Slack channel ID"),
        (EnvVars.OPENROUTER_API_KEY, "OpenRouter API key"),
    ]

    for env_var, description in required_env_vars:
        if not os.getenv(env_var):
            errors.append(f"Missing required environment variable: {env_var} ({description})")

    # Additional validation logic can be added here

    return errors


def create_default_env_file(path: Union[str, Path] = ".env") -> None:
    """Create a default .env file with all required variables.

    Args:
        path: Path where to create the .env file
    """
    env_template = f"""# Daily Alert Summary Agent Configuration

# Application settings
ALERT_AGENT_ENVIRONMENT=development
ALERT_AGENT_LOG_LEVEL=INFO
ALERT_AGENT_DEBUG=false

# Grafana MCP Configuration
GRAFANA_MCP_BASE_URL=https://your-grafana-instance.com
GRAFANA_MCP_TOKEN=your_grafana_token_here
GRAFANA_MCP_ORG_ID=1
GRAFANA_MCP_TIMEOUT_SECONDS=30
GRAFANA_MCP_LOOKBACK_HOURS={DEFAULT_LOOKBACK_HOURS}

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
SLACK_CHANNEL_ID=C1234567890
SLACK_TIMEOUT_SECONDS=20
SLACK_THREAD_REPLIES=false

# AI/OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_MAX_TOKENS=4000

# Scheduler Configuration
ALERT_AGENT_SCHEDULE_TIME={DEFAULT_SCHEDULE_TIME}
ALERT_AGENT_TIMEZONE={DEFAULT_TIMEZONE}

# Feature Flags
ENABLE_AI_GROUPING=true
ENABLE_SUMMARY_REFINEMENT=true
ENABLE_SLACK_THREADING=false
ENABLE_ADVANCED_FILTERING=true
ENABLE_METRIC_COLLECTION=false
"""

    Path(path).write_text(env_template)


# Convenience functions for common configuration access
def get_grafana_config() -> GrafanaConfig:
    """Get Grafana configuration."""
    config = get_config()
    if config.grafana is None:
        raise ConfigurationError("Grafana configuration not initialized")
    return config.grafana


def get_slack_config() -> SlackConfig:
    """Get Slack configuration."""
    config = get_config()
    if config.slack is None:
        raise ConfigurationError("Slack configuration not initialized")
    return config.slack


def get_ai_config() -> AIConfig:
    """Get AI configuration."""
    config = get_config()
    if config.ai is None:
        raise ConfigurationError("AI configuration not initialized")
    return config.ai


def get_scheduler_config() -> SchedulerConfig:
    """Get scheduler configuration."""
    config = get_config()
    if config.scheduler is None:
        raise ConfigurationError("Scheduler configuration not initialized")
    return config.scheduler
