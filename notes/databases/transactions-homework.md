---
title: Transactions and ACID (homework)
date: 2026-11-12
topics: [Databases]
tags: [sql, transactions, acid, tcl, homework]
---

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
 
## Review questions
 
### 1. Is a view physically stored in a database?
 
Not usually. A view is a virtual table, so only its definition (the SELECT query) is stored. The data stays in the base tables, and the view runs its query each time it's used, which means it always shows current data. The exception is a materialised view, which does store the results physically and has to be refreshed when the base tables change.
 
### 2. Database transaction
 
A database transaction is a group of one or more operations (like INSERT, UPDATE or DELETE) that are treated as a single unit of work. Either all of them are completed and saved with COMMIT, or none of them are.
 
### 3. Reason for a rollback
 
A transaction may need to be rolled back if one of its steps fails. For example, in a bank transfer, £100 is taken from the source account, but then the balance turns out to be negative. The transfer can't go ahead, so the deduction is rolled back. A system crash halfway through would also cause a rollback.
 
### 4. Effect of rolling back
 
All changes made since BEGIN TRANSACTION are undone, and the database goes back to the state it was in before the transaction started. Nothing from the transaction is saved.
 
### 5. The four properties of a transaction
 
**Atomicity:** All or nothing. Every part of the transaction is completed, or none of it is.
 
**Consistency:** The transaction takes the database from one valid state to another and never breaks its rules or constraints.
 
**Isolation:** Transactions running at the same time don't interfere with each other. Each one behaves as if it's running on its own.
 
**Durability:** Once a transaction is committed, the changes are permanent, even if the system crashes or loses power afterwards.
