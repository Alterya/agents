#!/usr/bin/env python3
"""CLI entry point for the Daily Alert Summary Agent.

This module provides a command-line interface for running the alert agent,
managing configuration, and performing manual operations.
"""

import asyncio
import sys
from functools import wraps
from pathlib import Path
from typing import Any, Callable, List, Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from . import __version__
from .config import AppConfig, create_default_env_file, get_config, load_config, validate_config
from .constants import DEFAULT_LOG_LEVEL
from .exceptions import AlertAgentError, ConfigurationError

console = Console()
console_err = Console(stderr=True)


def handle_errors(func: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to handle common CLI errors gracefully."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return func(*args, **kwargs)
        except ConfigurationError as e:
            console_err.print(f"[red]Configuration Error:[/red] {e.message}")
            if e.details:
                for key, value in e.details.items():
                    console_err.print(f"  {key}: {value}")
            sys.exit(1)
        except AlertAgentError as e:
            console_err.print(f"[red]Error:[/red] {e.message}")
            if hasattr(e, "details") and e.details:
                for key, value in e.details.items():
                    console_err.print(f"  {key}: {value}")
            sys.exit(1)
        except KeyboardInterrupt:
            console.print("\n[yellow]Operation cancelled by user[/yellow]")
            sys.exit(0)
        except Exception as e:
            console_err.print(f"[red]Unexpected error:[/red] {str(e)}")
            sys.exit(1)

    return wrapper


@click.group()
@click.version_option(version=__version__, prog_name="alert-agent")
@click.option(
    "--config",
    "-c",
    type=click.Path(exists=True),
    help="Path to configuration file",
)
@click.option(
    "--verbose",
    "-v",
    is_flag=True,
    help="Enable verbose output",
)
@click.pass_context
def cli(ctx: click.Context, config: Optional[str], verbose: bool) -> None:
    """Daily Alert Summary Agent - Intelligent alert processing and notification system."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    ctx.obj["config_path"] = config

    if verbose:
        console.print("[dim]Verbose mode enabled[/dim]")


@cli.command()
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show what would be done without actually running",
)
@click.option(
    "--force",
    is_flag=True,
    help="Force run even if scheduler is disabled",
)
@click.pass_context
@handle_errors
def run(ctx: click.Context, dry_run: bool, force: bool) -> None:
    """Run the daily alert summary collection and notification."""
    config_path = ctx.obj.get("config_path")
    verbose = ctx.obj.get("verbose", False)

    with console.status("[bold green]Loading configuration..."):
        config = load_config(config_path)

    if verbose:
        console.print(f"[dim]Loaded configuration from: {config_path or 'environment'}[/dim]")

    if config.scheduler is None or (not config.scheduler.enabled and not force):
        console.print("[yellow]Scheduler is disabled. Use --force to run anyway.[/yellow]")
        return

    if dry_run:
        console.print(
            "[bold blue]DRY RUN MODE - No actual operations will be performed[/bold blue]"
        )
        _show_run_preview(config)
        return

    console.print("[bold green]Starting Daily Alert Summary Agent...[/bold green]")

    # Import and run the main orchestrator
    try:
        from .orchestrator import run_daily_summary  # type: ignore[attr-defined]

        # Run the async function
        asyncio.run(run_daily_summary(config))
        console.print("[bold green]✅ Daily summary completed successfully![/bold green]")

    except ImportError:
        console.print("[red]Orchestrator module not found. Implementation pending.[/red]")
    except AttributeError:
        console.print("[red]run_daily_summary function not implemented yet.[/red]")


@cli.command()
@click.option(
    "--show-secrets",
    is_flag=True,
    help="Show sensitive configuration values (use with caution)",
)
@click.pass_context
@handle_errors
def config(ctx: click.Context, show_secrets: bool) -> None:
    """Show current configuration settings."""
    config_path = ctx.obj.get("config_path")

    with console.status("[bold blue]Loading configuration..."):
        config = load_config(config_path)

    console.print(_format_config_display(config, show_secrets=show_secrets))


@cli.command()
@click.option(
    "--output",
    "-o",
    type=click.Path(),
    default=".env",
    help="Output file path (default: .env)",
)
@click.option(
    "--force",
    is_flag=True,
    help="Overwrite existing file",
)
@handle_errors
def init_config(output: str, force: bool) -> None:
    """Create a default configuration file with environment variables."""
    output_path = Path(output)

    if output_path.exists() and not force:
        console.print(f"[yellow]File {output} already exists. Use --force to overwrite.[/yellow]")
        return

    try:
        create_default_env_file(output_path)
        console.print(f"[green]✅ Created configuration file: {output}[/green]")
        console.print("[dim]Please edit the file and add your API keys and settings.[/dim]")
    except Exception as e:
        console.print(f"[red]Failed to create config file: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.pass_context
@handle_errors
def validate(ctx: click.Context) -> None:
    """Validate the current configuration."""
    config_path = ctx.obj.get("config_path")

    with console.status("[bold blue]Validating configuration..."):
        config = load_config(config_path)
        issues = validate_config(config)

    if not issues:
        console.print("[bold green]✅ Configuration is valid![/bold green]")
    else:
        console.print("[bold red]❌ Configuration validation failed:[/bold red]")
        for issue in issues:
            console.print(f"  • {issue}")
        sys.exit(1)


@cli.command()
@click.option(
    "--lookback-hours",
    type=int,
    help="Override lookback hours for alert collection",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show what alerts would be collected without processing",
)
@click.pass_context
@handle_errors
def collect(ctx: click.Context, lookback_hours: Optional[int], dry_run: bool) -> None:
    """Manually collect and display alerts from Grafana."""
    config_path = ctx.obj.get("config_path")

    with console.status("[bold blue]Loading configuration..."):
        config = load_config(config_path)

    if config.grafana is None:
        console.print("[red]Grafana configuration not found[/red]")
        return

    if lookback_hours:
        config.grafana.lookback_hours = lookback_hours

    console.print(
        f"[bold blue]Collecting alerts from the last {config.grafana.lookback_hours} hours...[/bold blue]"
    )

    if dry_run:
        console.print("[dim]DRY RUN - Would collect alerts from Grafana MCP[/dim]")
        return

    # Import and run the collector
    try:
        from .collector import main as collect_alerts  # type: ignore[attr-defined]

        # Run the async function (placeholder)
        console.print("[green]✅ Collection functionality not implemented yet[/green]")

    except ImportError:
        console.print("[red]Collector module not found. Implementation pending.[/red]")


@cli.command()
@click.pass_context
@handle_errors
def status(ctx: click.Context) -> None:
    """Show system status and health checks."""
    config_path = ctx.obj.get("config_path")

    with console.status("[bold blue]Checking system status..."):
        config = load_config(config_path)

    # Create status table
    status_table = Table(title="System Status", show_header=True, header_style="bold magenta")
    status_table.add_column("Component", style="cyan", no_wrap=True)
    status_table.add_column("Status", style="green")
    status_table.add_column("Details", style="dim")

    # Configuration
    try:
        validate_config(config)
        status_table.add_row("Configuration", "✅ Valid", "All settings validated")
    except Exception as e:
        status_table.add_row("Configuration", "❌ Invalid", str(e))

    # Grafana connectivity (would be implemented)
    status_table.add_row("Grafana MCP", "⏳ Pending", "Connection test not implemented")

    # Slack connectivity (would be implemented)
    status_table.add_row("Slack API", "⏳ Pending", "Connection test not implemented")

    # AI/OpenRouter connectivity (would be implemented)
    status_table.add_row("OpenRouter API", "⏳ Pending", "Connection test not implemented")

    # Scheduler
    if config.scheduler is not None and config.scheduler.enabled:
        status_table.add_row(
            "Scheduler",
            "✅ Enabled",
            f"Daily at {config.scheduler.time} ({config.scheduler.timezone})",
        )
    else:
        status_table.add_row("Scheduler", "❌ Disabled", "Run manually or enable in config")

    console.print(status_table)


def _show_run_preview(config: AppConfig) -> None:
    """Show what would happen during a run."""
    preview_table = Table(title="Run Preview", show_header=True, header_style="bold blue")
    preview_table.add_column("Step", style="cyan")
    preview_table.add_column("Action", style="white")

    grafana_url = config.grafana.base_url if config.grafana else "N/A"
    ai_model = config.ai.model if config.ai else "N/A"
    slack_channel = config.slack.channel_id if config.slack else "N/A"

    preview_table.add_row("1. Collection", f"Fetch alerts from {grafana_url}")
    preview_table.add_row("2. Processing", f"Group and analyze alerts using {ai_model}")
    preview_table.add_row("3. Summary", "Generate intelligent summary")
    preview_table.add_row("4. Notification", f"Send to Slack channel {slack_channel}")

    console.print(preview_table)


def _format_config_display(config: AppConfig, show_secrets: bool = False) -> Panel:
    """Format configuration for display."""
    config_text = Text()

    # Application info
    config_text.append("Application\n", style="bold cyan")
    config_text.append(f"  Name: {config.name}\n")
    config_text.append(f"  Version: {config.version}\n")
    config_text.append(f"  Environment: {config.environment}\n")
    config_text.append(f"  Debug: {config.debug}\n\n")

    # Grafana
    config_text.append("Grafana MCP\n", style="bold cyan")
    if config.grafana:
        config_text.append(f"  Base URL: {config.grafana.base_url}\n")
        if show_secrets:
            config_text.append(f"  Token: {config.grafana.token}\n")
        else:
            config_text.append("  Token: [HIDDEN]\n", style="dim")
        config_text.append(f"  Org ID: {config.grafana.org_id}\n")
        config_text.append(f"  Lookback Hours: {config.grafana.lookback_hours}\n\n")
    else:
        config_text.append("  [red]Not configured[/red]\n\n")

    # Slack
    config_text.append("Slack\n", style="bold cyan")
    if config.slack:
        if show_secrets:
            config_text.append(f"  Bot Token: {config.slack.bot_token}\n")
        else:
            config_text.append("  Bot Token: [HIDDEN]\n", style="dim")
        config_text.append(f"  Channel ID: {config.slack.channel_id}\n\n")
    else:
        config_text.append("  [red]Not configured[/red]\n\n")

    # AI
    config_text.append("AI Processing\n", style="bold cyan")
    if config.ai:
        config_text.append(f"  Model: {config.ai.model}\n")
        config_text.append(f"  Enabled: {config.ai.enabled}\n\n")
    else:
        config_text.append("  [red]Not configured[/red]\n\n")

    # Scheduler
    config_text.append("Scheduler\n", style="bold cyan")
    if config.scheduler:
        config_text.append(f"  Enabled: {config.scheduler.enabled}\n")
        config_text.append(f"  Time: {config.scheduler.time}\n")
        config_text.append(f"  Timezone: {config.scheduler.timezone}\n")
    else:
        config_text.append("  [red]Not configured[/red]\n")

    return Panel(
        config_text,
        title="Configuration",
        border_style="blue",
        expand=False,
    )


def _display_alerts_table(alerts: List[Any]) -> None:
    """Display alerts in a formatted table."""
    alerts_table = Table(title="Collected Alerts", show_header=True, header_style="bold red")
    alerts_table.add_column("ID", style="cyan", no_wrap=True)
    alerts_table.add_column("Title", style="white")
    alerts_table.add_column("Severity", style="yellow")
    alerts_table.add_column("Timestamp", style="dim")

    for alert in alerts[:10]:  # Show first 10 alerts
        # This would work with actual Alert objects
        alerts_table.add_row(
            str(getattr(alert, "id", "N/A")),
            str(getattr(alert, "title", "N/A"))[:50],
            str(getattr(alert, "severity", "N/A")),
            str(getattr(alert, "timestamp", "N/A")),
        )

    if len(alerts) > 10:
        alerts_table.add_row("...", f"and {len(alerts) - 10} more alerts", "", "")

    console.print(alerts_table)


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
