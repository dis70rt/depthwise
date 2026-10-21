# How do databases find what you need?

A database chooses an execution plan and then reads and combines the required data. The same SQL can take different paths as the amount of data, its distribution, or cached pages change.

[PostgreSQL: reading query plans](https://www.postgresql.org/docs/current/using-explain.html).

## Start with the question

- What happens between a query and a result?
- Why can the same query be fast today and slow tomorrow?

## Follow-up questions

- [How do database indexes work?](indexes/index.md)
- [What guarantees does a transaction provide?](transactions/index.md)
- [How does a query planner choose a path?](query-planning.md)
