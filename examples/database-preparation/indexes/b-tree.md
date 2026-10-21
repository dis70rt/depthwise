# How does a B-tree stay balanced?

A B-tree keeps its leaves at the same depth. When a page fills, a split distributes entries and adds a separator to its parent. Splits can propagate upward; splitting the root creates a new level.

[PostgreSQL: B-tree implementation](https://www.postgresql.org/docs/current/btree.html).

## Structure

- What information belongs in an internal node?
- What determines the number of children a node can hold?

## Changes

- What happens when a node becomes full?
- How does a split affect the path to the root?
