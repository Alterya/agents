import asyncio
from pathlib import Path
import sys

# Ensure project root is on sys.path so 'src' package is importable when running this file directly
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from agents import Runner, Agent, ModelSettings
from dotenv import load_dotenv
from src.resources.prompts.prompt_engineer import PROMPT as ENGINEER_PROMPT
from openai.types.shared import Reasoning

load_dotenv() 

def get_input_content():
    return Path("src/app_agents/prompt_creator/input.txt").read_text()
    # return f"please evaluate the following prompt plus a refined, generic prompt for ChatGPT, Claude, Gemini e.g combined (one prompt to rule them all - starts with you are a <persona> ... etc...), and the primary task here is prompt review + ready-to-use prompt: {FRONTEND_PROMPT}"

async def main():
    print("Starting prompt creator")
    reasoning_agent = Agent(
        name="ReasoningAgent",
        model="gpt-5",
        model_settings=ModelSettings(reasoning=Reasoning(effort="high")),
        instructions=ENGINEER_PROMPT
    )
    print("Reasoning agent created")
    input_content = get_input_content()
    print("Input content retrieved")
    output_content = Path("src/app_agents/prompt_creator/output.md")

    print("Running runner")
    runner = Runner().run(reasoning_agent, input=input_content)
    result = await runner
    print("Result received")
    output_content.write_text(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())