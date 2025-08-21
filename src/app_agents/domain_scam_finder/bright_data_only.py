import asyncio
from enum import Enum
import os
import math
from concurrent.futures import ProcessPoolExecutor

from agents import Agent, Runner
from app_agents.domain_scam_finder.custom_prompts import IS_DOMAIN_INVESTMENT_PROMPT, IS_DOMAIN_SCAM_PROMPT
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


# --- Worker-side logic (runs in separate processes) ---
async def _process_domains_chunk(domains_chunk):
    await bright_data_mcp.connect()
    logger.info("Connected to bright data mcp (worker)")

    rows = []
    for domain in domains_chunk:
        domain_investment_tagger = Agent(
                name="domain type tagger",
                model="gpt-5",
                instructions=IS_DOMAIN_INVESTMENT_PROMPT,
                mcp_servers=[bright_data_mcp],
                output_type=InvestmentAssessment,
            )
        investment_run_result = await Runner.run(
            domain_investment_tagger,
            input=f"is the following domain an investment type domain? - {domain}",
        )

        investment_assessment: InvestmentAssessment = investment_run_result.final_output
        logger.info("########################################")
        logger.info(f"is investment website: {investment_assessment.decision.value}")
        logger.info(f"reasoning: {investment_assessment.reasoning}")
        logger.info("########################################")

        if investment_assessment.decision == InvestmentDecision.TRUE:
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

            rows.append([
                domain,
                investment_assessment.decision.value,
                investment_assessment.reasoning,
                scam_assessment.classification.value,
                scam_assessment.risk_score,
                scam_assessment.reasoning,
            ])
        else:
            rows.append([
                domain,
                investment_assessment.decision.value,
                investment_assessment.reasoning,
                "null",
                "null",
                "null",
            ])

    await bright_data_mcp.cleanup()
    logger.info("Cleared bright data mcp (worker)")
    return rows


def _worker_process(domains_chunk):
    return asyncio.run(_process_domains_chunk(domains_chunk))


async def main():
    # Ensure CSV exists with headers (main process handles I/O)
    if not CSV_FILE_PATH.exists():
        logger.info(f"CSV not found, creating at {CSV_FILE_PATH}")
        DataFrame(columns=CSV_COLUMNS).to_csv(CSV_FILE_PATH, index=False)

    df = pds.read_csv(CSV_FILE_PATH)

    # Split domains into chunks, one per CPU/core (process count)
    num_workers = os.cpu_count() or 1
    if len(DOMAINS) == 0:
        df.to_csv(CSV_FILE_PATH, index=False)
        return

    chunk_size = math.ceil(len(DOMAINS) / num_workers)
    chunks = [DOMAINS[i:i + chunk_size] for i in range(0, len(DOMAINS), chunk_size)]

    loop = asyncio.get_running_loop()
    rows_collected = []
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        tasks = [loop.run_in_executor(executor, _worker_process, chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)
        for rows in results:
            rows_collected.extend(rows)

    # Main process writes aggregated results to CSV
    if rows_collected:
        rows_df = DataFrame(rows_collected, columns=CSV_COLUMNS)
        df = concat([df, rows_df], ignore_index=True)

    df.to_csv(CSV_FILE_PATH, index=False)


if __name__ == "__main__":
    asyncio.run(main())
