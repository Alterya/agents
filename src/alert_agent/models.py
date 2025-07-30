"""Data models for the Daily Alert Summary Agent.

This module contains Pydantic models for data validation and serialization
across the alert processing pipeline.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl, validator


class AlertSeverity(str, Enum):
    """Alert severity levels from Grafana."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, Enum):
    """Alert status from Grafana."""

    FIRING = "firing"
    RESOLVED = "resolved"
    PENDING = "pending"
    INACTIVE = "inactive"


class GrafanaLabel(BaseModel):
    """A single label from Grafana alert."""

    name: str = Field(..., description="Label name")
    value: str = Field(..., description="Label value")


class GrafanaAnnotation(BaseModel):
    """Grafana alert annotation."""

    key: str = Field(..., description="Annotation key")
    value: str = Field(..., description="Annotation value")


class Alert(BaseModel):
    """Represents a single alert from Grafana MCP."""

    id: str = Field(..., description="Unique alert identifier")
    title: str = Field(..., description="Alert title/summary")
    description: Optional[str] = Field(None, description="Detailed alert description")
    severity: AlertSeverity = Field(..., description="Alert severity level")
    status: AlertStatus = Field(..., description="Current alert status")
    source: str = Field(..., description="Alert source system")
    timestamp: datetime = Field(..., description="Alert timestamp")
    labels: List[GrafanaLabel] = Field(default_factory=list, description="Alert labels")
    annotations: List[GrafanaAnnotation] = Field(
        default_factory=list, description="Alert annotations"
    )
    dashboard_url: Optional[HttpUrl] = Field(None, description="Link to related dashboard")
    raw_data: Dict[str, Any] = Field(
        default_factory=dict, description="Raw alert data from Grafana"
    )

    @validator("timestamp", pre=True)
    def parse_timestamp(cls, v: Any) -> datetime:
        """Parse various timestamp formats from Grafana."""
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except ValueError:
                return datetime.fromisoformat(v)
        if isinstance(v, datetime):
            return v
        raise ValueError(f"Cannot parse timestamp from {type(v)}: {v}")

    @property
    def service_name(self) -> Optional[str]:
        """Extract service name from labels."""
        for label in self.labels:
            if label.name in ["service_name", "service", "job"]:
                return label.value
        return None

    @property
    def environment(self) -> Optional[str]:
        """Extract environment from labels."""
        for label in self.labels:
            if label.name in ["environment", "env", "stage"]:
                return label.value
        return None


class AlertGroup(BaseModel):
    """A group of related alerts identified by AI."""

    id: str = Field(..., description="Unique group identifier")
    title: str = Field(..., description="Group title/theme")
    summary: str = Field(..., description="AI-generated group summary")
    severity: AlertSeverity = Field(..., description="Highest severity in group")
    alert_count: int = Field(..., description="Number of alerts in group")
    alerts: List[Alert] = Field(..., description="Alerts in this group")
    keywords: List[str] = Field(default_factory=list, description="Key terms for this group")
    affected_services: List[str] = Field(
        default_factory=list, description="Services affected by alerts"
    )

    @validator("severity", pre=True, always=True)
    def determine_group_severity(cls, v: Any, values: Dict[str, Any]) -> AlertSeverity:
        """Determine group severity from alerts."""
        if "alerts" in values and values["alerts"]:
            severity_order = ["critical", "high", "medium", "low", "info"]
            highest_severity = "info"
            for alert in values["alerts"]:
                if isinstance(alert, Alert):
                    alert_severity = alert.severity.value
                    if severity_order.index(alert_severity) < severity_order.index(
                        highest_severity
                    ):
                        highest_severity = alert_severity
            return AlertSeverity(highest_severity)
        # If v is already an AlertSeverity, return it
        if isinstance(v, AlertSeverity):
            return v
        # If v is a string, convert it to AlertSeverity
        if isinstance(v, str):
            return AlertSeverity(v)
        # Default fallback
        return AlertSeverity.INFO


class GroupedAlerts(BaseModel):
    """Complete result from AI alert grouping."""

    groups: List[AlertGroup] = Field(..., description="Alert groups")
    total_alerts: int = Field(..., description="Total number of alerts processed")
    processing_timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="When grouping was performed"
    )
    ai_model_used: str = Field(..., description="AI model used for grouping")
    execution_time_seconds: Optional[float] = Field(
        None, description="Time taken for AI processing"
    )

    @property
    def critical_groups(self) -> List[AlertGroup]:
        """Get only critical severity groups."""
        return [group for group in self.groups if group.severity == AlertSeverity.CRITICAL]

    @property
    def high_priority_groups(self) -> List[AlertGroup]:
        """Get critical and high severity groups."""
        return [
            group
            for group in self.groups
            if group.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]
        ]


