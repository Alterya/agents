import logging
import os
from pydantic import BaseModel, Field
import requests

from agents.tool import function_tool

from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

class ElasticQueryParams(BaseModel):
    elastic_index: str = Field(description="the elastic index to search in", default="avatar_hub")
    elastic_query_in_wild_cards: str = Field(description="the elastic query to use to search the index using the wild card elastic syntax")
    user_question: str = Field(description="the user question that is being asked, you should use this to understand the user question and the data you need to return", default="")


@function_tool
async def elastic_query_search(elastic_query_params: ElasticQueryParams) -> str:
    """
    elastic query search tool - gets you an example row from the chosen table to better understand the data, columns and build.

    Args:
        elastic_query_params: The query parameters to fetch the data for.
        should be something like:
        ElasticQueryParams(elastic_index="avatar_hub", elastic_query_in_wild_cards="is_active: true AND labels: "whatsapp" AND profile_type: "base_profile"", user_question="give me an example for an avatar that is active and has a whatsapp connected profile")

    return the raw json response from the elastic search (contains the elastic raw document)
    """
    elastic_url = os.getenv("ES_URL")
    if not elastic_url:
        return "error: missing_elastic_url"

    elastic_search_url = f"{elastic_url}/{elastic_query_params.elastic_index}/_search"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"ApiKey {os.getenv('ES_API_KEY')}",
        "Accept": "application/json",
    }
    body = {
        "size":1000,
        "query": {
            "query_string": {
                "query": elastic_query_params.elastic_query_in_wild_cards,
                "analyze_wildcard": True,
                "default_operator": "AND"
            }
        }
    }

    logger.info(f"elastic_search_url: {elastic_search_url}")
    logger.info(f"headers: {headers}")
    logger.info(f"body: {body}")

    try:
        response = requests.post(elastic_search_url, headers=headers, json=body)
        logger.info(f"response: {response.json()}")
        return response.json()
    except ValueError as exc:
        logger.error(f"error: {exc}")
        return f"error: {exc}"
