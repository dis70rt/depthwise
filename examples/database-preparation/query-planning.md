# How does a query planner choose a path?

The planner compares estimated costs for scans, joins, and other operations using table statistics and cost settings. Inaccurate row estimates can lead to a poor plan. EXPLAIN shows estimates; EXPLAIN ANALYZE executes the statement and reports actual behavior.

[PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html).

## Estimate the work

- What information does a planner need about the data?
- How can stale statistics change an estimate?

## Read the plan

- What would you inspect in an execution plan?
- How would you compare estimated and actual row counts?

## Follow-up questions

- [What makes an index selective?](selectivity.md)
