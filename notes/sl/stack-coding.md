---
title: Stack Coding
date: 2026-10-01
topics: [SL]
tags: [data, arrays, dynamic]
---



```python

class Stack:
    def __init__(self):
        self.items = []
        self.max_size = 1000000000000000  # Example maximum size for the stackk

    def is_empty(self):
        return len(self.items) == 0

    def is_full(self):
        return len(self.items) >= self.max_size

    def push(self, item):
        if self.is_full():
            raise IndexError("push to full stack")
        self.items.append(item)


    def pop(self):
        if self.is_empty():
            raise IndexError("pop from empty stack")
        return self.items.pop()

    def peek(self):
        if self.is_empty():
            raise IndexError("peek from empty stack")
        return self.items[-1]

    def size(self):
        return len(self.items)

    def memory_full(self):
        return len(self.items) >= self.max_size 
      

my_stack = Stack()
for i in range(100):
    try:
        my_stack.push(i)
        print(my_stack.items)
    except IndexError as e:
        print(f"Error: {e}")
