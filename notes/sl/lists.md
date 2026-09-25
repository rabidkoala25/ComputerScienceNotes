---
title: Lists
date: 2026-09-25
topics: [SL]
tags: [linked-lists, data, dynamic]
---

```python 
names = ["bob", "claire", "sally"]
print(len(names))
for x in names:
  print(x)
```

Finding the maximum:

```python
def find_max(my_list):
  # finds maximum value
  max_value = my_list[0]
  for i in my_list:
    if i > max_value:
      max_value = i
  return max_value

my_list = [1, 4, 7, 2, 7, 3, 5, 9, 1, 3, 0, 10, 6]
max_value = find_max(my_list)
print(max_value)
```
Adding elements:
```python
list = [1, 2, 3]

list.append(4)
print(list)

list.insert(-1, 5)
print(list)

list.insert(-2, 4.5)
print(list)


```

Other methods

```python
list = [1,3,5,7,9,2,4,8,6]

list.sort()
print(list)

list.reverse()
print(list)

index = list.index(5)
print(index)

count = list.count(1)
print(count)
```
