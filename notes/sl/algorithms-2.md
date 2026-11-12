---
title: Algorithms 2
date: 2026-11-05
topics: [SL]
tags: [algorithms, algorithm]
---

# Bubble Sort

## My solution

```python

my_array = [35, 10, 92, 21, -23, 78, 26, 13]
n = len(my_array)

for outer in range(n):
    swapped = False
    for inner in range(0, n - outer - 1):
        if my_array[inner + 1] < my_array[inner]:
            my_array[inner], my_array[inner + 1] = my_array[inner + 1], my_array[inner]
            swapped = True
    if not swapped:
        break

print(my_array)

```

## Recommended solution

```python

def buuble_sort(arr):
  n = len(arr)
  for i in range(n-1):
    swapped = False
    for j in range(n - i - 1):
      if arr[j] > arr[j+1]:
        arr[j], arr[j+1] = arr[j+1], arr[j]
        swapped = True
    if not swapped:
      break
      
```
- Time Complexity
  - $\text{O}(n^2)$
  - Best case O(n)
- Space Complexity
  - O(1)

# Selection Sort

### My Solution

```python

import random
import math

length = 10000
numbers = [random.randint(-length//2, length//2) for _ in range(length)]
print(numbers[length //2])
print(f"time should be {length**2}")

def selection_sort(arr):
  
  for i in range(len(arr)):
    
    smallest_index = i
    
    for j in range(i + 1, len(arr)):
      
      if arr[j] < arr[smallest_index]:
        
        smallest_index = j
        
        
    
    arr[i], arr[smallest_index] = arr[smallest_index], arr[i]
    
    print(f"progress = {(i/len(arr))*100}%")
  return arr


print(selection_sort(numbers))



```



### Trace Table

| Pass | i | start min | smallest value | find min index | swap | list after pass |
|------|---|-----------------|----------------|----------------|------|-----------------|
| 1 | 0 | 10 | -23 | 3 | 10, -23 | [-23, 35, 21, 10, 26, 13, 78, 92] |
| 2 | 1 | 35 | 10 | 3 | 35, 10 | [-23, 10, 21, 35, 26, 13, 78, 92] |
| 3 | 2 | 21 | 13 | 5 | 21, 13 | [-23, 10, 13, 35, 26, 21, 78, 92] |
| 4 | 3 | 35 | 21 | 5 | 35, 21 | [-23, 10, 13, 21, 26, 35, 78, 92] |
| 5 | 4 | 26 | - | - | - | [-23, 10, 13, 21, 26, 35, 78, 92] |
| 6 | 5 | 35 | - | - | - | [-23, 10, 13, 21, 26, 35, 78, 92] |
| 7 | 6 | 78 | - | - | - | [-23, 10, 13, 21, 26, 35, 78, 92] |
| 8 | 7 | 92 | - | - | - | [-23, 10, 13, 21, 26, 35, 78, 92] |


- Time Complexity
  - $O(n^2)$
- Space Complexity
  - O(1)
