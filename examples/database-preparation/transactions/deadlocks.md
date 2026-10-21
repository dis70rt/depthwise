# How can concurrent transactions deadlock?

A deadlock can occur when two transactions each hold a lock the other needs. PostgreSQL detects the cycle and aborts one transaction. Acquiring locks in a consistent order helps avoid this; applications must still handle transaction failures.

[PostgreSQL: deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html).

## Construct a case

- What sequence of locks could create a circular wait?
- What would change if every transaction acquired locks in the same order?
