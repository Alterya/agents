"""Daily Alert Summary Agent.

A Python application that collects, processes, and summarizes alerts from Grafana MCP,
then delivers intelligent summaries via Slack notifications.
"""

__version__ = "0.1.0"
__author__ = "Daily Alert Team"

__all__ = [
    "config",
    "scheduler",
    "collector",
    "ai_processor",
    "summary",
    "notifier",
    "orchestrator",
]
