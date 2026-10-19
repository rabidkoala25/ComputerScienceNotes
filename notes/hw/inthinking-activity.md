---
title: Inthinking Activity
date: 2026-10-19
topics: [HW]
tags: [algorithms]
---

## Part 1

```python
def linear_search(my_list, target, case_sensitive):
    for item in my_list:
        if case_sensitive:
            if item == target:
                return True
        else:
            if item.lower() == target.lower():
                return True
    return False
```

## Part 2

1. **Input: target = "orange", case_sensitive = True**
  - **Result:** True
  - "orange" == "orange"
2. **Input: target = "Orange", case_sensitive = True**
  - **Result:** False
  - "Orange" != "orange"
3. **Input: target = "Orange", case_sensitive = False**
  - **Result:** True
  - "Orange".lower() == "orange".lower()
