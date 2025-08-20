from enum import Enum
import json
import logging
import os
import re

from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from agents.tool import function_tool

logger = logging.getLogger(__name__)

SAFE_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_\.]*$")

QUERY_TEMPLATE = (
    "SELECT {columns} FROM {table} {where_clause} {order_by_clause} LIMIT {limit}"
)

LIMIT_MAX = 1000

ERROR_RECOVERY_MESSAGE = "try again with after fixing the error, if you think you are unable to fix the error, return the error and the why to the user"

class DatabaseName(str, Enum):
    ALTERYA_MAIN = "alterya_main"
    COLLECTION_MANAGEMENT = "collection_management"

class SmallQueryParams(BaseModel):
    database_name: DatabaseName = Field(description="A reference to the name of the database to select from - like telegram_management", default=DatabaseName.ALTERYA_MAIN)
    schema_and_table_name: str = Field(description="the name of the schema and table to select from - like telegram_management.sessions")

class QueryParams(BaseModel):
    database_name: DatabaseName = Field(description="A reference to the name of the database to select from - like telegram_management", default=DatabaseName.ALTERYA_MAIN)
    schema_and_table_name: str = Field(description="the name of the schema and table to select from - like telegram_management.sessions")
    columns: list[str] = Field(description="the columns to select from the table - like ['*'] to select all columns", default=["*"])
    where: str | None = Field(description="the where clause to filter the data - like 'id = 1'", default=None)
    order_by: str | None = Field(description="the order by clause to sort the data - like 'id DESC'", default=None)
    limit: int = Field(description="the limit of the data to return - like 1000", default=1000)


def _is_safe_identifier(name: str) -> bool:
    """Basic validation for SQL identifiers (schema, table, column).

    Allows letters, digits, underscore, and dot separators. Prevents obvious injection via identifiers.
    """
    return bool(SAFE_IDENTIFIER_PATTERN.match(name))


def _validate_where_clause(where: str) -> bool:
    """Basic guard against obvious injection patterns in WHERE clause."""
    suspicious = (";", "--", "/*", "*/")
    return not any(token in where for token in suspicious)


def _sanitize_order_by(order_by: str) -> str | None:
    """Validate and normalize ORDER BY clause to 'col [ASC|DESC], ...'."""
    parts: list[str] = []
    for item in order_by.split(","):
        token = item.strip()
        if not token:
            continue
        tokens = token.split()
        col = tokens[0]
        direction = tokens[1].upper() if len(tokens) > 1 else ""
        if not _is_safe_identifier(col):
            return None
        if direction not in ("", "ASC", "DESC"):
            return None
        parts.append(f"{col} {direction}".strip())
    return ", ".join(parts) if parts else None


def _clamp_limit(limit: int) -> int:
    """Clamp requested limit to the configured LIMIT_MAX."""
    return limit if limit < LIMIT_MAX else LIMIT_MAX


def _build_columns_sql(requested_columns: list[str]) -> str:
    """Return a validated column list for SELECT."""
    if requested_columns == ["*"]:
        return "*"

    invalid_columns = [c for c in requested_columns if not _is_safe_identifier(c)]
    if invalid_columns:
        raise ValueError(f"invalid_column_name: {invalid_columns}")
    return ", ".join(requested_columns)


def _build_where_clause(where: str | None) -> str:
    """Return a validated WHERE clause fragment or an empty string."""
    if where is None:
        return ""
    if not _validate_where_clause(where):
        raise ValueError("invalid_where_clause")
    return f"WHERE {where}"


def _build_order_by_clause(order_by: str | None) -> str:
    """Return a validated ORDER BY clause fragment or an empty string."""
    if order_by is None:
        return ""
    sanitized = _sanitize_order_by(order_by)
    if sanitized is None:
        raise ValueError("invalid_order_by")
    return f"ORDER BY {sanitized}"


