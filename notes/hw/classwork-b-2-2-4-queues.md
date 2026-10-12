---
title: CLASSWORK B 2.2.4 Queues
date: 2026-10-12
topics: [HW]
---

# B2.2.4 Queues Homework:

## Review Questions:

### 1. Define the term "stack".

data structure that works on LIFO (last in first out). items can only be added and removed from the top

### 2. Define the term "queue".

data structure that works on FIFO (first in first out). items are added at the back (rear) and removed from the front

### 3. Identify the main operations of a stack.

- push - add item to top
- pop - remove top item
- peek - look at top item without removing it
- isEmpty
- isFull

### 4. Identify the main operations of a queue.

- enqueue - add item to rear
- dequeue - remove item from front
- front/peek - look at front item without removing it
- isEmpty
- isFull

### 5. Explain the FIFO and the LIFO principles and how they apply to stacks and queues.

FIFO - first item added is the first one removed. Queue uses this, items join at the back and leave from the front so the order stays the same.

LIFO - last item added is the first one removed. Stack uses this, adding and removing both happen at the top so the newest item always comes out first.

### 6. Identify a real-life scenario where you could use a stack.

Back button in a web browser. each page you visit is pushed onto the stack, pressing back pops the current page and takes you to the one before.

### 7. Identify a real-life scenario where you could use a queue.

Printer shared by a class. print jobs go into a queue in the order they're sent and get printed in that order.

### 8. Outline a situation where the use of a stack might be more efficient than the use of a queue.

Undo in a text editor. undo needs the most recent action, in a stack it's at the top so it can be popped straight away. In a queue it would be at the back behind all the older actions.

### 9. Outline a situation where the use of a queue might be more efficient than the use of a stack.

Keyboard buffer. letters have to appear in the order they were typed. queue gives oldest letter first, stack would give last letter typed first which is backwards.

### 10. Identify a scenario where you might combine a stack and a queue within the same program.

Checking if a word is a palindrome.
- put each letter into a stack and a queue
- take one letter out of each at the same time and compare
- stack gives letters reversed, queue gives them in normal order
- if all pairs match, word is a palindrome

### 11. You must store a list of numbers in a particular sequence and then retrieve them in reverse order. Identify the data structure that is most suitable for this task and explain your reasoning.

Stack. because it's LIFO, push the numbers in order then pop them all and they come out reversed.

### 12. Outline three uses of a stack.

- undo - each action pushed onto stack, undo pops the most recent one
- browser back button - pages pushed as you visit them, back pops the current one
- open apps on a phone - opening an app puts it on top, swiping up shows most recent app first with older ones behind it

### 13. Outline three uses of a queue.

- printer queue - jobs printed in order they were sent
- keyboard buffer - characters processed in order they were typed
- simulations e.g. supermarket checkout, customers join at the back and get served from the front

### 14. Describe two characteristics of a stack.

- LIFO, last item in is first out
- only one point of access (the top). to get to an item lower down you have to pop everything above it

### 15. Describe two characteristics of a queue.

- FIFO, first item in is first out
- two ends, items added at rear and removed from front. front pointer and rear pointer keep track of them

### 16. Compare the use of a stack with arrays or lists.

Similarities:
- both store items in order
- stack is usually built using an array/list

Differences:
- array/list can access any element by index, can insert or remove anywhere
- stack only lets you use the top (push, pop, peek)
- stack is less flexible but simpler and harder to mess up when you only need LIFO

### 17. Compare static and dynamic data structures in terms of data storage and data access.

Both store collections of data and can be used to build stacks and queues.

Storage:
- static (e.g. array) - fixed size set when created, memory reserved even if not used, can become full
- dynamic (e.g. linked list) - grows and shrinks while program runs, only uses the memory it needs

Access:
- static - elements stored next to each other in memory, can go straight to any element by index so it's fast
- dynamic - each node points to the next one, have to start at the head and follow the links to find an item, slower

### 18. Explain the meaning of stack overflow and stack underflow and describe when they occur.

Stack overflow - trying to push onto a stack that's already full e.g. pushing an 8th item onto a stack with max size 7. Also happens when a recursive function calls itself too many times and the call stack runs out of space.

Stack underflow - trying to pop from an empty stack, nothing there to remove.

check isFull before pushing and isEmpty before popping to avoid both.

### 19. Use a stack to evaluate the following arithmetic expression: 5 2 \* 3 2 + -

- 5: push 5, stack = [5]
- 2: push 2, stack = [5, 2]
- \*: pop 2 and 5, 5 \* 2 = 10, push 10, stack = [10]
- 3: push 3, stack = [10, 3]
- 2: push 2, stack = [10, 3, 2]
- +: pop 2 and 3, 3 + 2 = 5, push 5, stack = [10, 5]
- -: pop 5 and 10, 10 - 5 = 5, push 5, stack = [5]

Answer = 5

## Programming Exercises:

### 1. Construct a program that creates a stack that has a maximum size of seven elements. Push five words into the stack. Display the top element. Pop two words from the stack and display the top element.

```python
stack = []
max_size = 7

def push(word):
    if len(stack) == max_size:
        print("Stack is full, can't push", word)
    else:
        stack.append(word)

def pop():
    if len(stack) == 0:
        print("Stack is empty")
    else:
        return stack.pop()

def peek():
    if len(stack) == 0:
        print("Stack is empty")
    else:
        return stack[len(stack) - 1]

push("cat")
push("dog")
push("bird")
push("fish")
push("horse")
print("Stack:", stack)
print("Top element:", peek())

print("Popped:", pop())
print("Popped:", pop())
print("Stack:", stack)
print("Top element:", peek())
```

Output:

```
Stack: ['cat', 'dog', 'bird', 'fish', 'horse']
Top element: horse
Popped: horse
Popped: fish
Stack: ['cat', 'dog', 'bird']
Top element: bird
```

### 2. Construct a program to reverse the elements from a given queue using a stack.

```python
queue = [1, 2, 3, 4, 5]
stack = []

print("Original queue:", queue)

while len(queue) > 0:
    item = queue.pop(0)
    stack.append(item)

while len(stack) > 0:
    item = stack.pop()
    queue.append(item)

print("Reversed queue:", queue)
```

Output:

```
Original queue: [1, 2, 3, 4, 5]
Reversed queue: [5, 4, 3, 2, 1]
```
