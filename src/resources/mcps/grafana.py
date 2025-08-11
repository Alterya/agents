from agents.mcp import MCPServerStdio

import os


MCP = MCPServerStdio(                          # <-- our npx subprocess
        params={
            "command": "docker",
            "args": [
                "run",
                "--rm",
                "-i",
                "-e",
                f"GRAFANA_URL={os.environ['GRAFANA_URL']}",
                "-e",
                f"GRAFANA_API_KEY={os.environ['GRAFANA_API_KEY']}",
                "mcp/grafana",
                "-t",
                "stdio"
            ],
        },
        client_session_timeout_seconds=90,
    )