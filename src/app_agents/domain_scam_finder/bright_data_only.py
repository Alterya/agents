import asyncio
from enum import Enum
import os
import math
from concurrent.futures import ProcessPoolExecutor

from agents import Agent, Runner
from src.app_agents.domain_scam_finder.custom_prompts import IS_DOMAIN_INVESTMENT_PROMPT_BRIGHTDATA, IS_DOMAIN_SCAM_PROMPT
from pydantic import BaseModel

import logging
import sys
from pathlib import Path

from src.resources.mcps.bright_data import MCP as bright_data_mcp

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
DOMAINS = ["truwestcredit.ch", "instant7000prolia.com", "etradeprofx.com", "wwwrd3.hyip.com", "auwombat.com", "ridezero.pro", "royallpulse.com", "solarprime.net", "goldclassroom.com", "ethereumolux5000-com.financecryptoworld.com", "instantabil-solution.com", "nextedgeai-engine-com.the-finance-world.com", "tezaris-veltarplatform.com", "apclogistics.company", "immediate-luxsoftware-com.the-finance-world.com", "expertminin.pro", "crestwavemarkets.com", "fidelitysectors.com", "pc.bayshore-pro.com", "blueskyinvestment.co.uk", "utahcfunion.org", "crystalfinancetradiings.com.finabrighthub.com", "aimining68.com", "stozahaiplatform.com", "vgfo.net", "mobile.dzdp.cyou", "setandforgetpro.com", "plinko-treasure.com", "auronixsolutions.com", "jaredthomasmayfield.com", "cptallianceinvst.com", "coremarketrades.live", "agentpremiumbanking.com", "trader9000lidex.com", "6407mendius.com", "stockspulseai-com.worldsoffinance.com", "favino-invest-platform.com", "mylesg.pro", "paxoninsights.com", "trademarkofficer.com", "capital.trustdiamondplc.com", "bitcoin-revolutionsoftware.worldofcryptofinance.com", "app.bitsvests.com", "tradehub.swiftpaytrade.xyz", "quantexart.com", "testing.royalinfinity.world", "expertextrading.live.morganchasebank.live", "ac6102sctr45upg247.online", "immediate9mentaxplatform-com.worldsoffinance.com", "arcanetradetech-com.the-finance-world.com", "fyntrae.xyz", "propfirmexploit.com", "nerdcryptochain.com", "thenewgoldenheightsfin.com", "growingauto.com", "morganft.com", "pinnaclerefp.com", "freebnbusdt.com", "faucetearner.homes", "loancaterbackoffice.info", "fxbrooks.com", "web3.xpdaspweodr.com", "royalpropertiez.com", "globalfx-hub.space", "sefqualityelectronics.com", "mcadamturnbull.com.au", "streamtvis.com", "transfer-24.pro", "paid-finance.live", "draventox.com.xenovacap.net", "52hertzcapital.com", "karvon.co", "hometownherolending.com", "web3chainnetworks.com", "canmark-flowdex-solution.com", "pathaopro.digital", "klinikfokus.app", "quantumtrust-ai.com", "invest-free.com", "frolex-trust-soft.com", "financialrangetreasureb.com", "tamshq.com", "wwwlt.hyip.com", "cryptoapponchain.cc", "phantomsgates.com", "fimak1imass.online", "primestandardmarkets.com", "winner.icu", "guaranteeunion.live", "moomoovip.com", "grokfin.org", "exvestcom.xyz", "the-bitlq-app-com-gent.worldofcryptofinance.com", "frequenciadomercado.com.br", "chainodogs.top", "primerisepartners.com", "powertradessoftware.com", "invest-edrive.com", "lonvexum-app-com.worldsoffinance.com", "horizonsverige.com"]
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
    rows = []
    for domain in domains_chunk:
        domain_investment_tagger = Agent(
                name="domain type tagger",
                model="gpt-5",
                instructions=IS_DOMAIN_INVESTMENT_PROMPT_BRIGHTDATA,
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

    await bright_data_mcp.connect()
    logger.info("Connected to bright data mcp (worker)")

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

    await bright_data_mcp.cleanup()
    logger.info("Cleared bright data mcp (worker)")

    df.to_csv(CSV_FILE_PATH, index=False)


if __name__ == "__main__":
    asyncio.run(main())
