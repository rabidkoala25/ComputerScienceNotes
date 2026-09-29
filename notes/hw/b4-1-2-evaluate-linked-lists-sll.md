---
title: B4.1.2 Evaluate linked lists ​(SLL)
date: 2026-09-29
topics: [HW]
tags: [data, dynamic]
---

## Diagrams

![PXL 20260929 203006438.RAW 01.COVER](assets/b4-1-2-evaluate-linked-lists-sll/PXL_20260929_203006438.RAW-01.COVER.jpg)

![PXL 20260929 203013285.RAW 01.COVER](assets/b4-1-2-evaluate-linked-lists-sll/PXL_20260929_203013285.RAW-01.COVER.jpg)

### 6. 

The steps of the search are:

- Step 1: Current = Head, so it points to A. A is checked; it isn't B, so Current = Current.next.
- Step 2: Current points to B. B is checked; it matches, so the search returns "found" and stops.

With no value in the list, Current would eventually reach NULL and the search would return "not found."

### 7. 

An advantage of a singly linked list is that its size is dynamic. It grows and shrinks. Inserting or deleting at a known position only means changing a pointer or two, as in Questions 3 and 5. An array would have to shift every later element, and might need resizing.

A disadvantage is that there is no random access. To reach the nth element you must traverse from Head whereas an array can index directly. Each node also uses extra memory to store its next pointer.
