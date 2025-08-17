ALSO USE

* Output types - for a static output type
* Dynamic instructions - for building an agents with some dynamic prompt part
* Hooks - read about
* Guardrails - for validating user input or cross agent inputs 

* The agent loop - inner agent conversation loop
* run_config - read more about global config per agent

* see in the run result for different actions history while running like all the tools and etc...

* you can stream the result, mainly for user to see the output - token by token or per event.

############
* Model Setting - 
```
agent = Agent(
    name="Weather Agent",
    instructions="Retrieve weather details.",
    tools=[get_weather],
    model_settings=ModelSettings(tool_choice="get_weather") *******
)
```
###########
* Agents mutual context / session - 
```
from agents import Agent, Runner, SQLiteSession

async def main():
    agent = Agent(name="Assistant", instructions="Reply very concisely.")

    # Create session instance
    session = SQLiteSession("conversation_123")

    with trace(workflow_name="Conversation", group_id=thread_id):
        # First turn
        result = await Runner.run(agent, "What city is the Golden Gate Bridge in?", session=session)
        print(result.final_output)
        # San Francisco

        # Second turn - agent automatically remembers previous context
        result = await Runner.run(agent, "What state is it in?", session=session)
        print(result.final_output)
        # California
```
###########

### tools:
openai build in ones. 
The WebSearchTool lets an agent search the web.
The FileSearchTool allows retrieving information from your OpenAI Vector Stores.
The ComputerTool allows automating computer use tasks.
The CodeInterpreterTool lets the LLM execute code in a sandboxed environment.
The HostedMCPTool exposes a remote MCP server's tools to the model.
The ImageGenerationTool generates images from a prompt.
The LocalShellTool runs shell commands on your machine.
