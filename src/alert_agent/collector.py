"""Grafana MCP alert collector.

Implements async data collection that fetches previous 24h alerts from Grafana MCP
using httpx and returns normalized alert objects.
"""


async def fetch_alerts(lookback_hours: int = 24) -> None:
    """Fetch alerts from Grafana MCP for the specified lookback period.

    Args:
        lookback_hours: Number of hours to look back for alerts.

    Returns:
        List of normalized Alert objects.
    """
    pass


async def fetch_alert_page(since: str) -> None:
    """Fetch a single page of alerts since the given timestamp.

    Args:
        since: ISO timestamp to fetch alerts from.

    Returns:
        Raw alert data from Grafana MCP API.
    """
    pass
