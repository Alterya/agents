"""Daily Alert Summary Agent.

A Python application that collects, processes, and summarizes alerts from Grafana MCP,
then delivers intelligent summaries via Slack notifications.
"""

# Early initialization: Load environment variables before any other imports
from pathlib import Path

from dotenv import load_dotenv

# Load .env file at package import time to ensure environment variables
# are available before any configuration access
_env_file = Path.cwd() / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file, override=False)

__version__ = "0.1.0"
__author__ = "Daily Alert Team"

__all__ = [
    "config",
    "models",
    "exceptions",
    "constants",
    "scheduler",
    "collector",
    "ai_processor",
    "summary",
    "notifier",
    "orchestrator",
]
