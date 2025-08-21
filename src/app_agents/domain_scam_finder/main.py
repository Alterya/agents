import asyncio
from enum import Enum

from agents import Agent, Runner
from app_agents.domain_scam_finder.custom_prompts import IS_DOMAIN_INVESTMENT_PROMPT_PLAYWRIGHT, IS_DOMAIN_SCAM_PROMPT
from pydantic import BaseModel

import logging
import sys
from pathlib import Path

from src.resources.mcps.bright_data import MCP as bright_data_mcp
from src.resources.mcps.playwright import MCP as playwright_mcp

from pandas import DataFrame, concat
import pandas as pds


from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

CSV_COLUMNS = ["domain", "is_investment_type_domain", "reasoning_type", "classification", "risk_score", "reasons"]

CSV_FILE_PATH = Path(__file__).parent / "domain_scam_finder.csv"


######################### you can change the domains here #########################
DOMAINS = ["etratrust.com", "coreshellhq.com", "trustvaulltx.com", "agent-dataaxle.store", "major-fund-pro-ai.com", "selenera.com", "kuwealthinvestfunds.ltd", "agent-dataaxle.store", "gsbloans.com", "hadequipment.com", "gsvcapitalasset.com", "zenithoptavest.com", "codex-bank.com", "globalaccesss.com", "stake88au.com", "4156vrainst.info"]
##################################################################################

class InvestmentDecision(str, Enum):
    TRUE = "true"
    FALSE = "false"
    ERROR = "error"


class InvestmentAssessment(BaseModel):
    decision: InvestmentDecision
    reasoning: str


class ScamClassification(str, Enum):
    LEGITIMATE = "LEGITIMATE"
    SUSPICIOUS = "SUSPICIOUS"
    HIGH_RISK = "HIGH_RISK"


class ScamAssessment(BaseModel):
    classification: ScamClassification
    risk_score: int
    reasoning: str

async def main():
    # Ensure CSV exists with headers
    if not CSV_FILE_PATH.exists():
        logger.info("CSV not found, creating at %s", CSV_FILE_PATH)
        DataFrame(columns=CSV_COLUMNS).to_csv(CSV_FILE_PATH, index=False)

    df = pds.read_csv(CSV_FILE_PATH)

    for domain in DOMAINS:
        await playwright_mcp.connect()
        logger.info("Connected to playwright mcp")
        
        domain_type_tagger = Agent(
            name="domain type tagger",
            model="gpt-5",
            instructions=IS_DOMAIN_INVESTMENT_PROMPT_PLAYWRIGHT,
            mcp_servers=[playwright_mcp],
            output_type=InvestmentAssessment,
        )
        investment_run_result = await Runner.run(
            domain_type_tagger,
            input=f"is the following domain an investment type domain? - {domain}",
        )

        investment_assessment: InvestmentAssessment = investment_run_result.final_output
        logger.info("########################################")
        logger.info(f"is investment website: {investment_assessment.decision.value}")
        logger.info(f"reasoning: {investment_assessment.reasoning}")
        logger.info("########################################")

        await playwright_mcp.cleanup()
        logger.info("Cleared playwright mcp")

        if investment_assessment.decision == InvestmentDecision.TRUE:
            await bright_data_mcp.connect()
            logger.info("Connected to bright data mcp")

            domain_scam_finder = Agent(
                name="domain scam finder",
                model="gpt-5",
                instructions=IS_DOMAIN_SCAM_PROMPT,
                mcp_servers=[bright_data_mcp],
                output_type=ScamAssessment,
            )

            scam_run_result = await Runner.run(
                domain_scam_finder,
                input=f"is the following domain a scam? - {domain}",
                max_turns=25,
            )

            scam_assessment: ScamAssessment = scam_run_result.final_output
            
            logger.info("########################################")
            logger.info(f"is scam: {scam_assessment.classification.value}")
            logger.info(f"risk score: {scam_assessment.risk_score}")
            logger.info(f"reasoning: {scam_assessment.reasoning}")
            logger.info("########################################")

            
            await bright_data_mcp.cleanup()
            logger.info("Cleared bright data mcp")

            row_df = DataFrame([
                [
                    domain,
                    investment_assessment.decision.value,
                    investment_assessment.reasoning,
                    scam_assessment.classification.value,
                    scam_assessment.risk_score,
                    scam_assessment.reasoning,
                ]
            ], columns=CSV_COLUMNS)
            df = concat([df, row_df], ignore_index=True)
        
        else:
            row_df = DataFrame([
                [
                    domain,
                    investment_assessment.decision.value,
                    investment_assessment.reasoning,
                    "null",
                    "null",
                    "null",
                ]
            ], columns=CSV_COLUMNS)
            df = concat([df, row_df], ignore_index=True)

    df.to_csv(CSV_FILE_PATH, index=False)


if __name__ == "__main__":
    asyncio.run(main())