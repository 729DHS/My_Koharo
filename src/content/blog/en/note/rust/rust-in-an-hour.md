---
title: Rust in an Hour
link: rust-in-an-hour
date: 2026-03-25 14:47:59
description: Rust in an Hour reading notes
tags:
  - RUST
categories:
  - [笔记, RUST]
---

# Rust in an Hour
## Delete Element
The underscore is a special name - or rather, a "lack of name". It basically means to throw away something:_
```rust
// this does *nothing* because 42 is a constant
let _ = 42;

// this calls `get_thing` but throws away its result
let _ = get_thing();
```
---
## Tuples
the format of tuples is "(a,b,c...)" , the most usage are similar to tuples in Python:
```rust
let pair = ('a', 17);
pair.0; // this is 'a'
pair.1; // this is 17

//you can define their type

let pairs:(i32, i32,char) = (1,2,'a');
```
the content of tuples are static
### Destructuring Tuples
example:
```rust
let (x, y, z) = (1, 2, 3);
```

## Statements
```rust
let x = vec![1, 2, 3, 4, 5, 6, 7, 8]
    .iter()
    .map(|x| x + 3)
    .fold(0, |x, y| x + y);
```

## Declare Function