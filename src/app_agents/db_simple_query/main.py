import asyncio

from agents import Agent, Runner

from src.resources.tools.postgres_simple_select import postgres_simple_select, postgres_simple_select_example_run

async def main():
    db_simple_query_agent = Agent(
        name="DB Simple Query Agent",
        model="gpt-5",
        instructions="You're a professional DB query agent that knows how to get all the data from a database under specific constraints. Like if you get a table name, you know how to get all the data from it. If you get a where clause, you know how to get all the data from the table that matches the where clause, and etc. You know how to find data based on the information you're getting and ypu respond with all the raw data you got. IMPORTANT: No need to call query_loki_logs, just return the raw data you got.",
        tools=[postgres_simple_select, postgres_simple_select_example_run],
    )
    result = await Runner.run(
        db_simple_query_agent,
        input="tell me about everything that ran today in collection_tracking.telegram_collection_records",
    )
    print(f"DB Simple Query Agent: {result.final_output}")

if __name__ == "__main__":
    asyncio.run(main())
