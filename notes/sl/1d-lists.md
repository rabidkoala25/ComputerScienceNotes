---
title: 1D Lists
date: 2026-09-25
topics: [HW]
tags: [data, dynamic, arrays]
---

# 1D lists

## Programming exercises

### first last

```python
nums = [1975, 1994, 1998, 2004, 2002, 1975]
print(nums[0] == nums[len(nums) - 1])
```

### sum-average-odd
```python
size = int(input("Enter size: "))
nums = [0] * size
for i in range(size):
    nums[i] = int(input("Enter a number: "))

evenSum = 0
total = 0
oddCount = 0
for i in range(size):
    total = total + nums[i]
    if nums[i] % 2 == 0:
        evenSum = evenSum + nums[i]
    else:
        oddCount = oddCount + 1

print("Sum of evens:", evenSum)
print("Average:", total / size)
print("Odd numbers:", oddCount)
```

### reverse

```python
names = ["Elon Musk", "Jeff Bezos", "Mark Zuckerberg", "Bill Gates", "Larry Page"]
reversedNames = [""] * 5
for i in range(5):
    reversedNames[i] = names[4 - i]
print(reversedNames)
```

## Video notes

- 1D array: collection of items of the same data type under one identifier
- fixed size (static), Python lists are dynamic
- elements accessed by index: `companies[2]`
- index starts at 0, last index is length - 1
- 1D = one row, one index
- 2D = table of rows and columns, two indices: `grid[row][col]`

## List operations



```python
# number of items
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
print(len(items))
```

```python
# add to end
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
items.append("Google")
print(items)
```

```python
# insert at a position
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
items.insert(1, "SpaceX")
print(items)
```

```python
# remove using index
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
items.pop(2)
print(items)
```

```python
# index of a value
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
print(items.index("Facebook"))
```

```python
# count how many times a value occurs
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
print(items.count("Kindle"))
```

```python
# remove a value
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
items.remove("Kindle")
print(items)
```

```python
# sort
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
items.sort()
print(items)
```

```python
# reverse
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
items.reverse()
print(items)
```

```python
# combine two lists
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
more = ["Alexa", "Xbox"]
combined = items + more
print(combined)
```

```python
# first three items
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
print(items[:3])
```

```python
# every second item
items = ["Tesla", "Kindle", "Facebook", "Kindle", "Windows"]
print(items[::2])
```
