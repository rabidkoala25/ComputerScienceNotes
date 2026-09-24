---
title: Arrays and linked lists
date: 2026-09-24
topics: [HL]
tags: [arrays, linked-lists, B]
---

# Arrays:

![6269.1647166159](assets/arrays-and-linked-lists/6269.1647166159.png)


Advantages:
- fast access to any element by index
- efficient use of cache memory due to contiguous storage
Disadvantages:
- Fixed size
- insertion or deletion can be slow
- wasted memory if not fully utilized or needs to be copied to a larger array. 


# Linked Lists: 

![6269.1647166159 1](assets/arrays-and-linked-lists/6269.1647166159-1.png)


## Singly Linked Lists

![image 1](assets/arrays-and-linked-lists/image-1.png)


### Traversion

- Create variable current
- traverse current through linked list.

### Insertion

Create Node

link 25 to 30
link rest to each

```python

class Node
    def _init_(self, data):
        self.data = data
        self.next = None
new_node = Node(25)
head = Node(5)
second = Node(10)
third = Node(15)
fourth = Node(30)
head.next = second
second.next = third
third.next = fourth
fourth.next = None

Current = head
while (Current != None) and (Current.data != 15):

if Current is not None:
    new_node.next = Current.next
    Current.next = new_node.next

```
