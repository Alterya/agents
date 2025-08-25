import asyncio
import os

from agents import Runner
from app_agents.alert_agent_listener.active_agents.orchestrator_im import GENERAL_HELP_AGENT
from app_agents.alert_agent_listener.const import ChannelType

from app_agents.alert_agent_listener.slack_utils import channel_type_is, fetch_last_messages_in_im
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
import logging

from resources.mcps.bright_data import MCP as bright_data_mcp
from resources.mcps.grafana import MCP as grafana_mcp

from slack_sdk import WebClient

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_APP_TOKEN = os.getenv("SLACK_APP_TOKEN")

app = AsyncApp(token=SLACK_BOT_TOKEN)


@app.event({"type": "message", "subtype": None}, matchers=[channel_type_is(ChannelType.IM)])
async def on_im(body, client, say, logger):
    message = body["event"]

    # History also includes the triggering message
    history = await fetch_last_messages_in_im(
        client=client,
        channel=message["channel"],
        latest_ts=message["ts"],  # include the triggering message as the anchor
        limit=10,
    )
    
    await bright_data_mcp.connect()
    logger.info("Connected to bright data mcp")

    await grafana_mcp.connect()
    logger.info("Connected to grafana mcp")
    
    result = await Runner.run(
            GENERAL_HELP_AGENT,
            input=history,
            max_turns=50,
        )
    try:
        await say(result.final_output or "(no output)")
    except Exception as exc:
        logger.exception("Failed to send Slack message", exc_info=exc)

    await grafana_mcp.cleanup()
    await bright_data_mcp.cleanup()
    logger.info(f"[IM] {message['channel']} {message.get('user')}: {message.get('text','')}")
    logger.info(body)


@app.event({"type": "message", "subtype": None}, matchers=[channel_type_is(ChannelType.MPIM)])
async def on_mpim(body, logger):
    message = body["event"]
    logger.info(f"[MPIM] {message['channel']} {message.get('user')}: {message.get('text','')}")
    logger.info(body)


@app.event({"type": "message", "subtype": None}, matchers=[channel_type_is(ChannelType.CHANNEL)])
async def on_channel(body, logger):
    message = body["event"]
    logger.info(f"[CHANNEL] {message['channel']} {message.get('user')}: {message.get('text','')}")
    logger.info(body)


@app.event({"type": "message", "subtype": None}, matchers=[channel_type_is(ChannelType.GROUP)])
async def on_group(body, logger):
    message = body["event"]
    logger.info(f"[GROUP] {message['channel']} {message.get('user')}: {message.get('text','')}")
    logger.info(body)


@app.event({"type": "message", "subtype": "message_deleted"})
async def handle_message_deleted(body, say, logger):
    message = body["event"]
    logger.info(body)


@app.event({"type": "message", "subtype": "message_changed"})
async def handle_message_deleted(body, say, logger):
    message = body["event"]
    logger.info(body)


async def main():
    client = WebClient(token=SLACK_BOT_TOKEN)
    print("Testing auth")
    result = client.auth_test()
    if not result.get("ok"):
        raise Exception(f"Auth failed: {result}")
    
    print("Starting socket mode handler")
    await AsyncSocketModeHandler(app, SLACK_APP_TOKEN).start_async()
    


if __name__ == "__main__":
    asyncio.run(main())