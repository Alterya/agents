import os
from agents.mcp import MCPServerStdio

from dotenv import load_dotenv

load_dotenv()

API_TOKEN = os.getenv("BRIGHT_DATA_API_TOKEN", "")


MCP = MCPServerStdio(                          # <-- our npx subprocess
        params={
            "command": "npx",
            "args": [
                "@brightdata/mcp"
            ],
            "env": {
                "API_TOKEN": API_TOKEN
            }
        },
        client_session_timeout_seconds=90,
    )