---
title: Big O Notation
date: 2026-10-09
topics: [SL]
tags: [data]
---

Drop constants
choose biggest O(notation) in the whole algorithm. 

O(1) when x independent of n

linear O(n):
```python
n=10000
for x in range (0,n):
  print(x)
```

O($\log{n}$):
```python
list = []
for i in range(100000):
  list.append(i)
max=list[0]
for element in list:
  if element > max:
    max = element

print("max")
```
O($n^2$):

```python
arr = []
n = 16
for i in range(n):
  arr.append(i)
for i in arr:
  num = i
  for b in range(len(arr)):
    print(num,arr[b])
