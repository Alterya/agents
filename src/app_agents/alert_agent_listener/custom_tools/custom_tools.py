from agents import function_tool
from pydantic import BaseModel
import requests
from dotenv import load_dotenv
import os
import base64

load_dotenv()

class ManualCollectionTriggerSettings(BaseModel):
    """Pydantic settings object for telegram chat runner with automatic environment variable loading."""

    targets: str
    goals: str = 'cashapp'
    timeout: float = 86400.0
    assistant_id: str = 'twitter_to_telegram_recovery_scam_cashapp'
    max_messages: int = 100
    scam_type: str = 'recovery_scam'
    language: str | None = None
    service_type: str | None = None


@function_tool
def trigger_telegram_manual_collection(manual_collection_trigger_settings: ManualCollectionTriggerSettings) -> str:
    """
    A function tool that can trigger a manual collection run of telegram collector.
    If anyone wants to trigger a target / task / username on telegram collector, this tools should and will be used.

    * IMPORTANT: BEFORE YOU USE THE DEFAULT VALUES, VALIDATE WITH THE USER THAT HE IS OK WITH THAT.

    Args:
        manual_collection_trigger_settings: All the parameters that are required to trigger the telegram collection run on telegram collector.
        Params:
            - targets: The targets to collect from -> you must provide one target, and you cant run here more then one.
            - goals: The goals to collect from -> before you use the default value, validate with the user that he is ok with that.
            - timeout: The timeout for the collection -> before you use the default value, validate with the user that he is ok with that.
            - assistant_id: The assistant ID to collect from -> before you use the default value, validate with the user that he is ok with that.
            - max_messages: The max messages to collect -> before you use the default value, validate with the user that he is ok with that.
            - scam_type: The scam type to collect -> before you use the default value, validate with the user that he is ok with that.
            - language: The language to collect in -> before you use the default value, validate with the user that he is ok with that.
            - service_type: The service type to collect in -> before you use the default value, validate with the user that he is ok with that.

    Returns:
        A string with the status code, text, and headers of the request.
    """
    base = "https://jenkins.alterya.io"
    job_path = "/job/Scanner/job/telegram-v2/job/manual-telegram-trigger/buildWithParameters"
    user = os.getenv("JENKINS_USERNAME", "")
    token = os.getenv("JENKINS_API_KEY", "")
    auth_header = "Basic " + base64.b64encode(f"{user}:{token}".encode()).decode()

    # Build form data (Jenkins expects x-www-form-urlencoded), drop None values
    form = {
        "TARGETS": manual_collection_trigger_settings.targets.strip(),
        "GOALS": manual_collection_trigger_settings.goals,
        "TIMEOUT": manual_collection_trigger_settings.timeout,
        "ASSISTANT_ID": manual_collection_trigger_settings.assistant_id,
        "MAX_MESSAGES": manual_collection_trigger_settings.max_messages,
        "SCAM_TYPE": manual_collection_trigger_settings.scam_type,
        "LANGUAGE": manual_collection_trigger_settings.language,
        "SERVICE_TYPE": manual_collection_trigger_settings.service_type,
    }
    form = {k: v for k, v in form.items() if v is not None}

    # Preemptive auth header for all requests
    headers = {"Authorization": auth_header}

    # Verify credentials (pre-flight)
    try:
        who = requests.get(f"{base}/whoAmI/api/json", headers=headers, timeout=10)
        if not who.ok or who.json().get("authenticated") is False:
            return f"Auth failed: status={who.status_code}, body={who.text}"
    except Exception as e:
        return f"Auth probe error: {e!s}"

    # Fetch CSRF crumb if required (best-effort)
    try:
        crumb_resp = requests.get(f"{base}/crumbIssuer/api/json", headers=headers, timeout=10)
        if crumb_resp.ok:
            crumb_json = crumb_resp.json()
            headers[crumb_json.get("crumbRequestField", "Jenkins-Crumb")] = crumb_json.get("crumb", "")
    except Exception:
        pass  # If crumb fetch fails and Jenkins doesn't require it, proceed

    url = f"{base}{job_path}"
    request = requests.post(url, headers=headers, data=form, timeout=30)
    return f"{request.status_code=}, {request.text=}, {dict(request.headers)=}"
