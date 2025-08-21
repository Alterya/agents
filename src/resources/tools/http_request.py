from enum import Enum
from agents import function_tool
from pydantic import BaseModel, Field
import requests

class HttpRequestMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


class HttpRequestParams(BaseModel):
    url: str = Field(description="the url of the request, like https://api.github.com")
    method: HttpRequestMethod = Field(description="the method of the request, like GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS", default=HttpRequestMethod.GET)
    headers: dict = Field(description="the headers of the request, like {'Content-Type': 'application/json'}", default={})
    body: dict = Field(description="the body of the request, like {'key': 'value'}", default={})


class HttpRequestResponse(BaseModel):
    status_code: int = Field(description="the status code of the response, like 200, 404, 500")
    headers: dict = Field(description="the headers of the response, like {'Content-Type': 'application/json'}")
    body: dict = Field(description="the body of the response, like {'key': 'value'}")



@function_tool
async def http_request(http_request_params: HttpRequestParams) -> HttpRequestResponse:
    """
    http request tool - makes an http request to the given url with the given method, headers and body.

    Args:
        http_request_params: The request parameters to make the request for.
        should be something like:
        HttpRequestParams(url="https://api.github.com", method="GET", headers={"Content-Type": "application/json"}, body={"key": "value"})

    return the raw json response from the http request
    """
    try:
        response = requests.request(http_request_params.method, http_request_params.url, headers=http_request_params.headers, json=http_request_params.body)
        return HttpRequestResponse(status_code=response.status_code, headers=dict(response.headers), body=response.json())
    except Exception as e:
        return HttpRequestResponse(status_code=500, headers={}, body={"error": str(e)})