"""Custom exceptions for the Daily Alert Summary Agent.

This module provides specific exception classes for different error scenarios
in the alert processing pipeline.
"""

from typing import Any, Dict, Optional


class AlertAgentError(Exception):
    """Base exception for all alert agent errors."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def __str__(self) -> str:
        if self.details:
            details_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            return f"{self.message} ({details_str})"
        return self.message


class ConfigurationError(AlertAgentError):
    """Raised when there are configuration-related errors."""

    def __init__(self, message: str, config_key: Optional[str] = None, **kwargs: Any) -> None:
        details = kwargs
        if config_key:
            details["config_key"] = config_key
        super().__init__(message, details)


class GrafanaError(AlertAgentError):
    """Base exception for Grafana MCP-related errors."""

    pass


class GrafanaConnectionError(GrafanaError):
    """Raised when unable to connect to Grafana MCP."""

    def __init__(
        self,
        message: str,
        endpoint: Optional[str] = None,
        status_code: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if endpoint:
            details["endpoint"] = endpoint
        if status_code:
            details["status_code"] = status_code
        super().__init__(message, details)


class GrafanaAuthenticationError(GrafanaError):
    """Raised when Grafana MCP authentication fails."""

    def __init__(
        self, message: str = "Authentication failed with Grafana MCP", **kwargs: Any
    ) -> None:
        super().__init__(message, kwargs)


class GrafanaDataError(GrafanaError):
    """Raised when Grafana returns invalid or unexpected data."""

    def __init__(
        self, message: str, response_data: Optional[Dict[str, Any]] = None, **kwargs: Any
    ) -> None:
        details = kwargs
        if response_data:
            details["response_data"] = str(response_data)[:500]  # Truncate for logging
        super().__init__(message, details)


class AIProcessingError(AlertAgentError):
    """Base exception for AI processing errors."""

    pass


class OpenRouterError(AIProcessingError):
    """Raised when OpenRouter API calls fail."""

    def __init__(
        self,
        message: str,
        model: Optional[str] = None,
        status_code: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if model:
            details["model"] = model
        if status_code:
            details["status_code"] = status_code
        super().__init__(message, details)


class ClaudeError(AIProcessingError):
    """Raised when Claude AI processing fails."""

    def __init__(self, message: str, prompt_length: Optional[int] = None, **kwargs: Any) -> None:
        details = kwargs
        if prompt_length:
            details["prompt_length"] = prompt_length
        super().__init__(message, details)


class AlertGroupingError(AIProcessingError):
    """Raised when alert grouping process fails."""

    def __init__(self, message: str, alert_count: Optional[int] = None, **kwargs: Any) -> None:
        details = kwargs
        if alert_count:
            details["alert_count"] = alert_count
        super().__init__(message, details)


class SummaryGenerationError(AlertAgentError):
    """Raised when summary generation fails."""

    def __init__(self, message: str, template: Optional[str] = None, **kwargs: Any) -> None:
        details = kwargs
        if template:
            details["template"] = template
        super().__init__(message, details)


class SlackError(AlertAgentError):
    """Base exception for Slack-related errors."""

    pass


class SlackConnectionError(SlackError):
    """Raised when unable to connect to Slack API."""

    def __init__(
        self,
        message: str,
        channel: Optional[str] = None,
        status_code: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if channel:
            details["channel"] = channel
        if status_code:
            details["status_code"] = status_code
        super().__init__(message, details)


class SlackAuthenticationError(SlackError):
    """Raised when Slack authentication fails."""

    def __init__(
        self, message: str = "Authentication failed with Slack API", **kwargs: Any
    ) -> None:
        super().__init__(message, kwargs)


class SlackMessageError(SlackError):
    """Raised when sending Slack messages fails."""

    def __init__(
        self,
        message: str,
        channel: Optional[str] = None,
        message_length: Optional[int] = None,
        slack_error_code: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if channel:
            details["channel"] = channel
        if message_length:
            details["message_length"] = message_length
        if slack_error_code:
            details["slack_error_code"] = slack_error_code
        super().__init__(message, details)


class SchedulerError(AlertAgentError):
    """Base exception for scheduler-related errors."""

    pass


class TimezoneError(SchedulerError):
    """Raised when timezone configuration is invalid."""

    def __init__(self, message: str, timezone: Optional[str] = None, **kwargs: Any) -> None:
        details = kwargs
        if timezone:
            details["timezone"] = timezone
        super().__init__(message, details)


class SchedulingError(SchedulerError):
    """Raised when scheduling operations fail."""

    def __init__(self, message: str, job_id: Optional[str] = None, **kwargs: Any) -> None:
        details = kwargs
        if job_id:
            details["job_id"] = job_id
        super().__init__(message, details)


class ValidationError(AlertAgentError):
    """Raised when data validation fails."""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        expected_type: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)[:100]  # Truncate for logging
        if expected_type:
            details["expected_type"] = expected_type
        super().__init__(message, details)


class RetryError(AlertAgentError):
    """Raised when retry attempts are exhausted."""

    def __init__(
        self,
        message: str,
        attempts: Optional[int] = None,
        last_error: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if attempts:
            details["attempts"] = attempts
        if last_error:
            details["last_error"] = last_error
        super().__init__(message, details)


class PipelineError(AlertAgentError):
    """Raised when the entire processing pipeline fails."""

    def __init__(
        self,
        message: str,
        stage: Optional[str] = None,
        execution_id: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if stage:
            details["stage"] = stage
        if execution_id:
            details["execution_id"] = execution_id
        super().__init__(message, details)


class RateLimitError(AlertAgentError):
    """Raised when API rate limits are exceeded."""

    def __init__(
        self,
        message: str,
        service: Optional[str] = None,
        retry_after: Optional[int] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if service:
            details["service"] = service
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(message, details)


class TimeoutError(AlertAgentError):
    """Raised when operations exceed timeout limits."""

    def __init__(
        self,
        message: str,
        timeout_seconds: Optional[float] = None,
        operation: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        details = kwargs
        if timeout_seconds:
            details["timeout_seconds"] = timeout_seconds
        if operation:
            details["operation"] = operation
        super().__init__(message, details)


# Convenience functions for common error scenarios


def grafana_connection_failed(
    endpoint: str, status_code: int, response: str = ""
) -> GrafanaConnectionError:
    """Create a standardized Grafana connection error."""
    return GrafanaConnectionError(
        f"Failed to connect to Grafana MCP endpoint",
        endpoint=endpoint,
        status_code=status_code,
        response=response[:200],
    )


def slack_send_failed(
    channel: str, error_message: str, message_length: int = 0
) -> SlackMessageError:
    """Create a standardized Slack send error."""
    return SlackMessageError(
        f"Failed to send message to Slack channel",
        channel=channel,
        error_message=error_message,
        message_length=message_length,
    )


def ai_processing_failed(
    model: str, error_message: str, alert_count: int = 0
) -> AlertGroupingError:
    """Create a standardized AI processing error."""
    return AlertGroupingError(
        f"AI alert grouping failed",
        model=model,
        error_message=error_message,
        alert_count=alert_count,
    )


def config_missing(key: str, description: str = "") -> ConfigurationError:
    """Create a standardized configuration missing error."""
    return ConfigurationError(
        f"Required configuration missing: {key}", config_key=key, description=description
    )
