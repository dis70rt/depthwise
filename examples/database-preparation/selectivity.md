# What makes an index selective?

A selective condition matches a small fraction of rows, making an index lookup more attractive. The queried value and its frequency matter: many distinct values do not guarantee that every predicate matches few rows.

[PostgreSQL: query planning and estimates](https://www.postgresql.org/docs/current/using-explain.html).

## Distribution

- How does the number of distinct values affect a lookup?
- Why might the same column be useful for one query and unhelpful for another?

## Experiment

- What distribution would you use to challenge a planner estimate?
