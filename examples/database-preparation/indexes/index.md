# How do database indexes work?

An index stores searchable keys and a way to locate matching rows. It can avoid scanning an entire table for a selective lookup, but maintaining it adds work when data changes.

[PostgreSQL: indexes](https://www.postgresql.org/docs/current/indexes-intro.html).

## Purpose

- What problem does an index solve?
- What information must an index retain?

## Trade-offs

- When would you choose a full scan instead?
- What extra work does an index create?

## Follow-up questions

- [Why can an index make reads faster?](read-performance.md)
- [Why can an index make writes more expensive?](write-cost.md)
- [How does a B-tree stay balanced?](b-tree.md)
