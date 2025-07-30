"""Jerusalem-aware daily scheduler for alert processing.

Uses APScheduler to trigger orchestrator at 10:00 AM Asia/Jerusalem with DST correctness.
"""


async def start_scheduler() -> None:
    """Start the daily alert processing scheduler.

    Configures and starts APScheduler with Jerusalem timezone awareness.
    """
    pass


async def run_once() -> None:
    """Run the orchestrator immediately for testing purposes.

    Bypasses scheduler and executes alert processing pipeline once.
    """
    pass
