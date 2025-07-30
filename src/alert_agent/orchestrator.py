"""Unified orchestrator for the Daily Alert Summary Agent.

Glues scheduler, collector, AI processor, summary generator and notifier 
into a cohesive async workflow.
"""


async def run_daily():
    """Execute the complete daily alert processing pipeline.
    
    Orchestrates the full workflow:
    1. Collect alerts from Grafana MCP
    2. Process and group alerts with AI
    3. Generate markdown summary
    4. Send notification to Slack
    """
    pass


async def run_now():
    """Run the daily pipeline immediately for testing.
    
    Bypasses scheduler and executes the complete workflow once.
    """
    pass


def start_scheduler():
    """Start the daily scheduler with proper signal handling.
    
    Configures APScheduler and starts the event loop with graceful shutdown.
    """
    pass