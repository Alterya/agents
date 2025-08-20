import asyncio

from agents import Agent, Runner
from resources.tools.elastic_query import elastic_query_search

async def main():
    elastic_query_agent = Agent(
        name="Elastic Query Agent",
        model="gpt-5",
        instructions="""You're a professional elastic query agent that knows how to get all the data from a elastic index under specific constraints.
        You are an elastic agent that can answer questions about avatars and avatars related knowledge which is stored in the avatar_hub index. 
        if its an elastic object or avatar related questions, then you should an you must use this context, 
        """,
        tools=[elastic_query_search],
    )
    result = await Runner.run(
        elastic_query_agent,
        input="give me an example for an avatar that is active and has a whatsapp connected profile",
    )
    print(f"Elastic Query Agent: {result.final_output}")

if __name__ == "__main__":
    asyncio.run(main())
