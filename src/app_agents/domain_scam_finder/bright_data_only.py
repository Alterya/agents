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
DOMAINS = ["""ws.brleyswave.com,thegoodchatapp.com,innovatehersglobal.com,halftophatbar.com,fashioncompassion.net,maryvanderslicepiano.net,30daybasements.com,griffinquartz.com,liquidarmourusa.com,risingphoenixbookkeeping.com,theworldfootballstadiums.com,kirchbergartwork.com,sugardefender-official.info,petewyntercelebration.com,ruffridegear.com,prostadine-official.info,aura-virginia.com,105watertown.com,boudoirsocials.com,maryvanderslicepiano.com,verde-green.com,athomewjulie.com,strongermillstone.com,skysportssolutions.com,pillowowl.com,splashpointmedia.com,wholesale360.org,safeinhaven.com,theworldfootballstadium.com,maharound.com,tinywhop.com,teeforstokesdale.com,1099patr.com,thanyon.com,theqonduit.com,myminikeepsakes.com,tinywhooop.com,thinkoptimalhealth.com,skinneckmassage.com,localcontentfactory.com,akhuwattpk.org,socialbruh.com,rkworkshops.com,carboncoreai.org,hurrydrop.com,larieux.com,yaba-e-stock-jdm.com,traxcore.com,cloutcrest.com,midaspredict.com,visualroost.com,bhinu.com,espritvibe.com,besto.net,clavri.com,robotyte.com,astror1.uber.space,levelworth.com,mindvenus.com,apexproof.com,delilive.com,mama-taxi.store,dapset.com,rentalfuture.com,layoutmint.com,glowbadge.com,integrityinspection-group.com,cravari.com,bixbix.com,rootfort.com,agentvio.com,createsticker.com,altikin.com,floratrust.com,vmynrgfe.xyz,weekendninja.com,kirabook.com,viggoslotscasino.de.com,winpot-casino.es,totalcasino.io,casinototal.cz,roobetcasino.co.cz,goripandflip.com,967capistrano.net,tikicabana.com,lsswapschool.com,pocketbolt.com,nextplayaggieland.com,nextplayaggieland.net,veteranshomeloanadvantage.com,monzita.com,lojasthabeauty.site,lookupio.com,fiestadeamor.com,zodiakmu.xyz,forgeweddings.com,exam-mastery.com,feelmytatto.com,colossalvibe.com,mubbec.com,swimdecatur.com,courtneyjamesrealestate.com,rummytour-in.com,mercuryvibe.com,56kinljtyr.com,predatormarketdef.com,predatormarketdef.com,predatormarketdef.com,et.impactglobehase.org,et.impactglobehase.org,et.impactglobehase.org,optiprompts.com,victoria-medium.com,turnrobot.com,spinit-casino.com.de,browinner.com.de,homeycolombia.com,stockoptionexchange-front.pages.dev,stockoptionexchange-front.pages.dev,snoggly.com,novacapitalgains.com,novacapitalgains.com,novacapitalgains.com,livemarketanalysis.live,livemarketanalysis.live,livemarketanalysis.live,coolzino.de.com,txs-ms.com,breadnbottle.com,candyspinz-casino.com.de,lexirosaliaphotography.com,cfa.ajabot.xyz,radiantconsultinginc.com,lorelawrence.com,lokeshdhanure.com,parkhopperhq.com,newleafarborist.com,raydewolfe.com,masculineevolutionarynation.org,canfirst-platform.com,canfirst-platform.com,yes-auto.pro,tribebuilders.teamtailor.com,bitprobuyerplatform-com.worldsoffinance.com,instantlenderusa.com,zffautomotive.ie,360marco.com,avex-ai-softwares-com.financecryptoworld.com,healthnextcon.com,bodypharm.net,hubai.in,events.novartis.de,lewontexappsolution-com.worldsoffinance.com,opulatrix.fr,venutra.com,card.freetalklive.com,manchesterherald.co.uk,en-en--glucovy.com,dominionx-engine-com.financecryptoworld.com,repozarexappsolution-com.the-finance-world.com,bluesjamsafari.com,prosperityaiplatform-com.worldsoffinance.com,xpfunding.com,amasum.com,capsulemaking.com,bitamg3-ai-com.financecryptoworld.com,bitamg3-ai-com.financecryptoworld.com,thematrixworld.com,canneww.com,thejustcasino.top,deltaravex.com,orkla.com,hierbasdelcielo.com,canadaprescriptionsplus.ca,masterclass.ccexinconline.com,masterclass.ccexinconline.com,16d39vo76xmp1w7k-hi50gqf44.hop.clickbank.net,phonecover.fr,com-retinaclear.com,fernox.at,shsilvercollection.com,robo-ifex-x2engine.com,robo-ifex-x2engine.com,fxchief-indonesia.com,transitadz.com,crypto-dezireapp-com.worldofcryptofinance.com,nextgencapitalltd.com.legacyworldltd.com,nextgencapitalltd.com.legacyworldltd.com,timeoutx.ae,selfmadecatalogue.fr,nirvexia-trades-app-com.worldsoffinance.com,theninecasino.top,vortex-echo-aisoft-com.the-finance-world.com,sidboostupsystem-com.the-finance-world.com,instant7000prolia.com,trading3lidex.com,immediate-300-imovax-com.the-finance-world.com,shift17xhiprexsoft.com,xavonixtrader1-4.com,vistyne.com,projectfoodbox.org,canadian-cialis.com,btc500-aloras-com.the-finance-world.com,btc500-aloras-com.the-finance-world.com,knews.rw,bit-pro-reopro-com.worldsoffinance.com,nexatrade-software-com.financecryptoworld.com,duqinsdnbhd.com,trezikhelmgpt-system.com,trezikhelmgpt-system.com,optionzypharel-solution-com-gent.financecryptoworld.com,availtattoo.com,the-allwins.top,bigkevs.au,volquartsensummitflashhider.site,etraderaigptplatforms-com.the-finance-world.com,avenidaopulencia-system-com-gent.financecryptoworld.com,avenidaopulencia-system-com-gent.financecryptoworld.com,okgtulid2.hyip.com,profit-spike-pro-com.the-finance-world.com,beastroids.net,demo.rachelscapes.com,demo.rachelscapes.com,us-mitothriv.com,instantflipsystem-com.the-finance-world.com,azorilix-soft-com.financecryptoworld.com,mycasaflow.com,monetrizers-ai-com.the-finance-world.com,monetrizers-ai-com.the-finance-world.com,nilefoxs.com.coctim.com,nilefoxs.com.coctim.com,nilefoxs.com.coctim.com,immediatelasixsystem.com,halisavetrustconnect.com,rix-tovi-system-com.financecryptoworld.com,dorshoe.com,cipro-yms.com,robo-eurax-tech-com.financecryptoworld.com,banking.netivor.com,nikiprofitsystem-com.the-finance-world.com,seatosummit.locally.com,us-official-javaburn.com,immediatesynergysoftware-com-gent.financecryptoworld.com,immediatepro-capex-com.the-finance-world.com,viralkan.org,bmethotrexate.com,bitteam.app,risevest.sebark.com,risevest.sebark.com,thebeautyessencials.com,jelvix.com,portal.megaformfx.com,portal.megaformfx.com,portal.megaformfx.com,promptonrentals.ca,shoplatisse.com,themontecassino.top,203kloantips.com,finansistinternational.com,the-immediatecoraldex-com-gent.worldofcryptofinance.com,globerix.com,7red.top,gadgedin.com,the-bitcode-prime-app-com-gent.worldofcryptofinance.com,miradextrader-engine-com.financecryptoworld.com,en-us-livepure.com,dorwaltraders.in,aucrd.myshopify.com,e4f547-3f.myshopify.com,dashboard.coinstechdigital.com,dashboard.coinstechdigital.com,dashboard.coinstechdigital.com,bellasofthemp.com,gryvongrid-ai-system-com.financecryptoworld.com,credenixmilanobnk.com,credenixmilanobnk.com,canadianusaprescriptions.com,trader-i2-sprixs-com.the-finance-world.com,buyprednisonenoprescription.com,citytrustsavingsbnk.com,citytrustsavingsbnk.com,m.bitcoin-of.com,edviagralove.com,immediatecapitalsystem-com-genx.financecryptoworld.com,viori-beauty.myshopify.com,highsevenwinning.org.sronzmarket.com,highsevenwinning.org.sronzmarket.com,highsevenwinning.org.sronzmarket.com,mageci.theme.2cshop.com,darwinfishwholesale.com,immediate75keflex-com.the-finance-world.com,cats.hyip.com,apps.vestrockfin.com,apps.vestrockfin.com,bestmodafinilforsale.online,slotum-casino.nz,capix-trade-com.worldsoffinance.com,monhanworld-blog.hyip.com,hyip-max.wellness-group.net"""]
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
    try:
        for domain in domains_chunk:
            try:
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
            except Exception as e:
                logger.error(f"Error processing domain {domain}: {e}")
                rows.append([
                    domain,
                    "null",
                    "null",
                    "null",
                    "null",
                    "null",
                ])
        return rows
    finally:
        await bright_data_mcp.cleanup()
        logger.info("Cleared bright data mcp (worker)")

def _worker_process(domains_chunk):
    return asyncio.run(_process_domains_chunk(domains_chunk))


async def main():
    # Ensure CSV exists with headers (main process handles I/O)
    if not CSV_FILE_PATH.exists():
        logger.info(f"CSV not found, creating at {CSV_FILE_PATH}")
        DataFrame(columns=CSV_COLUMNS).to_csv(CSV_FILE_PATH, index=False)

    df = pds.read_csv(CSV_FILE_PATH)

    num_workers = (os.cpu_count() or 1) * 2
    if len(DOMAINS) == 0:
        df.to_csv(CSV_FILE_PATH, index=False)
        return
    
    if len(DOMAINS) == 1:
        domains = DOMAINS[0].split(",")
    else:
        domains = DOMAINS

    chunk_size = math.ceil(len(domains) / num_workers)
    chunks = [domains[i:i + chunk_size] for i in range(0, len(domains), chunk_size)]

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