class SummarySection(BaseModel):
    """A section of the markdown summary."""

    title: str = Field(..., description="Section title")
    content: str = Field(..., description="Section content in markdown")
    priority: int = Field(default=0, description="Display priority (higher = more important)")


class AlertSummary(BaseModel):
    """Generated markdown summary of grouped alerts."""

    title: str = Field(..., description="Summary title")
    executive_summary: str = Field(..., description="Executive overview")
    sections: List[SummarySection] = Field(..., description="Summary sections")
    action_items: List[str] = Field(default_factory=list, description="Recommended actions")
    total_alerts: int = Field(..., description="Total alerts summarized")
    critical_count: int = Field(..., description="Count of critical alerts")
    high_count: int = Field(..., description="Count of high priority alerts")
    generated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Summary generation time"
    )
    estimated_read_time_minutes: int = Field(default=1, description="Estimated reading time")

    def to_markdown(self) -> str:
        """Convert summary to markdown format."""
        lines = [
            f"# {self.title}",
            "",
            f"📊 **Summary**: {self.total_alerts} alerts ({self.critical_count} critical, {self.high_count} high priority)",
            f"⏱️ **Generated**: {self.generated_at.strftime('%Y-%m-%d %H:%M UTC')} (Est. {self.estimated_read_time_minutes}min read)",
            "",
            "## Executive Summary",
            self.executive_summary,
            "",
        ]

        # Add sections sorted by priority
        sorted_sections = sorted(self.sections, key=lambda x: x.priority, reverse=True)
        for section in sorted_sections:
            lines.extend([f"## {section.title}", section.content, ""])

        # Add action items
        if self.action_items:
            lines.extend(["## Action Items", ""])
            for item in self.action_items:
                lines.append(f"- {item}")
            lines.append("")

        return "\n".join(lines)


class SlackMessage(BaseModel):
    """Slack message configuration and metadata."""

    channel: str = Field(..., description="Slack channel ID")
    text: str = Field(..., description="Message text")
    thread_ts: Optional[str] = Field(None, description="Thread timestamp for replies")
    blocks: Optional[List[Dict[str, Any]]] = Field(None, description="Slack block kit elements")

    class Config:
        arbitrary_types_allowed = True


class SlackResponse(BaseModel):
    """Response from Slack API."""

    ok: bool = Field(..., description="Whether the request was successful")
    channel: str = Field(..., description="Channel where message was posted")
    ts: str = Field(..., description="Message timestamp")
    message: Optional[Dict[str, Any]] = Field(None, description="Full message object")
    error: Optional[str] = Field(None, description="Error message if failed")

    @property
    def is_success(self) -> bool:
        """Check if the Slack API call was successful."""
        return self.ok and self.error is None


class ProcessingResult(BaseModel):
    """Complete result of the daily alert processing pipeline."""

    execution_id: str = Field(..., description="Unique execution identifier")
    started_at: datetime = Field(..., description="Pipeline start time")
    completed_at: Optional[datetime] = Field(None, description="Pipeline completion time")
    status: str = Field(default="running", description="Execution status")
    alerts_collected: int = Field(default=0, description="Number of alerts collected")
    groups_created: int = Field(default=0, description="Number of alert groups created")
    summary_generated: bool = Field(default=False, description="Whether summary was generated")
    slack_sent: bool = Field(default=False, description="Whether Slack notification was sent")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    grouped_alerts: Optional[GroupedAlerts] = Field(None, description="AI-grouped alerts")
    summary: Optional[AlertSummary] = Field(None, description="Generated summary")
    slack_response: Optional[SlackResponse] = Field(None, description="Slack API response")

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate execution duration."""
        if self.completed_at and self.started_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

    @property
    def is_successful(self) -> bool:
        """Check if the entire pipeline was successful."""
        return (
            self.status == "completed"
            and self.summary_generated
            and self.slack_sent
            and self.error_message is None
        )


class HealthCheck(BaseModel):
    """Health check response model."""

    status: str = Field(..., description="Health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    version: str = Field(..., description="Application version")
    dependencies: Dict[str, bool] = Field(
        default_factory=dict, description="Dependency health status"
    )
    uptime_seconds: Optional[float] = Field(None, description="Application uptime")
