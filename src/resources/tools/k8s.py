import logging
import sys
from agents.tool import function_tool

from kubernetes_asyncio import client, config
from kubernetes_asyncio.client.exceptions import ApiException
from pydantic import BaseModel, Field


logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


class BaseK8SData(BaseModel):
    namespace: str = Field(description="Kubernetes namespace")


class BaseK8SDeployment(BaseK8SData):
    deployment: str = Field(description="Deployment name within the namespace")
    

class BaseK8SPod(BaseK8SData):
    pod: str = Field(description="Pod name within the namespace")


async def _get_all_namespaces() -> list[str]:
    """Return all namespaces as BaseK8SData objects."""
    await config.load_kube_config()
    async with client.ApiClient() as api_client:
        core = client.CoreV1Api(api_client)
        try:
            namespaces = await core.list_namespace()
            names = [
                item.metadata.name
                for item in namespaces.items
                if item.metadata is not None and item.metadata.name is not None
            ]
            logger.info(f"Found {len(names)} namespaces in cluster")
            if not names:
                error_message = "No namespaces found in cluster"
                logger.warning(error_message)
                raise ValueError(error_message)
            return names
        except ApiException as exc:
            error_message = f"Failed to list namespaces: {exc}"
            logger.exception(error_message)
            raise ValueError(error_message)


async def _validate_namespace(namespace: str) -> bool:
    """Return True if the namespace exists in the cluster."""
    namespaces = await _get_all_namespaces()
    return any(namespace == ns for ns in namespaces)


async def _get_all_deployments(namespace: str) -> list[str]:
    """Return all Deployments (by name) in a namespace as BaseK8SData objects."""
    if not await _validate_namespace(namespace):
        error_message = f"Namespace '{namespace}' does not exist; returning empty deployments list"
        logger.warning(error_message)
        raise ValueError(error_message)
    
    await config.load_kube_config()
    async with client.ApiClient() as api_client:
        apps = client.AppsV1Api(api_client)
        try:
            deployments = await apps.list_namespaced_deployment(namespace=namespace)
            names = [
                item.metadata.name
                for item in deployments.items
                if item.metadata is not None and item.metadata.name is not None
            ]
            logger.info(f"Found {len(names)} deployments in namespace '{namespace}'")
            return names
        except ApiException as exc:
            error_message = f"Failed to list deployments in namespace '{namespace}': {exc}"
            logger.exception(error_message)
            raise ValueError(error_message)


async def _validate_deployment(deployment: str, namespace: str) -> bool:
    """Return True if the deployment exists in the given namespace."""
    deployments = await _get_all_deployments(namespace)
    return deployment in deployments


def _build_label_selector(match_labels: dict[str, str]) -> str:
    """Convert a match_labels dict to a Kubernetes label_selector string.

    Example: {"app": "web", "tier": "frontend"} -> "app=web,tier=frontend"
    """
    return ",".join(f"{k}={v}" for k, v in match_labels.items()) if match_labels else ""


@function_tool
async def get_all_namespaces() -> list[str] | str:
    """Get all namespaces in the current cluster.

    Returns:
        list[str] | str: A list of namespaces or an error message.
    """
    try:
        return await _get_all_namespaces()
    except ValueError as e:
        return str(e)



@function_tool
async def get_all_deployments(base_k8s_data: BaseK8SData) -> list[str] | str:
    """Get all Deployments in a namespace.

    Args:
        base_k8s_data: Input containing the target namespace.
        should be something like:
        BaseK8SData(namespace="enrichment")

    Returns:
        list[BaseK8SData] | BaseK8SError: Deployment names (as BaseK8SData) or an error.
    """
    try:
        return await _get_all_deployments(base_k8s_data.namespace)
    except ValueError as e:
        return str(e)

