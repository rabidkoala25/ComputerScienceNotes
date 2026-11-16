"""A minimal singly linked list, to go with the notes."""


class Node:
    def __init__(self, data, next=None):
        self.data = data
        self.next = next


class LinkedList:
    def __init__(self, items=()):
        self.head = None
        for item in reversed(list(items)):
            self.push_front(item)

    def push_front(self, data):
        self.head = Node(data, self.head)

    def __iter__(self):
        current = self.head
        while current is not None:
            yield current.data
            current = current.next

    def __repr__(self):
        return " -> ".join(map(str, self)) + " -> None"


if __name__ == "__main__":
    lst = LinkedList([12, 7, 31])
    lst.push_front(5)
    print(lst)
