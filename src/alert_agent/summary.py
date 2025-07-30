"""Summary generator and formatter.

Creates human-readable markdown summaries including executive overview,
grouped details, and actionable items using Jinja2 templates.
"""


def render_summary(grouped_alerts):
    """Render grouped alerts into markdown summary.
    
    Args:
        grouped_alerts: GroupedAlerts object from AI processor.
        
    Returns:
        Formatted markdown summary string.
    """
    pass


def refine_with_claude(summary: str):
    """Optionally refine summary using Claude for better readability.
    
    Args:
        summary: Raw markdown summary to refine.
        
    Returns:
        Refined markdown summary.
    """
    pass


def check_slack_length(summary: str):
    """Check if summary exceeds Slack message limits and split if needed.
    
    Args:
        summary: The summary text to check.
        
    Returns:
        List of message parts for threading if needed.
    """
    pass