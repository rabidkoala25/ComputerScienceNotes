---
title: Binary Search HW
date: 2026-11-05
topics: [HW]
tags: [algorithms, algorithm, arrays]
---

## Part 1

```python
def binary_search_range(my_list, target_min, target_max):
    low = 0
    high = len(my_list) - 1
    start = len(my_list)

    while low <= high:
        mid = (low + high) // 2
        if my_list[mid] >= target_min:
            start = mid
            high = mid - 1
        else:
            low = mid + 1

    result = []
    index = start
    while index < len(my_list) and my_list[index] <= target_max:
        result.append(my_list[index])
        index = index + 1

    return result
  ```
  
## Part 2
 
The list is `[2, 5, 7, 10, 11, 14, 15]`, so the indexes go from 0 to 6.
 
### target_min = 6, target_max = 13
 
| step | low | high | mid | my_list[mid] | >= 6 | result |
|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 10 | Yes | start = 3, high = 2 |
| 2 | 0 | 2 | 1 | 5 | No | low = 2 |
| 3 | 2 | 2 | 2 | 7 | Yes | start = 2, high = 1 |
| end | 2 | 1 | | | | low > high so the loop stops |
 
Then the second loop starts at index 2. It adds 7, 10 and 11. The next value is 14, which is more than 13, so it stops there.
 
Result: `[7, 10, 11]`
 
### target_min = 1, target_max = 16
 
| step | low | high | mid | my_list[mid] | >= 1 | result |
|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 10 | Yes | start = 3, high = 2 |
| 2 | 0 | 2 | 1 | 5 | Yes | start = 1, high = 0 |
| 3 | 0 | 0 | 0 | 2 | Yes | start = 0, high = -1 |
| end | 0 | -1 | | | | low > high so the loop stops |
 
This time `start` ends up at 0. Every value in the list is 16 or less, so the second loop goes all the way through and only stops because `index` reaches 7 (the length of the list).
 
Result: `[2, 5, 7, 10, 11, 14, 15]`
 
### target_min = 12, target_max = 12
 
| step | low | high | mid | my_list[mid] | >= 12 | result |
|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 10 | No | low = 4 |
| 2 | 4 | 6 | 5 | 14 | Yes | start = 5, high = 4 |
| 3 | 4 | 4 | 4 | 11 | No | low = 5 |
| end | 5 | 4 | | | | low > high so the loop stops |
 
`start` is 5, but `my_list[5]` is 14, which is already bigger than 12. So the second loop doesn't add anything.
 
Result: `[]` 

## Part 3

Binary search is O(log n), because every comparison cuts the part of the list still being searched in half, so a list of n elements needs at most about log2(n) steps (3 for the 7-element list above). 

## Part 4

Log entries are added in time order, so the list is already sorted by timestamp. I'd use the same function but compare each entry's timestamp instead of the whole entry: binary search finds the first entry at or after the start time, then I add entries until one is after the end time. This avoids reading every entry from the top of the log.