def _build_select_sql(params: QueryParams) -> str:
    """Construct the final SELECT statement from validated parts.

    This intentionally uses simple string composition, relying on strict
    identifier validation and basic guards for free-form clauses.
    """
    table_name = params.schema_and_table_name
    if not _is_safe_identifier(table_name):
        raise ValueError("invalid_table_name")

    columns_sql = _build_columns_sql(params.columns)
    where_clause = _build_where_clause(params.where)
    order_by_clause = _build_order_by_clause(params.order_by)
    clamped_limit = _clamp_limit(params.limit)

    return QUERY_TEMPLATE.format(
        columns=columns_sql,
        table=table_name,
        where_clause=where_clause,
        order_by_clause=order_by_clause,
        limit=clamped_limit,
    )

def _get_db_url(database_name: DatabaseName) -> str | None:
    if database_name == DatabaseName.ALTERYA_MAIN:
        return os.getenv("DATABASE_URL")
    elif database_name == DatabaseName.COLLECTION_MANAGEMENT:
        return os.getenv("DATABASE_URL_COLLECTION_MANAGEMENT")
    else:
        return None


def _query_database(db_url: str, sql: str) -> str:
    engine = None
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = [dict(row) for row in result.mappings().all()]
            return json.dumps(rows, default=str)
    except SQLAlchemyError as exc:
        # Include the original DB error message to aid diagnosis without exposing secrets
        detail = str(getattr(exc, "orig", exc)).splitlines()[0]
        logger.error(f"error: database_operation_failed:{exc.__class__.__name__}:{detail} - {ERROR_RECOVERY_MESSAGE}")
        return f"error: database_operation_failed:{exc.__class__.__name__}:{detail} - {ERROR_RECOVERY_MESSAGE}"
    except Exception as exc:  # pragma: no cover
        logger.error(f"error: unexpected_failure:{exc.__class__.__name__} - {ERROR_RECOVERY_MESSAGE}")
        return f"error: unexpected_failure:{exc.__class__.__name__} - {ERROR_RECOVERY_MESSAGE}"
    finally:
        if engine:
            engine.dispose()


@function_tool
async def postgres_simple_select(query_params: QueryParams) -> str:
    """postgres simple select tool  - enables you to do select queries on a postgres database.

    Args:
        query_params: The query parameters to fetch the data for.
        should be something like:
        QueryParams(schema_and_table_name="telegram_management.sessions", columns=["*"], where="id = 1", order_by="id DESC", limit=1000)

    """
    logger.info(f"postgres_simple_select: {query_params}")
    db_url = _get_db_url(query_params.database_name)
    if not db_url:
        return "error: missing_database_url"

    try:
        sql = _build_select_sql(query_params)
        logger.info(f"sql: {sql}")
    except ValueError as exc:
        # Preserve existing error format strings
        logger.error(f"error: {exc} - {ERROR_RECOVERY_MESSAGE}")
        return f"error: {exc} - {ERROR_RECOVERY_MESSAGE}"

    return _query_database(db_url, sql)



@function_tool
async def postgres_simple_select_example_run(small_query_params: SmallQueryParams) -> str:
    """postgres simple select tool example run - gets you an example row from the chosen table to better understand the data, columns and build.

    Args:
        small_query_params: The query parameters to fetch the data for.
        should be something like:
        SmallQueryParams(schema_and_table_name="telegram_management.sessions")

    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return "error: missing_database_url"

    try:
        table_name = small_query_params.schema_and_table_name
        if not _is_safe_identifier(table_name):
            logger.error(f"invalid_table_name: {table_name}")
            return f"error: invalid_table_name: {table_name} - {ERROR_RECOVERY_MESSAGE}"
        sql = f"SELECT * FROM {table_name} LIMIT 1"
    except ValueError as exc:
        # Preserve existing error format strings
        logger.error(f"error: {exc} - {ERROR_RECOVERY_MESSAGE}")
        return f"error: {exc} - {ERROR_RECOVERY_MESSAGE}"

    return _query_database(db_url, sql)