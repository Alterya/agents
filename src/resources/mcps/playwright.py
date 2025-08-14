from agents.mcp import MCPServerStdio

MCP = MCPServerStdio(                          # <-- our npx subprocess
        params={
            "command": "npx",
            "args": [
                "@playwright/mcp@latest"
            ]
        },
        client_session_timeout_seconds=300,
    )