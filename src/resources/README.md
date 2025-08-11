ALSO USE

* Output types - for a static output type
* Dynamic instructions - for building an agents with some dynamic prompt part
* Hooks - read about
* Guardrails - for validating user input or cross agent inputs 

* The agent loop - inner agent conversation loop
* run_config - read more about global config per agent

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
