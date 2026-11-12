---
title: "Databases: Transactions and Data Integrity"
date: 2026-11-12
topics: [HL]
tags: [data, database]
---

## ACID:
**A**tomicity \
**C**onsistency \
**I**solation \
**D**urability 

**Data Integrity**: The accuracy, consistency, and reliability of data throughout its life, even when many users change it at once or the system fails.

**Transaction**: A logical unit of work: one or more SQL operations that must be treated as a single indivisible action. All succeed, or none do. 


```sql

BEGIN TRANSACTION;
UPDATE Animals SET Adopted = 'yes' WHERE AnimalID = 3; 
INSERT INTO Adoptions VALUES (3, 3, 'Sarah', 80);
COMMIT;

```

## Atomicity

All or nothing \
Either every operation in it suceeds, or none of them take effect. 

## Consistency

transaction moves database from one valid state to another. \
nothing breaks constraints

## Isolation

Transactions running at the same time must not interfere. Changes are hidden from others until commit so the result is as if they run one after the other

## Durability

once a transaction is comitted, its changes are permament, even if the system crashes or loses power straight afterwards
