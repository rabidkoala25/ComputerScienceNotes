---
title: File processing (classwork)
date: 2026-11-16
topics: [File processing]
tags: [files, python, classwork]
description: B2.5.1 Construct code to perform file-processing operations
---

**B2.5 File processing**: independent study worksheet

## How to use this worksheet

> [!NOTE] How to use this worksheet
> 1. Work through Parts A to F in order. Each part starts with a READ box telling you exactly what to read in the textbook.
> 2. Read first, then answer. Go back to the textbook as often as you need to.
> 3. Write all code by hand, on paper, in the boxes. Do not use a computer until Part G.
> 4. Tick each part in the tracker below when you finish it.

> [!IMPORTANT] Skip the Java section
> We use Python. In the textbook PDF, read page 1, then skip pages 2–7 (File processing in Java), and read pages 8–11.

## By the end, you can:

- understand why programs need to store data in files
- open, read, write and append to text files in Python
- handle errors that can happen when working with files
- explain why files must be closed
- choose the right file mode and reading method for a task

## Progress tracker

| Part | Topic | Textbook | Done ✓ |
|---|---|---|---|
| **A** | Why use files? | p. 1 | |
| **B** | File modes and functions | p. 8 | |
| **C** | Writing to a file | p. 1, 8 | |
| **D** | Reading from a file | p. 8–9 | |
| **E** | Errors and closing files | p. 9–10 | |
| **F** | Write code by hand | p. 11 | |
| **G** | Check your code in Python | | |

# Part A: Why use files?

> [!NOTE] READ
> Textbook p. 1: the introduction, the margin notes on absolute and relative paths, and the paragraph on sequential files.

**A1** Fill in the gaps using the words in the box.

> **permanently · sequential · end · closed · line by line**

a) Data in variables is lost when a program is **closed**. A file stores data **permamently**.

b) A text file is a **sequential** file: data is read **line by line** and new records are added to the **end**.

**A2** Match each term to its meaning and an example.

| Term | Meaning | Example |
|---|---|---|
| **Absolute path** | 1. The location of a file from the current folder | X. `numbers.txt` |
| **Relative path** | 2. The full location of a file from the root directory | Y. `C:\Users\Ana\CS\numbers.txt` |

Absolute path → 2, Y

Relative path → 1, X

**A3** Give one example of a program that needs to keep data after it is closed.

**Answer:**

A game that saves game states so that you don't have to restart the game every time you play it. 

# Part B: File modes and functions

> [!NOTE] READ
> Textbook p. 8: File processing in Python (the five functions and the three modes).

**B1** Complete the table.

| Mode | What is it for? | If the file doesn’t exist… | What happens to existing content? |
|---|---|---|---|
| **"r"** |reading data from the file |error |nothing |
| **"w"** |writing data do the file |creates a new file |overwritten |
| **"a"** | adding text at the end of a file|creates a new file |stays the same, but with new data appended |

**B2** Which mode does `f = open("numbers.txt")` use?

- [ ] **A** `"w"`
- [x] **B** `"r"`
- [ ] **C** `"a"`

**B3** A game saves each new high score without losing the old ones. Which mode should it use?

- [ ] **A** `"w"`
- [ ] **B** `"r"`
- [x] **C** `"a"`

**B4** Match each function to what it does. Write the letter.

| Function | Letter | What it does |
|---|---|---|
| **open()** | E| A. Reads the whole file |
| **read()** | A| B. Reads one line |
| **readline()** |B | C. Saves text to the file |
| **write()** | C| D. Finishes with the file so it is saved and released |
| **close()** | D| E. Connects your program to a file, in a chosen mode |

# Part C: Writing to a file

> [!NOTE] READ
> Textbook p. 1: the process to write text to a file. Then p. 8: the first two Python examples.

**C1** Number the steps for writing to a file in the correct order (1–4).

| Order | Step |
|---|---|
|3 | Write the line to the file |
| 4| Close the file |
| 1| Open the file for write or append |
| 2| Prepare the line of text to be written |

**C2** What is in **pets.txt** after each program runs? Write the exact contents.

**Program 1**

```python
f = open("pets.txt", "w")
f.write("cat\n")
f.close()
f = open("pets.txt", "w")
f.write("dog\n")
f.close()
```

pets.txt contains:

```
dog
```

**Program 2**

```python
f = open("pets.txt", "w")
f.write("cat\n")
f.close()
f = open("pets.txt", "a")
f.write("dog\n")
f.close()
```

pets.txt contains:

```
cat
dog
```

**C3** What does `\n` do? What would pets.txt look like in Program 2 without it?

**Answer:**

\n commands for the file to be incremente by one line. if program 2 didn't have it our file would be:

```
catdog
```


# Part D: Reading from a file

> [!NOTE] READ
> Textbook p. 8–9: `read()`, `readline()`, and the loops that read every line.

For D1–D3, **numbers.txt** contains:

```
First line
Second line
```

**D1** What is printed?

```python
f = open("numbers.txt", "r")
print(f.readline())
f.close()
```

**Answer:**
only the first line, then a blank line

