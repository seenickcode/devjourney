---
setup: |
  import Layout from '../../layouts/Main.astro';
  import StepHeader from '../../components/steps/StepHeader.astro'
  import Author from '../../components/steps/Author.astro'
title: Hello world!
publishDate: 12 Sep 2021
name: Nate Moore
value: 128
description: Just a Hello World Post!
---

<Layout title={frontmatter.title} description={frontmatter.description}>
  <StepHeader name={frontmatter.name} href="https://twitter.com/n_moore" client:load />

This is so cool!

Do variables work {frontmatter.value \* 2}?

```javascript
// Example JavaScript

const x = 7;
function returnSeven() {
  return x;
}
```

</Layout>
