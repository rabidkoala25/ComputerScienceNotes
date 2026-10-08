---
title: Queues Coding
date: 2026-10-05
topics: [SL]
tags: [arrays, data, dynamic]
---

```python
class Queue:
  def __init__(self):
    self.items = []
    self.maxitems = 100
  def is_empty(self):
    return len(self.items) == 0
  def is_full(self):
    return len(self.items) >= self.maxitems
  def enque(self, item):
    if self.is_full():
      print("queue is full")
    else: 
      self.items.append(item)
  def deque(self):
    if self.is_empty():
      print("queue is empty")
    else:
      return self.items.pop(0)
  def peek(self):
    if self.is_empty():
      print("queue is empty")
    return self.items[-1]
  def size(self):
    return len(self.items)
 
 
que = Queue()
que.enque("Alice")
print(que.items)
que.enque("Bob")
print(que.items)
que.enque("Charlie")
print(que.items)
que.deque()
print(que.items)
que.deque()
print(que.items)
que.deque()
print(que.items)
que.deque()
```
### Using collections.deque

```python
from collections import deque


class Queue:
    def __init__(self, maxitems=100):
        self.items = deque()
        self.maxitems = maxitems

    def is_empty(self):
        return not self.items

    def is_full(self):
        return len(self.items) >= self.maxitems

    def enqueue(self, item):
        if self.is_full():
            print("queue is full")
            return
        self.items.append(item)

    def dequeue(self):
        if self.is_empty():
            print("queue is empty")
            return None
        return self.items.popleft()

    def peek(self):
        if self.is_empty():
            print("queue is empty")
            return None
        return self.items[0]

    def size(self):
        return len(self.items)


que = Queue()
for name in ("Alice", "Bob", "Charlie"):
    que.enqueue(name)
    print(list(que.items))
for _ in range(4):
    que.dequeue()
    print(list(que.items))
```
