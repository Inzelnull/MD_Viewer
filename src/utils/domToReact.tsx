import React from 'react';
import katex from 'katex';
import { CodeBlock } from '../components/CodeBlock';
import { MermaidBlock } from '../components/MermaidBlock';
import { AlertBlock, AlertType } from '../components/AlertBlock';

export interface DomToReactOptions {
  parentDir: string;
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => void;
  LocalImageComponent: React.ComponentType<{
    src?: string;
    alt?: string;
    title?: string;
    parentDir: string;
  }>;
}

/**
 * CSS スタイル文字列（例: "text-align: center; margin: 10px;"）を
 * React の CSSProperties オブジェクトに変換するヘルパー
 */
function parseStyleString(styleStr: string): React.CSSProperties {
  const styles: Record<string, string> = {};
  if (!styleStr) return styles;

  styleStr.split(';').forEach((rule) => {
    const colonIdx = rule.indexOf(':');
    if (colonIdx === -1) return;
    const property = rule.substring(0, colonIdx).trim();
    const value = rule.substring(colonIdx + 1).trim();
    if (!property || !value) return;

    // kebab-case を camelCase に変換
    const camelProp = property.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    styles[camelProp] = value;
  });

  return styles as React.CSSProperties;
}

/**
 * DOM ノード属性を React 用 Props に変換
 */
function getReactProps(element: Element, options: DomToReactOptions, key: string): Record<string, any> {
  const props: Record<string, any> = { key };

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name === 'class') {
      props.className = value;
    } else if (name === 'for') {
      props.htmlFor = value;
    } else if (name === 'style') {
      props.style = parseStyleString(value);
    } else if (name === 'checked') {
      props.defaultChecked = true;
    } else if (name === 'disabled') {
      props.disabled = true;
    } else if (name === 'href') {
      props.href = value;
      if (element.tagName.toLowerCase() === 'a') {
        props.onClick = (e: React.MouseEvent<HTMLAnchorElement>) => options.onLinkClick(e, value);
      }
    } else if (!name.startsWith('on')) {
      props[attr.name] = value;
    }
  }

  // チェックボックス入力は読み取り専用に
  if (element.tagName.toLowerCase() === 'input' && element.getAttribute('type') === 'checkbox') {
    props.readOnly = true;
  }

  return props;
}

/**
 * 単一の DOM ノードを React ノードに再帰変換
 */
function convertNodeToReact(
  node: Node,
  options: DomToReactOptions,
  key: string
): React.ReactNode {
  // テキストノード
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  // 要素ノード以外はスキップ
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  // 1. 数式要素 (<span class="math math-inline"> または <span class="math math-display">)
  if (
    element.classList.contains('math') ||
    element.classList.contains('math-inline') ||
    element.classList.contains('math-display')
  ) {
    const isDisplay = element.classList.contains('math-display');
    const mathText = element.textContent || '';
    try {
      const renderedKaTeX = katex.renderToString(mathText, {
        displayMode: isDisplay,
        throwOnError: false,
      });
      return (
        <span
          key={key}
          className={element.className}
          dangerouslySetInnerHTML={{ __html: renderedKaTeX }}
        />
      );
    } catch {
      return (
        <code key={key} className="katex-error">
          {mathText}
        </code>
      );
    }
  }

  // 2. コードブロック (<pre><code>...</code></pre>)
  if (tagName === 'pre') {
    const codeEl = element.querySelector('code');
    if (codeEl) {
      const className = codeEl.className || '';
      const match = /language-([^\s]+)/.exec(className);
      const language = match ? match[1] : '';
      const codeString = (codeEl.textContent || '').replace(/\n$/, '');

      // Mermaid ダイアグラム
      if (language === 'mermaid') {
        return <MermaidBlock key={key} chart={codeString} />;
      }

      // 通常のコードブロック
      return (
        <CodeBlock key={key} language={language} value={codeString}>
          {codeString}
        </CodeBlock>
      );
    }
  }

  // 3. 引用 (<blockquote>) および GitHub Alerts 構文判定
  if (tagName === 'blockquote') {
    const text = element.textContent?.trim() || '';
    const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(text);

    if (alertMatch) {
      const alertType = alertMatch[1].toLowerCase() as AlertType;

      // 最初の <p> 内にある [!NOTE] プレフィックスを除去して再帰レンダリング
      const childNodes = Array.from(element.childNodes);
      let alertPrefixStripped = false;

      const renderedChildren = childNodes.map((child, idx) => {
        if (
          !alertPrefixStripped &&
          child.nodeType === Node.ELEMENT_NODE &&
          (child as HTMLElement).tagName.toLowerCase() === 'p'
        ) {
          alertPrefixStripped = true;
          const pEl = child as HTMLElement;
          const pClone = pEl.cloneNode(true) as HTMLElement;
          pClone.innerHTML = pClone.innerHTML.replace(
            /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?/i,
            ''
          );
          return convertNodeToReact(pClone, options, `${key}-p-${idx}`);
        }
        return convertNodeToReact(child, options, `${key}-c-${idx}`);
      });

      return (
        <AlertBlock key={key} type={alertType}>
          {renderedChildren}
        </AlertBlock>
      );
    }
  }

  // 4. 画像要素 (<img>)
  if (tagName === 'img') {
    const src = element.getAttribute('src') || '';
    const alt = element.getAttribute('alt') || '';
    const title = element.getAttribute('title') || '';
    const LocalImage = options.LocalImageComponent;
    return (
      <LocalImage
        key={key}
        src={src}
        alt={alt}
        title={title}
        parentDir={options.parentDir}
      />
    );
  }

  // 5. 通常の HTML 要素を再帰的に React.createElement で生成
  const props = getReactProps(element, options, key);

  // 見出し要素（h1〜h6）に id がない場合、テキストから自動スラッグを付与（rehype-slug の完全代替）
  if (/^h[1-6]$/.test(tagName) && !props.id) {
    const rawText = (element.textContent || '').trim();
    if (rawText) {
      const slug = rawText
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      if (slug) {
        props.id = slug;
      }
    }
  }

  const children = Array.from(element.childNodes).map((child, index) =>
    convertNodeToReact(child, options, `${key}-${index}`)
  );

  return React.createElement(tagName, props, ...children);
}

/**
 * HTML 文字列を受け取り、ReactNode の配列に変換するメイン関数
 */
export function domToReact(html: string, options: DomToReactOptions): React.ReactNode[] {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  return Array.from(doc.body.childNodes)
    .map((node, index) => convertNodeToReact(node, options, `node-${index}`))
    .filter(Boolean);
}
