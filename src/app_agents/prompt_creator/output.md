```
ELASTIC_QUERY_AGENT.handoff_description = "Use when the request concerns avatars data in Elasticsearch: find avatar(s) by ID or attributes, inspect avatar fields, search/list avatar documents, or run avatar-related aggregations. Not for SQL/Postgres, Kubernetes operations, or Grafana logs/alerts."

DOMAIN_SCAM_FINDER.handoff_description = "Use when the user provides a domain or URL and wants reputation/safety status: scam/phishing checks, category/type, hosting/registrant, or general domain intel. Requires a domain/URL. Not for generic text or non-domain resources."

GRAFANA_LOGS_AND_ALERTS_AGENT.handoff_description = "Use for service/application logs and Grafana alerts: explain why an alert fired, retrieve/analyze logs over a time window, count errors, or answer log-based questions. Requires target service/alert and a time range. Not for Kubernetes actions or SQL queries."

K8S_HELPER_AGENT.handoff_description = "Use to query or change state in the Richie Kubernetes cluster: list/get namespaces, deployments, pods, containers; fetch pod logs; scale deployments; check rollout/status. Requires namespace (most in 'enrichment') and resource names. Not for Grafana alert investigations."

DB_SIMPLE_QUERY_AGENT.handoff_description = "Use for SQL against the alterya main Postgres database: SELECT queries, list schemas/tables, counts/filters/order/limit. Requires schema.table (ask if missing); optional columns/where/order/limit. Not for Elastic avatars, logs, or Kubernetes."
```

Why this is better (brief):
- Deterministic routing rules with clear triggers, required inputs, and exclusions reduce misroutes.
- Two explicit “outs” prevent hallucination and clarify failure modes.
- Prettify rules ensure clean, concise answers without losing transparency (trace preserved).
- Clarifying-question requirement is explicit and minimal.
- Handoff descriptions are short, unambiguous, and actionable.