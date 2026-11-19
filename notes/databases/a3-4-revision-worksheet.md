---
title: A3.4 revision worksheet (classwork)
date: 2026-11-19
topics: [Databases]
tags: [hl, database, classwork]
---



# A3.4 Revision Worksheet — Alternative Databases

## Overview

In this lesson you'll revise **A3.4** on your own, using your textbook, the slides and the InThinking ebook. Work through the four stations in order. Use your own words: if you can't explain it without copying, you don't know it yet.

> **Submit:** photos of all your work on Toddle before the next HL lesson.
> Also revise for your summative on **A3 Databases**.

---

## 1. Brain dump (5 min, books closed)

Write down everything you remember about each heading. Then open your books and add anything you missed **in a different colour**. The things you add are what to focus on today.

### Since i do not know this yet i will move on to the next, perhaps i will return once i have learned it again.

---

## 2. Revision stations (about 10 min each)

### Station A: A3.4.1 Types of databases

Read the section in your textbook and on InThinking, then fill in the table.

|Type|What is it?|Two key characteristics|One real-world use|
|-|-|-|-|
|**NoSQL (document)**|NoSQL document databases are databases that store object-focused data within a file, such as JSON. Document databases contain pairs of fields and values, and each group of fields categorized within its own object.|1. Flexible data model, good for semi-structured and unstructured data sets <br> <br> 2. Easily represents hierarchal data|e-commerce, big data, modern web applications|
|**Cloud**|Can be SQL or NoSQL, stores databases on a cloud service.|1. **Self-managed database:** Infrastructure-as-a-service (IaaS), database on a virtual machine operated by a provider, the provider only manages the infrastructure while the customer manages deployment, admin, and maintenance, having total control <br><br>2. **Managed database services:** Fully managed by a provider, not only is infrastructure managed but also administration, updates, everything. customers monitor it and collaborate with the provider but generall do not have much action in administrative functions<br><br>|Amazon DynamoDB, Azure Cosmos DB, Amazon RDS, Google Cloud SQL, Azure SQL, useful for startups, IoT, web applications.|
|**Spatial**|Store and query data related to objects in space.|1. use spatial data types, spatial indexes and support geometric functions. <br><br>2. Can be 2D, 3D, even 4D, shapes, coordinates, lines, points, polygons. <br><br>|GIS, mapping, Oracle Spatial, PostGis|
|**In-memory**|store data entirely within RAM|1. extremely fast <br><br>2. low latency, fast data access and transaction processing<br><br>|Gaming, real-time analysis, Redis, Oracle TimesTen|

#### Happy Paws: which database type?

Decide which type Happy Paws should use for each need, and give a reason.

|#|Need|Database type|Reason|
|-|-|-|-|
|1|Finding the nearest branch to an adopter's postcode|Spatial database|needs to deal with spatial calculations such as distance between data points.|
|2|A live leaderboard for a fundraising challenge|In-memory|Updates fast, does not need to be fully permament rather just needs to display the data during the challenge.|
|3|Animal profiles where each species has different fields|NoSQL (document)|Requires fields and values for each species, doesn't need to change very often.|
|4|Letting staff at three branches access the same system online| Cloud Database


---

### Station B: A3.4.2 Data warehouses

For each characteristic, write what it means in one sentence and tick what it mainly supports.

|Characteristic|What it means (one sentence)|Data management|Business intelligence|Both|
|-|-|:-:|:-:|:-:|
|**Append-only**|<br><br><br>|☐|☐|☐|
|**Subject-oriented**|<br><br><br>|☐|☐|☐|
|**Integrated**|<br><br><br>|☐|☐|☐|
|**Time-variant**|<br><br><br>|☐|☐|☐|
|**Non-volatile**|<br><br><br>|☐|☐|☐|
|**Optimised for query performance**|<br><br><br>|☐|☐|☐|

#### Question

Why can't Happy Paws' everyday SQLite database easily answer *"Which breeds have become more popular over five years?"*

 

 

 

 

 

 

---

### Station C: A3.4.3 OLAP and data mining

#### 1. OLAP vs data mining

Explain the difference in **two sentences**.

> *Hint: one tells you what happened, the other finds what you didn't know.*

 

 

 

 

#### 2. Name the technique

Name the data mining technique that suits each problem.

||Problem|Technique|
|-|-|-|
|(a)|Flag a donation that's 50 times bigger than normal|<br><br>|
|(b)|Predict how many animals will arrive next winter|<br><br>|
|(c)|Decide whether a new volunteer is likely to stay for a year (yes or no)|<br><br>|
|(d)|Find groups of supporters with similar giving habits|<br><br>|
|(e)|Discover that people who sponsor a cat often also buy a calendar|<br><br>|
|(f)|Find the usual order of steps from first website visit to adoption|<br><br>|

#### 3. Ethics

Describe **one** ethical issue with data mining (such as privacy, bias or transparency) and give a real example.

**Ethical issue:**

 

 

 

**Real example:**

 

 

 

 

---

### Station D: A3.4.4 Distributed databases

Complete a feature card for each feature.

#### Replication

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Partitioning: horizontal

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Partitioning: vertical

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Concurrency control

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Fault tolerance

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Location transparency

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Scalability

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Global query processing

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Data security

|Definition (own words)|Problem it solves|Real-world example|
|-|-|-|
|<br><br><br><br>|<br><br><br><br>|<br><br><br><br>|

#### Questions

**Why is keeping data consistent harder in a distributed database?**

 

 

 

 

 

**What is the trade-off between synchronous and asynchronous replication?**

||Synchronous|Asynchronous|
|-|-|-|
|**How it works**|<br><br><br>|<br><br><br>|
|**Advantage**|<br><br><br>|<br><br><br>|
|**Disadvantage**|<br><br><br>|<br><br><br>|

**The trade-off in one sentence:**

 

 

 

---

## 3. Exam practice (10 min, books closed)

### Q1. [4 marks]

Outline two characteristics of a NoSQL database that make it suitable for an online shop's product catalogue.

 

 

 

 

 

 

 

 

### Q2. [4 marks]

Explain how the time-variant and integrated characteristics of a data warehouse support business intelligence.

 

 

 

 

 

 

 

 

### Q3. [4 marks]

Distinguish between OLAP and data mining.

 

 

 

 

 

 

 

 

### Q4. [4 marks]

A global online retailer uses a distributed database. Describe how replication and partitioning improve its performance and availability.

 

 

 

 

 

 

 

 

---

## Success criteria

* [ ] I've completed all four stations in my own words.
* [ ] My brain dump shows, in a different colour, what I'd forgotten.
* [ ] I've answered the exam questions without using my notes.
* [ ] I've written down one question to ask in the next lesson.

**My question for next lesson:**
