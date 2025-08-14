import asyncio
from enum import Enum
import os

from agents import Agent, Runner
from pydantic import BaseModel

from src.resources.mcps.bright_data import MCP as bright_data_mcp
from src.resources.mcps.playwright import MCP as playwright_mcp


from dotenv import load_dotenv

load_dotenv()

class IsInvestmentTypeDomain(str, Enum):
    TRUE = "true"
    FALSE = "false"
    ERROR = "error"


class IsScamDomainBool(str, Enum):
    TRUE = "true"
    FALSE = "false"
    ERROR = "error"


class IsScamDomain(BaseModel):
    is_scam: IsScamDomainBool
    reasoning: str

async def main():
    domain = "https://defispherefx.com"

    await playwright_mcp.connect()
    print("Connected to playwright mcp")
    
    domain_type_tagger = Agent(
        name="domain type tagger",
        model="gpt-5",
        instructions="You're a professional domain type tagger that knows how to tag a domain based on the information you're getting. your input is a domain name, and you return 'true' if this domains is an investemnt type domain (offers you to invest money or crypto for yields) or 'false' if not. use the playwright-mcp to get the information about the domain, and the playwright_mcp to get the information about the domain. YOU must use the playwright mcp and you MUST answer only in the format 'true' or 'false' or 'error' if you couldst access the site.",
        mcp_servers=[playwright_mcp],
        output_type=IsInvestmentTypeDomain,
    )
    result = await Runner.run(
        domain_type_tagger,
        input=f"is the following domain an investment type domain? - {domain}",
    )

    formatted_result: IsInvestmentTypeDomain = result.final_output
    print(f"domain type tagger: {formatted_result.value}")

    await playwright_mcp.cleanup()
    print("Cleared playwright mcp")

    if formatted_result == IsInvestmentTypeDomain.TRUE:
        await bright_data_mcp.connect()
        print("Connected to bright data mcp")

        domain_scam_finder = Agent(
        name="domain scam finder",
        model="gpt-5",
        instructions="You're a professional domain scam finder that knows how to find scams based just on the bright_data mcp capabilities. your input is a domain name, and you return 'true' if this domains is a scam, 'false' if not, unknown if you couldst access the site or couldst determent (no indications). use the bright_data mcp to get the information about the domain and to determen if its a scam or not, use all capabilites of the bright_data_mcp for this task (if needed), YOU must use the bright_data mcp and you MUST answer 'true' or 'false' or 'error', and also add all you reasoning for your decision into the relevant field.",
        mcp_servers=[bright_data_mcp],
        output_type=IsScamDomain,
    )

        result = await Runner.run(
            domain_scam_finder,
            input=f"is the following domain a scam? - {domain}",
            max_turns=25,
        )

        formatted_result: IsScamDomain = result.final_output
        print(f"domain scam finder: {formatted_result}")
        
        await bright_data_mcp.cleanup()
        print("Cleared bright data mcp")


if __name__ == "__main__":
    asyncio.run(main())
