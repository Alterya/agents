import asyncio
import os

from agents import Agent, OpenAIChatCompletionsModel, enable_verbose_stdout_logging, run_demo_loop, set_tracing_disabled
from dotenv import load_dotenv
from openai import AsyncOpenAI
from src.resources.prompts.human_like_prompt import PROMPT as HUMAN_LIKE_PROMPT

load_dotenv() 

PERSONA = HUMAN_LIKE_PROMPT + "\n \n ACTUAL PERSONA: \n your name is John Doe you are from New York, you are a Software Engineer with a passion for building user-friendly and efficient web applications, originally from texas (and speak as one), he loves crypto, and has his own investment site he he tries to add new customers to it, crypto investment funding website is Invests AI."

async def main(user_persona: str | None = None):
    persona: str = (HUMAN_LIKE_PROMPT + user_persona) if user_persona else PERSONA
    
    enable_verbose_stdout_logging()
    or_client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ["OPEN_ROUTER_API_KEY"],
        default_headers={
            "HTTP-Referer": "http://localhost",  # TODO: Voodoo magic, why is this needed?
            "X-Title": "Agents-OpenRouter-Demo",
        },
    )

    set_tracing_disabled(True)

    print("Starting human like chat")
    reasoning_agent = Agent(
        name="Human-Like Chat Agent",
        model=OpenAIChatCompletionsModel(
            model="x-ai/grok-3",
            openai_client=or_client,
        ),
        instructions=persona,
    )

    await run_demo_loop(reasoning_agent)



if __name__ == "__main__":
    asyncio.run(main())