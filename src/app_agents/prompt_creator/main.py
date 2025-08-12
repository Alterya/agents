import asyncio
from pathlib import Path
from agents import Runner, Agent, ModelSettings
from dotenv import load_dotenv
from src.resources.prompts.prompt_engineer import PROMPT as ENGINEER_PROMPT
from openai.types.shared import Reasoning

load_dotenv() 

def get_input_content():
    # return Path("src/app_agents/prompt_creator/input.txt").read_text()
    from src.app_agents.prompt_creator.taskmaster_workflow_old import PROMPT as FRONTEND_PROMPT
    return f"please evaluate the following prompt plus a refined, generic prompt for ChatGPT, Claude, Gemini e.g combined (one prompt to rule them all - starts with you are a <persona> ... etc...), and the primary task here is prompt review + ready-to-use prompt: {FRONTEND_PROMPT}"

async def main():
    reasoning_agent = Agent(
        name="ReasoningAgent",
        model="gpt-5",
        model_settings=ModelSettings(reasoning=Reasoning(effort="high")),
        instructions=ENGINEER_PROMPT
    )
    input_content = get_input_content()
    output_content = Path("src/app_agents/prompt_creator/output.md")

    runner = Runner().run(reasoning_agent, input=input_content)
    result = await runner

    output_content.write_text(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())