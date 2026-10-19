---
title: Searching Algorithms
date: 2026-10-12
topics: [SL]
tags: [arrays, algorithm]
---

## Linear Search

- Start at the beginning of a list
- Compare each element to the target value
- If the element matches the target, return its index (or True)
- If the end of the list is reached without finding the target, return -1 (or False)

```python

l = [1, 3, 2, 6, 4, 8, 5, 9, 7]
target = 11

def linearSearch(numbers, target):
    for i in range(len(numbers)):
        if numbers[i] == target:
            return i          
    return -1                 

result = linearSearch(l, target)



if result == -1:
    print(f"{target} is not located within the array")
else:
    print(f"{target} found at index {result}")
```