**D2** This loop prints every line. Why does it stop?

```python
f = open("numbers.txt", "r")
text = f.readline()
while text != "":
    print(text)
    text = f.readline()
f.close()
```

**Answer:**
At the end of the file, readline() is empty, simply "", and therefore text != "" is false, causing the loop to stop

**D3** Rewrite the loop in D2 using a **for** loop instead (textbook p. 10).

```python
f = open("numbers.txt", "r")
for line in f:
  print(line)
f.close()
```

**D4** When D2 runs, there is a blank line between each line of output. Why?

**Answer:**
Each line read from file still has \n at the end, and print() adds another \n, so there are two

**D5** The textbook text calls the function `readLine()`. What is its correct name in Python, and why does it matter?

**Answer:**
readline(), python is case sensitive so readLine() would throw an error

# Part E: Errors and closing files

> [!NOTE] READ
> Textbook p. 9–10: try/except, the Top tip, `os.path.exists`, and the last sentence on closing files.

**E1** Give two things that could go wrong when a program works with a file.

1. file not found
2. operation can't be done

**E2** What does a **try** / **except** block do, and why is it useful with files?

**Answer:**
try essentially tells the program to try its best to do the thing, so if the file has an error it just goes past the try / except block and doesn't crash

**E3** Your program says it can’t find **numbers.txt**, but you can see the file on your computer. Give the most likely reason (see the Top tip).

**Answer:**
the relative path will only work when the text file is in the same folder as the .py file. either moving the file or using the absolute path would fix it.

**E4** Complete the code so it only reads the file if it exists.

```python
import os

if os.path.exists("scores.txt"):
  f = open("scores.txt", "r",)
  print(f.read())
  f.close()
else:
  print("The file does not exist")
```

**E5** Find and fix the **4 bugs** in this code. It should add two scores to the end of the file, each on its own line.

```python
f = open(scores.txt, "r")
f.write("Ana 10")
f.write("Ben 8")
f.close
```

| Bug | What is wrong? | Fixed line |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |

**E6** Why must you always close a file?

**Answer:**

# Part F: Write code by hand

> [!IMPORTANT] Write each answer as a function
> Write on paper only. You will test your code in Part G.
>
> Use `open()`, the right mode, and `close()`. Indent carefully: one level inside the function, another inside each loop or if.

**F1** `write_names(filename, names)`

Write a function that writes each name in the list **names** to the file, one name per line.

Test: `write_names("names.txt", ["Ana", "Ben", "Cara"])`

**Hint:** Loop through the list. Remember `\n`.

```python

```

**F2** `count_lines(filename)`

Write a function that returns the number of lines in a file.

Test: `print(count_lines("names.txt"))` should print 3.

**Hint:** Start a counter at 0 and add 1 for each line.

```python

```

**F3** `average_of_file(filename)`

A file has one number on each line. Write a function that returns the average. (This is the Python version of the textbook’s Java example on p. 3.)

Test: if the file contains 4, 6 and 8, the function returns 6.0.

**Hint:** Each line is read as a string. Use `float()` to turn it into a number.

```python

```

*The next four come from the textbook’s exercises on p. 11.*

**F4** `greet()` (textbook Q1)

If name.txt exists, read the name from it. If not, ask the user for their name and save it in name.txt. Either way, print a personalised greeting.

**Hint:** Use `os.path.exists()` from Part E.

```python

```

**F5** `count_runs()` (textbook Q2)

Use a file to store how many times the program has run. Each time, read the number, add 1, save it, and return it. If the file doesn’t exist yet, start from 0.

**Hint:** Files store text, so use `int()` and `str()`.

```python

```

**F6** `make_numbers(filename)` (textbook Q3)

Write 100 random numbers between 1 and 70 to the file, one per line.

**Hint:** `import random` and `random.randint(1, 70)`

```python

```

**F7** `save_odds(in_file, out_file)` (textbook Q7)

Read the numbers from in_file and write only the odd numbers to out_file.

**Hint:** A number is odd if `number % 2 == 1`. You need two files open: one to read, one to write.

```python

```

> [!TIP] Extension (textbook Q4 and Q6)
> **X1.** `remove_duplicates(filename)`: remove duplicate numbers from the file, save it again, and print how many were deleted.
>
> **X2.** `sort_file(filename)`: read the numbers and sort them in ascending order using an efficient bubble sort.

```python

```

# Part G: Check your code in Python

Now type each function into Python exactly as you wrote it on paper, and run its test. Don’t fix it first: the point is to find out what you got right.

| Task | Worked first time ✓ | Needed fixing ✓ | What did you have to fix? |
|---|---|---|---|
| **F1** | | | |
| **F2** | | | |
| **F3** | | | |
| **F4** | | | |
| **F5** | | | |
| **F6** | | | |
| **F7** | | | |

## How confident are you?

| I can… | Confident | Getting there | Not yet |
|---|---|---|---|
| explain why programs store data in files | | | |
| choose between r, w and a modes | | | |
| read a file one line at a time with a loop | | | |
| write and append to a file | | | |
| use try/except and close files properly | | | |
