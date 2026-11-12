---
title: Bubble sort and selection sort
date: 2026-11-12
topics: [Hw]
tags: [sorting, bubble-sort, selection-sort]
---

# Bubble sort

## MCQ

1. c
2. d
3. a
4. a
5. d

## Key questions

1. Big values get swapped along to the end each pass, until nothing's out of order.
2. The end of the list is already sorted after each pass, so no need to check it.
3. Faster, hardly any swaps needed.
4. Simple and uses no extra memory, but really slow for big lists.
5. It only swaps if `>`, so equal values stay in the same order.

## Trace: [5, 1, 4, 2, 8]

| i | j | arr[j] | arr[j+1] | Swap? | Array |
|---|---|---|---|---|---|
| 0 | 0 | 5 | 1 | Yes | [1, 5, 4, 2, 8] |
| 0 | 1 | 5 | 4 | Yes | [1, 4, 5, 2, 8] |
| 0 | 2 | 5 | 2 | Yes | [1, 4, 2, 5, 8] |
| 0 | 3 | 5 | 8 | No | [1, 4, 2, 5, 8] |
| 1 | 0 | 1 | 4 | No | [1, 4, 2, 5, 8] |
| 1 | 1 | 4 | 2 | Yes | [1, 2, 4, 5, 8] |
| 1 | 2 | 4 | 5 | No | [1, 2, 4, 5, 8] |
| 2 | 0 | 1 | 2 | No | [1, 2, 4, 5, 8] |
| 2 | 1 | 2 | 4 | No | [1, 2, 4, 5, 8] |
| 3 | 0 | 1 | 2 | No | [1, 2, 4, 5, 8] |

# Selection sort

## MCQ

1. b
2. d
3. a
4. d
5. c

## Key questions

1. Sorted part at the front, unsorted part after it.
2. Keeps track of where the smallest value is, so it can swap it into place.
3. It always picks the smallest one left, so it goes on the end in order.
4. Always O(n²) even if already sorted, but fewer swaps than bubble sort.
5. Small lists, or when swapping is expensive.

## Trace: [5, 1, 4, 2, 8]

| i | min_index start | j | arr[j] < arr[min_index]? | min_index | End of pass | Array |
|---|---|---|---|---|---|---|
| 0 | 0 | 1 | 1 < 5 Yes | 1 | | |
| 0 | | 2 | 4 < 1 No | 1 | | |
| 0 | | 3 | 2 < 1 No | 1 | | |
| 0 | | 4 | 8 < 1 No | 1 | swap 0 and 1 | [1, 5, 4, 2, 8] |
| 1 | 1 | 2 | 4 < 5 Yes | 2 | | |
| 1 | | 3 | 2 < 4 Yes | 3 | | |
| 1 | | 4 | 8 < 2 No | 3 | swap 1 and 3 | [1, 2, 4, 5, 8] |
| 2 | 2 | 3 | 5 < 4 No | 2 | | |
| 2 | | 4 | 8 < 4 No | 2 | no change | [1, 2, 4, 5, 8] |
| 3 | 3 | 4 | 8 < 5 No | 3 | no change | [1, 2, 4, 5, 8] |

# Task 5

```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
        print(arr)
    return arr


def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_index = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_index]:
                min_index = j
        arr[i], arr[min_index] = arr[min_index], arr[i]
        print(arr)
    return arr


print(bubble_sort([29, 10, 14, 37, 13]))
print(selection_sort([29, 10, 14, 37, 13]))
```
