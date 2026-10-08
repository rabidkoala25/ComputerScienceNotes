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
