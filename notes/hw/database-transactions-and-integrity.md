---
title: Database transactions and integrity
date: 2026-11-12
topics: [Hw]
tags: [sql, transactions, acid, tcl]
---

# Database transactions and integrity

## Part 1: ACID properties

### 1. Bank withdrawal, system crash

**Property:** Atomicity

**Reasoning:** The withdrawal didn't finish, so none of it was applied. Balance rolled back to how it was.

### 2. Library borrowing rule

**Property:** Consistency

**Reasoning:** The transaction would break a rule of the database (borrowed > copies), so it's rejected and the data stays valid.

### 3. Two shoppers, last item

**Property:** Isolation

**Reasoning:** The transactions run at the same time but don't interfere. One goes through first, the other sees the item is gone.

### 4. Address update survives power failure

**Property:** Durability

**Reasoning:** Once committed, the change is saved permanently, so it's still there after the restart.

## Part 2: TCL commands

```sql
BEGIN TRANSACTION;

UPDATE Accounts SET Balance = Balance - 100 WHERE AccountID = 'SRC';

-- IF Balance of 'SRC' < 0 THEN
--     ROLLBACK;
--     -- Display error message
-- ELSE
--     UPDATE Accounts SET Balance = Balance + 100 WHERE AccountID = 'DST';
--     COMMIT;
-- END IF;
```

## Part 3: Atomicity and rollback

Atomicity means a transaction is all or nothing. Rollback is how that's done: if any part fails, ROLLBACK undoes everything since BEGIN, so the database goes back to how it was before the transaction started.