@function_tool
async def get_deployment_status(base_k8s_data: BaseK8SDeployment) -> dict[str, object] | str:
    """Get status for a specific Deployment.

    Uses AppsV1Api.read_namespaced_deployment_status to retrieve live status fields
    like replicas, ready/updated/available/unavailable, and conditions.

    Args:
        base_k8s_data: Input containing namespace and deployment.
        should be something like:
        BaseK8SDeployment(namespace="enrichment", deployment="web")

    Returns:
        dict[str, object] | str: A structured status dict, or an error message.
    """
    try:
        await config.load_kube_config()
        async with client.ApiClient() as api_client:
            apps = client.AppsV1Api(api_client)
            try:
                resp = await apps.read_namespaced_deployment_status(
                    name=base_k8s_data.deployment, namespace=base_k8s_data.namespace
                )
            except ApiException as exc:
                msg = (
                    f"Failed to read deployment status for '{base_k8s_data.deployment}' "
                    f"in namespace '{base_k8s_data.namespace}': {exc}"
                )
                logger.exception(msg)
                return msg

            status = getattr(resp, "status", None)
            if status is None:
                return "error: missing_deployment_status"

            result: dict[str, object] = {
                "namespace": base_k8s_data.namespace,
                "deployment": base_k8s_data.deployment,
                "replicas": getattr(status, "replicas", 0) or 0,
                "ready_replicas": getattr(status, "ready_replicas", 0) or 0,
                "updated_replicas": getattr(status, "updated_replicas", 0) or 0,
                "available_replicas": getattr(status, "available_replicas", 0) or 0,
                "unavailable_replicas": getattr(status, "unavailable_replicas", 0) or 0,
            }
            return result
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        return str(e)


@function_tool
async def get_pods_per_deployment(base_k8s_data: BaseK8SDeployment) -> list[str] | str:
    """Get pod names under a Deployment using its match_labels selector only.

    Args:
        base_k8s_data: Input containing namespace and deployment.
        should be something like:
        BaseK8SDeployment(namespace="enrichment", deployment="web")

    Returns:
        list[str] | str
    """
    try:
        await config.load_kube_config()
        async with client.ApiClient() as api_client:
            apps = client.AppsV1Api(api_client)
            core = client.CoreV1Api(api_client)

            # 1) Read the deployment; if it doesn't exist, return an error
            try:
                dep = await apps.read_namespaced_deployment(
                    name=base_k8s_data.deployment, namespace=base_k8s_data.namespace
                )
            except ApiException as exc:
                msg = f"Failed to read deployment '{base_k8s_data.deployment}' in namespace '{base_k8s_data.namespace}': {exc}"
                logger.exception(msg)
                return msg

            # 2) Build a simple label selector from match_labels only
            match_labels = (
                getattr(getattr(getattr(dep, "spec", None), "selector", None), "match_labels", None)
                or {}
            )
            if not match_labels:
                msg = f"Deployment '{base_k8s_data.deployment}' has no match_labels selector; cannot list pods"
                logger.warning(msg)
                return msg

            label_selector = _build_label_selector(match_labels)

            # 3) List pods using the computed label selector
            try:
                pods = await core.list_namespaced_pod(
                    namespace=base_k8s_data.namespace, label_selector=label_selector
                )
                results = [
                    p.metadata.name
                    for p in pods.items
                    if p.metadata is not None and p.metadata.name is not None
                ]
                logger.info(
                    f"Deployment '{base_k8s_data.deployment}' has {len(results)} pods in namespace '{base_k8s_data.namespace}'"
                )
                return results
            except ApiException as exc:
                msg = f"Failed to list pods for deployment '{base_k8s_data.deployment}' in namespace '{base_k8s_data.namespace}': {exc}"
                logger.exception(msg)
                return msg
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        return str(e)


