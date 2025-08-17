from agents.mcp import MCPServerStdio

MCP = MCPServerStdio(  # <-- our stdio subprocess
        params={
            "command": "playwright-mcp",
            "args": [
                "--isolated",
                "--headless"
            ]
        },
        client_session_timeout_seconds=300,
    )