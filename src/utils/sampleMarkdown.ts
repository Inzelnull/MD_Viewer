export const sampleMarkdown = `# VS Code Markdown Preview Viewer

Welcome to the **Tauri-powered Markdown Preview Application**! This viewer is engineered to provide a seamless, rich visual preview experience just like Visual Studio Code.

---

## 🚀 Key Features

- **GitHub Flavored Markdown (GFM)**: Full support for tables, task lists, strikethrough, and autolinks.
- **Syntax Highlighting**: Beautiful code blocks with one-click copy and language tags.
- **GitHub Alerts**: Rich alert callouts (\`[!NOTE]\`, \`[!TIP]\`, \`[!IMPORTANT]\`, \`[!WARNING]\`, \`[!CAUTION]\`).
- **LaTeX Math Formulas**: Fast rendering with KaTeX ($E=mc^2$).
- **Mermaid Diagrams**: Dynamic sequence, flowchart, and class diagrams.
- **Live File Watching**: Instant auto-reload whenever you save in an external editor.
- **Interactive TOC**: Smooth scrolling and automatic active heading highlighting.

---

## 📌 GitHub Alerts & Callouts

> [!NOTE]
> Useful information that users should know, even when skimming.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

---

## 📊 Rich Table Support

| Feature | Support Status | Renderer | Performance |
| :--- | :---: | :--- | :--- |
| **GFM Tables** | ✅ Yes | Unified / Remark | Sub-millisecond |
| **Syntax Highlight** | ✅ Yes | Highlight.js | Instant |
| **KaTeX Math** | ✅ Yes | KaTeX v0.16 | Fast DOM |
| **Mermaid Charts** | ✅ Yes | Mermaid.js | Vector SVG |
| **Live Hot Reload** | ✅ Yes | Rust \`notify\` | Instant IPC |

---

## 📝 Task Lists

- [x] Create Tauri 2.0 Rust backend
- [x] Configure GFM & Markdown parser plugins
- [x] Implement live file watcher with notify
- [x] Add VS Code dark and light theme palettes
- [ ] Add PDF export customization
- [ ] Add plugin extensions

---

## 💻 Code & Syntax Highlighting

### Rust Example
\`\`\`rust
use tauri::Emitter;

#[tauri::command]
fn start_watching_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    println!("Watching file: {}", path);
    app.emit("file-changed", &path).map_err(|e| e.to_string())?;
    Ok(())
}
\`\`\`

### TypeScript / React Example
\`\`\`tsx
import React, { useState } from 'react';

export const Counter: React.FC = () => {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
};
\`\`\`

---

## 📐 Mathematical Equations (KaTeX)

Inline formula: The Schrödinger equation in 1D is given by $i\hbar \frac{\partial \psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2 \psi}{\partial x^2} + V(x)\psi$.

Display block equation:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n
$$

---

## 📈 Mermaid Diagrams

### Architecture Flowchart
\`\`\`mermaid
graph TD
    A[Markdown File on Disk] -->|notify event| B(Tauri Rust Backend)
    B -->|IPC emit 'file-changed'| C(React WebView)
    C -->|Unified / Remark Parser| D{Rehype Pipeline}
    D --> E[GFM Table / Tasklist]
    D --> F[Highlight.js Code]
    D --> G[KaTeX Math Engine]
    D --> H[Mermaid SVG Renderer]
    E & F & G & H --> I[Rich VS Code Preview UI]
\`\`\`

### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Editor as External Editor (VS Code)
    participant FS as File System
    participant Rust as Tauri Backend (Notify)
    participant UI as Previewer (React)

    User->>Editor: Edit Markdown & Save (Ctrl+S)
    Editor->>FS: Write file to disk
    FS-->>Rust: OS File Modify Event
    Rust->>UI: Emit IPC 'file-changed'
    UI->>Rust: Invoke 'read_markdown_file'
    Rust-->>UI: Return fresh content & metadata
    UI->>User: Re-render smooth preview instantly
\`\`\`
`;
