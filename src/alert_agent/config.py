"""Configuration management for the Daily Alert Summary Agent.

Handles environment variables, YAML configuration files, and Pydantic settings validation
with precedence: CLI > ENV > YAML > code defaults.
"""


def load_config():
    """Load and validate application configuration.
    
    Returns:
        Configuration object with validated settings.
    """
    pass