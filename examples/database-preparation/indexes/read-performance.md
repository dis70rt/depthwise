# Why can an index make reads faster?

An index can narrow a lookup to a small part of a table. If a query needs much of the table, a sequential scan may be cheaper. Compare estimated and actual rows and execution time with a representative query plan.

[PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html).

## Trace the lookup

- How many pages might a lookup visit?
- What changes when the needed pages are cached?

## Compare choices

- When would a table scan do less work?
- What would you measure to compare the two paths?
