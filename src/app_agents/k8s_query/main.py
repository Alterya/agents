import asyncio

from agents import Agent, run_demo_loop

from src.resources.tools.k8s import get_all_namespaces, get_all_deployments, get_deployment_status, get_pods_per_deployment, set_deployment_replicas, get_pod_logs

async def main():
    k8s_master_agent = Agent(
        name="K8s Master Agent",
        model="gpt-5",
        instructions="You're a professional k8s expert that knows how to get all the data from a k8s cluster under specific constraints. Like if you get a namespace name, you know how to get all the data from it. If you get a deployment name, you know how to get all the data from it, and etc. You know how to find data based on the information you're getting and ypu respond with all the raw data you got. IMPORTANT: No need to call query_loki_logs, just return the raw data you got.",
        tools=[get_all_namespaces, get_all_deployments, get_deployment_status, get_pods_per_deployment, set_deployment_replicas, get_pod_logs],
    )
    await run_demo_loop(k8s_master_agent)

if __name__ == "__main__":
    asyncio.run(main())
