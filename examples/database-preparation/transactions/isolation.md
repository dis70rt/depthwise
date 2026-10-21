# What changes between isolation levels?

Isolation levels differ in the concurrent effects they allow. In PostgreSQL, Read Committed can use a new snapshot for each statement; Repeatable Read keeps a stable transaction snapshot. Serializable provides stronger guarantees, but transactions can fail and need retrying.

[PostgreSQL: transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

## Read behavior

- What makes a read repeatable?
- What could change between two queries in one transaction?

## Application choices

- Which anomalies could matter for an account balance?
- How would you test the guarantees your application needs?
