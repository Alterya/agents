import asyncio
import os

from agents import Agent, Runner, SQLiteSession

from src.resources.mcps.grafana import MCP as grafana_mcp

from slack_sdk.webhook import WebhookClient

from dotenv import load_dotenv

load_dotenv()

TARGET_CHANNEL = os.environ["SLACK_CHANNEL_ID"]

async def main():
    
    print("Connecting to grafana mcp")
    await grafana_mcp.connect()
    print("Connected to grafana mcp")

    session = SQLiteSession("grafana_alerts_agent")
    
    grafana_alerts_finder = Agent(
        name="Grafana Alerts Finder",
        model="gpt-5",
        instructions="You're a professional Grafana alert agent that knows how to get all the alerts actions and activity history under specific constraints. Like if you get a folder name, you know how to get all the alerts under it. If you get a Slack channel that reports to, you know how to check for all the alerts that report that specific Slack channel, and etc. You know how to find alerts based on the information you're getting and ypu respond with all the raw data you got. IMPORTANT: No need to call query_loki_logs, just return the raw data you got.",
        mcp_servers=[grafana_mcp],
    )
    result = await Runner.run(
        grafana_alerts_finder,
        input="get and summarize all the alerts that are under the Collectim Medium Evaluation folder that were triggered from the last 24 hours (there have been quite a few) like the alert 'Webchat Collector Error Logs'",
        session=session,
    )
    print(f"Grafana Alerts Finder: {result.final_output}")

    grafana_alerts_enricher = grafana_alerts_finder.clone(
        name="Grafana Alerts Enricher",
        instructions="You're a professional Grafana alert enricher that knows how to enrich the alerts you get from the grafana_alerts_finder agent. You usually get the some version of raw data from the alerts, And you know how to check the relevant logs from the alert. If the alert uses a specific log, you read the same logs, you understand them, and you enrich the data you got with the relevant logs. you return the full data with all the logs you read and understood. IMPORTANT: When you call query_loki_logs use the `since` parameter (e.g. `since: \"24h\"`) instead of `start`.",
    )

    result = await Runner.run(
        grafana_alerts_enricher,
        input="enrich all the alerts that are under the Collectim Medium Evaluation folder that were triggered from the last 24 hours (there have been quite a few) like the alert 'Webchat Collector Error Logs'",
        session=session,
    )
    print(f"Grafana Alerts Enricher: {result.final_output}")

    grafana_alerts_summarizer = grafana_alerts_finder.clone(
        name="Grafana Alerts Summarizer",
        instructions="You're a professional Grafana alert summarizer that knows how to summarize the alerts you get from the grafana_alerts_finder agent. You usually get the raw data from the alerts, and logs about them that are relevant. Then you know how to truthfully understand them, group them by, and represent them as action items for developers to understand what's the status as of now, what they should do next, what the cost of it from the logs, and etc. Each one of the group by should get its own section and understanding. Your result would be a Slack message to those developers.",
    )

    result = await Runner.run(
        grafana_alerts_summarizer,
        input="summarize all the alerts that are under the Collectim Medium Evaluation folder that were triggered from the last 24 hours (there have been quite a few) like the alert 'Webchat Collector Error Logs', in your return, return just your result, no farther question or interactions, just the summery section and the Action Items section ",
        session=session,
    )
    print(f"Grafana Alerts Summarizer: {result.final_output}")

    webhook = WebhookClient(os.environ["SLACK_WEBHOOK_URL"])
    response = webhook.send(text=result.final_output)
    if response.status_code == 200 and response.body == "ok":
        print("Posted via WebhookClient")
    else:
        print(f"Failed: {response.status_code} — {response.body}")
        
    print(response)

    await grafana_mcp.cleanup()
    print("Cleared grafana mcp")

    session.clear_session()
    session.close()
    print("Cleared session")

if __name__ == "__main__":
    asyncio.run(main())
