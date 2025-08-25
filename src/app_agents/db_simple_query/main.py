import asyncio

from agents import Agent, run_demo_loop

from src.resources.tools.postgres_simple_select import postgres_simple_select, postgres_simple_select_example_run, get_all_schemas_in_db, get_all_tables_in_schema

async def main():
    db_simple_query_agent = Agent(
        name="DB Simple Query Agent",
        model="gpt-5",
        instructions="You're a professional DB query agent that knows how to get all the data from a database under specific constraints. Like if you get a table name, you know how to get all the data from it. If you get a where clause, you know how to get all the data from the table that matches the where clause, and etc. You know how to find data based on the information you're getting and ypu respond with all the raw data you got. IMPORTANT: No need to call query_loki_logs, just return the raw data you got.",
        tools=[postgres_simple_select, postgres_simple_select_example_run, get_all_schemas_in_db, get_all_tables_in_schema],
    )
    await run_demo_loop(db_simple_query_agent)


if __name__ == "__main__":
    asyncio.run(main())
