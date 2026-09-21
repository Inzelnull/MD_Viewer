use md_viewer_lib::parse_markdown_to_html;

#[test]
fn test_html_output() {
    let md = r#"# Heading 1 {#custom-id}
## Heading 2

Inline math: $E=mc^2$

Display math:
$$\sum_{i=1}^n i = \frac{n(n+1)}{2}$$

```javascript
console.log("Hello, world!");
```

```mermaid
graph TD;
    A-->B;
```

> [!NOTE]
> This is a note alert!

> Normal quote

- [x] Done task
- [ ] Todo task

| Feature | Supported |
| :--- | :---: |
| Math | Yes |

![alt text](images/sample.png)
[link to section](#heading-2)
"#;

    let html = parse_markdown_to_html(md);
    println!("=== RENDERED HTML ===\n{}", html);
}
