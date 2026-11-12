---
title: Bubble sort and selection sort
date: 2026-11-12
topics: [Hw]
tags: [sorting, bubble-sort, selection-sort, algorithms]
---

# Bubble sort and selection sort

## Bubble sort

### Multiple choice

1. c
2. d
3. a
4. a
5. d

### Key questions

**How swapping sorts the list:** each pass swaps neighbours that are in the wrong order, so the biggest unsorted value moves to the end. Repeat until nothing is out of order.

**Why the inner loop gets shorter:** after each pass the last element is already in its final place, so there's no point checking it again.

**Nearly sorted input:** very few swaps needed. With an early-exit check (stop if a pass makes no swaps) it's close to O(n).

**Advantages:** simple to write and understand, in place (O(1) space), stable.
**Disadvantages:** O(n²), very slow on large lists compared to merge sort or quicksort.

**Why it's stable:** it only swaps when `arr[j] > arr[j + 1]`, never when they're equal, so equal values keep their original order.

### Code

```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]

arr = [5, 1, 4, 2, 8]
bubble_sort(arr)
print(arr)
```

### Trace table: `[5, 1, 4, 2, 8]`

| i | j | arr[j] | arr[j+1] | Swap? | Array after |
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

## Selection sort

### Multiple choice

1. b
2. d
3. a
4. d
5. c

### Key questions

**Two parts:** a sorted part at the front and an unsorted part after it. Each pass moves the boundary one place right.

**Why min_index:** it remembers where the smallest value in the unsorted part is, so only one swap is needed per pass.

**Why the sorted part stays sorted:** each pass picks the smallest remaining value, which can't be smaller than anything already placed, so it goes on the end in the right order.

**Efficiency:** always O(n²) comparisons, even if already sorted, so worse than bubble sort (with early exit) and insertion sort on nearly sorted data. But it does at most n − 1 swaps, fewer than bubble sort.

**When to use it:** small lists, or when swaps/writes are expensive (e.g. writing to flash memory), since it keeps swaps to a minimum.

### Code

```python
def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_index = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_index]:
                min_index = j
        arr[i], arr[min_index] = arr[min_index], arr[i]

arr = [5, 1, 4, 2, 8]
selection_sort(arr)
print(arr)
```

### Trace table: `[5, 1, 4, 2, 8]`

| i | min_index (start) | j | arr[j] < arr[min_index] | min_index (update) | End of pass | Array |
|---|---|---|---|---|---|---|
| 0 | 0 | 1 | 1 < 5 Yes | 1 | | |
| 0 | | 2 | 4 < 1 No | 1 | | |
| 0 | | 3 | 2 < 1 No | 1 | | |
| 0 | | 4 | 8 < 1 No | 1 | Swap arr[0], arr[1] | [1, 5, 4, 2, 8] |
| 1 | 1 | 2 | 4 < 5 Yes | 2 | | |
| 1 | | 3 | 2 < 4 Yes | 3 | | |
| 1 | | 4 | 8 < 2 No | 3 | Swap arr[1], arr[3] | [1, 2, 4, 5, 8] |
| 2 | 2 | 3 | 5 < 4 No | 2 | | |
| 2 | | 4 | 8 < 4 No | 2 | No change (swaps with itself) | [1, 2, 4, 5, 8] |
| 3 | 3 | 4 | 8 < 5 No | 3 | No change (swaps with itself) | [1, 2, 4, 5, 8] |

## Task 5: both sorts in Python

```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
        print("Pass", i + 1, ":", arr)
    return arr


def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_index = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_index]:
                min_index = j
        arr[i], arr[min_index] = arr[min_index], arr[i]
        print("Pass", i + 1, ":", arr)
    return arr


print("Bubble sort")
print(bubble_sort([29, 10, 14, 37, 13]))
print()
print("Selection sort")
print(selection_sort([29, 10, 14, 37, 13]))
```

Output:

```
Bubble sort
Pass 1 : [10, 14, 29, 13, 37]
Pass 2 : [10, 14, 13, 29, 37]
Pass 3 : [10, 13, 14, 29, 37]
Pass 4 : [10, 13, 14, 29, 37]
[10, 13, 14, 29, 37]

Selection sort
Pass 1 : [10, 29, 14, 37, 13]
Pass 2 : [10, 13, 14, 37, 29]
Pass 3 : [10, 13, 14, 37, 29]
Pass 4 : [10, 13, 14, 29, 37]
[10, 13, 14, 29, 37]
```
