---
title: RUST in an hour
link: rust-in-an-hour
date: 2026-03-25 14:47:59
description: RUST in an hour 阅读
tags:
  - RUST
categories:
  - [笔记, RUST]
---

# RUST in an hour
## Delete element
The underscore is a special name - or rather, a "lack of name". It basically means to throw away something:_
```Rust
// this does *nothing* because 42 is a constant
let _ = 42;

// this calls `get_thing` but throws away its result
let _ = get_thing();
```
---
## Tuples
the format of tuples is "(a,b,c...)" , the most usage are similar to tuples in Python:
```Rust
let pair = ('a', 17);
pair.0; // this is 'a'
pair.1; // this is 17

//you can define their type

let pairs:(i32, i32,char) = (1,2,'a');
```
the content of tuples are static
### Distructuring tuples
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

## Declare function