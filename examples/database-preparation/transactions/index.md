# What guarantees does a transaction provide?

A transaction groups changes into one unit: either its database changes commit together or they are rolled back. For a transfer, the debit and credit belong in the same transaction. Isolation controls what concurrent transactions may observe.

[PostgreSQL: transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html).

## Reason about a unit of work

- Which changes should succeed or fail together?
- What could another reader observe during a transfer?

## Follow-up questions

- [What changes between isolation levels?](isolation.md)
- [How can concurrent transactions deadlock?](deadlocks.md)
