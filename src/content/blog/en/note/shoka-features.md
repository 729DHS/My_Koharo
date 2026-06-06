---
title: Shoka Theme Markdown Syntax Demo
date: 2026-02-07 12:00:00
categories:
  - 笔记
tags:
  - Shoka
  - Markdown
  - 测试
description: Demonstrates all Shoka theme-compatible special Markdown syntax
math: true
quiz: true
draft: true
---

This article showcases all special Markdown syntax migrated from the Hexo Shoka theme.

## Text Effects

### Underline (ins)

```markdown
++This is underlined text++

++Wavy underline++{.wavy}

++Dotted emphasis++{.dot}
```

++This is underlined text++

++Wavy underline++{.wavy}

++Dotted emphasis++{.dot}

### Underline Colors

```markdown
++Primary++{.primary} ++Success++{.success} ++Warning++{.warning} ++Danger++{.danger} ++Info++{.info}
```

++Primary++{.primary} ++Success++{.success} ++Warning++{.warning} ++Danger++{.danger} ++Info++{.info}

### Highlight (mark)

```markdown
==This is highlighted text==
```

==This is highlighted text==

### Subscript and Superscript

```markdown
H~2~O is the chemical formula for water
E = mc^2^ is the mass-energy equivalence
```

H~2~O is the chemical formula for water

E = mc^2^ is the mass-energy equivalence

### Colored Text

```markdown
[Red]{.red} [Pink]{.pink} [Orange]{.orange} [Yellow]{.yellow} [Green]{.green} [Aqua]{.aqua} [Blue]{.blue} [Purple]{.purple} [Grey]{.grey}
```

[Red]{.red} [Pink]{.pink} [Orange]{.orange} [Yellow]{.yellow} [Green]{.green} [Aqua]{.aqua} [Blue]{.blue} [Purple]{.purple} [Grey]{.grey}

### Rainbow Text

```markdown
[This text has a rainbow gradient effect]{.rainbow}
```

[This text has a rainbow gradient effect]{.rainbow}

### Keyboard Keys

```markdown
[Ctrl]{.kbd} + [C]{.kbd} to copy, [Ctrl]{.kbd} + [V]{.kbd} to paste
```

[Ctrl]{.kbd} + [C]{.kbd} to copy, [Ctrl]{.kbd} + [V]{.kbd} to paste

## Hidden Text (Spoiler)

```markdown
Here is some!!hidden text, click to reveal!!

Here is some!!blurred text, hover to reveal!!{.blur}
```

Here is some!!hidden text, click to reveal!!

Here is some!!blurred text, hover to reveal!!{.blur}

## Label Blocks

```markdown
[Default]{.label .default} [Primary]{.label .primary} [Info]{.label .info} [Success]{.label .success} [Warning]{.label .warning} [Danger]{.label .danger}
```

[Default]{.label .default} [Primary]{.label .primary} [Info]{.label .info} [Success]{.label .success} [Warning]{.label .warning} [Danger]{.label .danger}

## Note Blocks

```markdown
:::default
This is a default note block
:::

:::primary
This is a primary note block, used for important notes
:::

:::info
This is an info note block, used to provide additional information
:::

:::success
This is a success note block, used for positive feedback
:::

:::warning
This is a warning note block, please pay attention
:::

:::danger
This is a danger note block, proceed with caution
:::

:::info no-icon
This is an info block without icon
:::
```

:::default
This is a default note block
:::

:::primary
This is a primary note block, used for important notes
:::

:::info
This is an info note block, used to provide additional information
:::

:::success
This is a success note block, used for positive feedback
:::

:::warning
This is a warning note block, please pay attention
:::

:::danger
This is a danger note block, proceed with caution
:::

:::info no-icon
This is an info block without icon
:::

## Collapse Blocks

```markdown
+++primary Click to expand details
This is collapsed content, click the title to expand or collapse.

Supports **Markdown** formatting.

- List item 1
- List item 2
+++
```

```markdown
+++warning Notes
Here are some issues to pay attention to:

1. Note item one
2. Note item two
+++
```

~~~~markdown
+++danger Dangerous operation
Please make sure you know what you're doing!

```bash
rm -rf /  # Do not execute this command
```
+++
~~~~

+++primary Click to expand details
This is collapsed content, click the title to expand or collapse.

Supports **Markdown** formatting.

