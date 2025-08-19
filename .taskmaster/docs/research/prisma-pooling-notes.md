# Prisma v5 + Serverless Postgres Pooling (Neon/Supabase/Vercel)

- Use pooled `DATABASE_URL` for runtime, `DIRECT_URL` for migrations/studio
- PgBouncer/poolers: add `?pgbouncer=true&sslmode=require&connect_timeout=5`
- Limit concurrency; avoid long transactions; prefer short-lived queries
- Consider Prisma Accelerate/Data Proxy for Edge-like workloads
- Budget connection count; set `connection_limit=1` for serverless
- Validate with `prisma validate`; run migrations via `DIRECT_URL`