@function_tool
async def set_deployment_replicas(
    base_k8s_data: BaseK8SDeployment,
    replicas: int,
) -> bool | str:
    """Set the desired number of replicas for a Deployment.

    Args:
        base_k8s_data: Input containing namespace and deployment.
        replicas: Desired replica count.
        should be something like:
        BaseK8SDeployment(namespace="enrichment", deployment="web"), replicas=3

    Returns:
        bool | str
    """
    try:
        if not await _validate_namespace(base_k8s_data.namespace):
            error_message = f"Namespace '{base_k8s_data.namespace}' does not exist; returning empty pods list"
            logger.warning(error_message)
            return error_message
        
        if not await _validate_deployment(base_k8s_data.deployment, base_k8s_data.namespace):
            error_message = f"Deployment '{base_k8s_data.deployment}' does not exist in namespace '{base_k8s_data.namespace}'"
            logger.warning(error_message)
            return error_message

        await config.load_kube_config()
        async with client.ApiClient() as api_client:
            apps = client.AppsV1Api(api_client)
            try:
                body = {"spec": {"replicas": replicas}}
                await apps.patch_namespaced_deployment_scale(
                    name=base_k8s_data.deployment, namespace=base_k8s_data.namespace, body=body
                )
                logger.info(f"Scaled deployment '{base_k8s_data.deployment}' to {replicas} replicas in namespace '{base_k8s_data.namespace}'")
                return True
            except ApiException as exc:
                logger.exception(f"Failed to scale deployment '{base_k8s_data.deployment}' in namespace '{base_k8s_data.namespace}' to {replicas}: {exc}")
                return False
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        return str(e)


@function_tool
async def get_pod_logs(
    base_k8s_data: BaseK8SPod,
    previous: bool | None = None,
) -> str | str:
    """Return logs for a Pod container.

    If the container has crashed/restarted, returns logs from before the crash
    (auto-detects previous=True when applicable unless explicitly provided).

    Args:
        base_k8s_data: Input containing namespace and pod name.
        previous: Force returning previous logs; when None, auto-detect.
        should be something like:
        BaseK8SPod(namespace="enrichment", pod="web-abc-123")

    Returns:
        str | str

    Notes:
        Returns the last 1000 log lines (tail_lines=1000) with timestamps.
    """
    try:
        if not await _validate_namespace(base_k8s_data.namespace):
            error_message = f"Namespace '{base_k8s_data.namespace}' does not exist; returning empty pods list"
            logger.warning(error_message)
            return error_message

        await config.load_kube_config()
        async with client.ApiClient() as api_client:
            core = client.CoreV1Api(api_client)
            try:
                pod = await core.read_namespaced_pod(name=base_k8s_data.pod, namespace=base_k8s_data.namespace)
            except ApiException as exc:
                logger.exception(f"Failed to read pod '{base_k8s_data.pod}' in namespace '{base_k8s_data.namespace}': {exc}")
                return ""

            containers = getattr(getattr(pod, "spec", None), "containers", None) or []
            if len(containers) == 1:
                container_name = containers[0].name
            else:
                logger.warning(f"Pod '{base_k8s_data.pod}' in namespace '{base_k8s_data.namespace}' has multiple containers; specify container_name")
                return ""

            # Auto-detect whether to use previous logs
            prev_flag = False
            if previous is not None:
                prev_flag = previous
            else:
                statuses = (
                    getattr(getattr(pod, "status", None), "container_statuses", None)
                    or []
                )
                status_for_container = None
                for s in statuses:
                    if getattr(s, "name", None) == container_name:
                        status_for_container = s
                        break

                if status_for_container is not None:
                    restart_count = getattr(status_for_container, "restart_count", 0) or 0
                    state = getattr(status_for_container, "state", None)
                    waiting = getattr(state, "waiting", None)
                    # Use previous logs if we have restarts or CrashLoopBackOff
                    if restart_count > 0:
                        prev_flag = True
                    elif waiting is not None and getattr(waiting, "reason", "") == "CrashLoopBackOff":
                        prev_flag = True

            try:
                logs = await core.read_namespaced_pod_log(
                    name=base_k8s_data.pod,
                    namespace=base_k8s_data.namespace,
                    container=container_name,
                    previous=prev_flag,
                    timestamps=True,
                    tail_lines=1000,
                )
                return logs or ""
            except ApiException as exc:
                logger.exception(f"Failed to read logs for pod '{base_k8s_data.pod}' (container '{container_name}') in namespace '{base_k8s_data.namespace}': {exc}")
                return ""
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        return str(e)