- List item 1
- List item 2
+++

+++warning Notes
Here are some issues to pay attention to:

1. Note item one
2. Note item two
+++

+++danger Dangerous operation
Please make sure you know what you're doing!

```bash
rm -rf /  # Do not execute this command
```
+++

## Tab Blocks

````markdown
;;;tab1 JavaScript
```js
console.log('Hello, World!');
```
;;;

;;;tab1 Python
```python
print('Hello, World!')
```
;;;

;;;tab1 Rust
```rust
fn main() {
    println!("Hello, World!");
}
```
;;;
````

;;;tab1 JavaScript
```js
console.log('Hello, World!');
```
;;;

;;;tab1 Python
```python
print('Hello, World!')
```
;;;

;;;tab1 Rust
```rust
fn main() {
    println!("Hello, World!");
}
```
;;;

## Ruby Annotations

```markdown
{取り返す^とりかえす} means "to take back" in Japanese.

{漢字^かんじ} ruby annotation example.
```

{取り返す^とりかえす} means "to take back" in Japanese.

{漢字^かんじ} ruby annotation example.

## Code Block Enhancement

`````markdown
```js title="hello.js" url="https://example.com" linkText="View Source" mark:1,3
const greeting = 'Hello';
const name = 'World';
console.log(`${greeting}, ${name}!`);
```

```bash command:("$":1-3)
npm install astro
npm run dev
npm run build
```
`````

```js title="hello.js" url="https://example.com" linkText="View Source" mark:1,3
const greeting = 'Hello';
const name = 'World';
console.log(`${greeting}, ${name}!`);
```

```bash command:("$":1-3)
npm install astro
npm run dev
npm run build
```

## Math Formulas

```markdown
Inline formula: $E = mc^2$

Block formula:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
```

Inline formula: $E = mc^2$

Block formula:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## Friend Link Cards

```markdown
{% links %}
- site: 余弦の博客
  url: https://blog.cosine.ren
  owner: cos
  desc: FE / ACG / 手工
  image: https://blog.cosine.ren/img/avatar.webp
  color: '#ed788b'
- site: Example Blog
  url: https://example.com
  owner: Alice
  desc: A tech-loving blog
  image: https://api.dicebear.com/7.x/avataaars/svg?seed=Alice
  color: '#BEDCFF'
{% endlinks %}
```

{% links %}
- site: 余弦の博客
  url: https://blog.cosine.ren
  owner: cos
  desc: FE / ACG / 手工
  image: https://blog.cosine.ren/img/avatar.webp
  color: '#ed788b'
- site: Example Blog
  url: https://example.com
  owner: Alice
  desc: A tech-loving blog
  image: https://api.dicebear.com/7.x/avataaars/svg?seed=Alice
  color: '#BEDCFF'
{% endlinks %}

## Media

### Audio

```markdown
{% media audio %}
- name: Sample Audio
  url: https://music.163.com/#/song?id=3339210292
{% endmedia %}
```

{% media audio %}
- name: Sample Audio
  url: https://music.163.com/#/song?id=3339210292
{% endmedia %}

### Audio Playlist

```markdown
{% media audio %}
- title: 诗岸 Playlist 山山～全是山山～
  list:
    - https://music.163.com/#/playlist?id=8676645748
- title: 『诗岸』全是山山！
  list:
    - https://music.163.com/#/playlist?id=17606384886
{% endmedia %}
```

{% media audio %}
- title: 诗岸 Playlist 山山～全是山山～
  list:
    - https://music.163.com/#/playlist?id=8676645748
- title: 『诗岸』全是山山！
  list:
    - https://music.163.com/#/playlist?id=17606384886
{% endmedia %}

### Video

```markdown
{% media video %}
- name: "Test 1"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
- name: "Test 2"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
{% endmedia %}
```

{% media video %}
- name: "Test 1"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
- name: "Test 2"
  url: https://cdn.kastatic.org/ka-youtube-converted/O_nY1TM2RZM.mp4/O_nY1TM2RZM.mp4#t=0
{% endmedia %}

## Quiz

Four question types are supported: **Single Choice**, **Multiple Choice**, **True/False**, **Fill-in-the-blank**.

### Single Choice

```markdown
- Which of the following is a primitive data type in JavaScript?{.quiz}
  - Object{.options}
  - Array{.options}
  - Symbol{.correct}
  - Function{.options}

> Explanation: Symbol is a primitive data type introduced in ES6, while Object, Array, and Function are all reference types.
```

