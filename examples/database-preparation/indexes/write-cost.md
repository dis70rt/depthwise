# Why can an index make writes more expensive?

Inserts add index entries as well as table rows. Updates that change indexed data can require index maintenance, and full B-tree pages may split. Extra indexes therefore trade faster lookups for additional storage and write work.

[PostgreSQL: B-tree implementation](https://www.postgresql.org/docs/current/btree.html).

## Trace the changes

- What must change when a row is inserted?
- What must change when an indexed value is updated?

## Compare choices

- How would you compare one index with several indexes?
- What would you measure before adding another index?
