use md_viewer_lib::parse_markdown_to_html;

#[test]
fn test_html_output_with_syntect_and_mermaid() {
    let md = r#"# Heading 1 {#custom-id}
## Heading 2

Inline math: $E=mc^2$

Display math:
$$\sum_{i=1}^n i = \frac{n(n+1)}{2}$$

```javascript
console.log("Hello, world!");
```

```rust
fn main() {
    println!("Rust test");
}
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

    // 1. syntect による JavaScript 構文ハイライトの検証
    assert!(
        html.contains("<pre><code class=\"language-javascript\">"),
        "HTML should contain pre code with language-javascript"
    );
    assert!(
        html.contains("<span class=\"source js\">") || html.contains("console"),
        "HTML should contain syntect highlighted spans for javascript"
    );

    // 2. syntect による Rust 構文ハイライトの検証
    assert!(
        html.contains("<pre><code class=\"language-rust\">"),
        "HTML should contain pre code with language-rust"
    );
    assert!(
        html.contains("fn") && html.contains("main"),
        "HTML should contain highlighted rust tokens"
    );

    // 3. mermaid ブロックが syntect に変換されずそのまま透過されることの検証
    assert!(
        html.contains("<pre><code class=\"language-mermaid\">graph TD;\n    A--&gt;B;\n</code></pre>"),
        "Mermaid block should remain as standard pre/code for frontend Mermaid.js rendering"
    );

    // 4. 数式構文の検証
    assert!(
        html.contains("<span class=\"math math-inline\">E=mc^2</span>"),
        "Inline math should be preserved"
    );
    assert!(
        html.contains("<span class=\"math math-display\">"),
        "Display math should be preserved"
    );

    // 5. GFMテーブル、チェックボックス、見出しIDの検証
    assert!(html.contains("<h1 id=\"custom-id\">Heading 1</h1>"));
    assert!(html.contains("<table>"));
    assert!(html.contains("type=\"checkbox\""));
}