- Which of the following is a primitive data type in JavaScript?{.quiz}
  - Object{.options}
  - Array{.options}
  - Symbol{.correct}
  - Function{.options}

> Explanation: Symbol is a primitive data type introduced in ES6, while Object, Array, and Function are all reference types.

### Multiple Choice

```markdown
- Which of the following are CSS layout methods?{.quiz .multi}
  - Flexbox{.correct}
  - jQuery{.options}
  - Grid{.correct}
  - Float{.correct}

> Explanation: Flexbox, Grid, and Float are all CSS layout methods. jQuery is a JavaScript library, not a CSS layout.
```

- Which of the following are CSS layout methods?{.quiz .multi}
  - Flexbox{.correct}
  - jQuery{.options}
  - Grid{.correct}
  - Float{.correct}

> Explanation: Flexbox, Grid, and Float are all CSS layout methods. jQuery is a JavaScript library, not a CSS layout.

### True/False

```markdown
- Variables declared with `const` cannot be reassigned, but their properties can be modified.{.quiz .true}

> Explanation: `const` only ensures the variable binding is immutable. If the variable points to an object, its properties can still be modified.

- HTML is a programming language.{.quiz}

> Explanation: HTML (HyperText Markup Language) is a markup language, not a programming language. It has no logic control capabilities.
```

- Variables declared with `const` cannot be reassigned, but their properties can be modified.{.quiz .true}

> Explanation: `const` only ensures the variable binding is immutable. If the variable points to an object, its properties can still be modified.

- HTML is a programming language.{.quiz}

> Explanation: HTML (HyperText Markup Language) is a markup language, not a programming language. It has no logic control capabilities.

### Fill-in-the-blank

```markdown
- In JavaScript, `typeof null` returns [object]{.gap}.{.quiz .fill}

> Explanation: This is a historical bug. The type tag of `null` is the same as object, so `typeof null` returns `"object"`. A common wrong answer is [null]{.mistake}.
```

- In JavaScript, `typeof null` returns [object]{.gap}.{.quiz .fill}

> Explanation: This is a historical bug. The type tag of `null` is the same as object, so `typeof null` returns `"object"`. A common wrong answer is [null]{.mistake}.

- In CSS, [Flexbox]{.gap} is suitable for one-dimensional layouts, [Grid]{.gap} is suitable for two-dimensional layouts, and [Float]{.gap} is a traditional layout method.{.quiz .fill}

> Explanation: Flexbox is a one-dimensional layout model (row or column), Grid is a two-dimensional layout model (controlling both rows and columns), and Float is a traditional layout method from the CSS2 era.

## Encrypted Content Block

Using the `:::encrypted{password="password"}` syntax creates an encrypted block. Content within the block is truly encrypted using AES-256-GCM at build time, and the password does not appear in the final HTML. Readers need to enter the correct password to decrypt and view the content.

**Use Cases**: Preventing search engines/crawlers from indexing sensitive content (such as private resource links, paid content excerpts, etc.).

:::info
True encryption cannot be achieved on the frontend: the password must always be entered client-side, and both ciphertext and algorithms are visible to users, so security entirely depends on password strength. The purpose of this feature is not to resist targeted attacks, but to **prevent search engines and crawlers from directly indexing plaintext content**. For this scenario, AES-256-GCM is sufficient: the build output contains only ciphertext, no password or plaintext, so search engines cannot index the encrypted block's content.
:::

````markdown

:::encrypted{password="test"}
This is encrypted content, supporting full Markdown syntax:

- **Bold**, *italic*, ~~strikethrough~~
- `Inline code`
- [Link](https://example.com)

```js
console.log('Code inside encrypted content also has syntax highlighting!');
```

Inline formula $E = mc^2$ also renders normally.
:::

:::encrypted{password="another"}
Each encrypted block can have an independent password.
:::
````

:::encrypted{password="test"}
This is encrypted content, supporting full Markdown syntax:

- **Bold**, *italic*, ~~strikethrough~~
- `Inline code`
- [Link](https://example.com)

```js
console.log('Code inside encrypted content also has syntax highlighting!');
```

Inline formula $E = mc^2$ also renders normally.
:::

:::encrypted{password="another"}
Each encrypted block can have an independent password.
:::