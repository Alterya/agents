"""Basic tests to verify the testing framework and package imports."""

import pytest


def test_package_import():
    """Test that the main package can be imported."""
    import alert_agent

    # Verify package has expected modules
    expected_modules = [
        "config",
        "scheduler",
        "collector",
        "ai_processor",
        "summary",
        "notifier",
        "orchestrator",
    ]

    assert alert_agent.__all__ == expected_modules


def test_individual_module_imports():
    """Test that all individual modules can be imported."""
    # These should all import without errors
    from alert_agent import (
        ai_processor,
        collector,
        config,
        notifier,
        orchestrator,
        scheduler,
        summary,
    )

    # Verify modules have the expected functions
    assert hasattr(config, "load_config")
    assert hasattr(scheduler, "start_scheduler")
    assert hasattr(scheduler, "run_once")
    assert hasattr(collector, "fetch_alerts")
    assert hasattr(ai_processor, "group_alerts")
    assert hasattr(summary, "render_summary")
    assert hasattr(notifier, "send_to_slack")
    assert hasattr(orchestrator, "run_daily")


def test_package_metadata():
    """Test package metadata is correct."""
    import alert_agent

    assert alert_agent.__version__ == "0.1.0"
    assert alert_agent.__author__ == "Daily Alert Team"


def test_placeholder_functions_callable():
    """Test that placeholder functions are callable (even if they do nothing)."""
    from alert_agent import config

    # This should not raise an exception
    result = config.load_config()
    assert result is None  # Our placeholder returns None
