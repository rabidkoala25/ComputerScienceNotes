# Compare inserting at the front of a Python list (array) vs. our linked list.
import time
from linked_list import LinkedList

N = 20_000

start = time.perf_counter()
arr = []
for i in range(N):
    arr.insert(0, i)
print(f"array insert at front:       {time.perf_counter() - start:.3f} s")

start = time.perf_counter()
lst = LinkedList()
for i in range(N):
    lst.push_front(i)
print(f"linked list insert at front: {time.perf_counter() - start:.3f} s")
