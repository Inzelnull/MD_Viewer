import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

import { CodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';
import { AlertBlock, AlertType } from './AlertBlock';
import { TocItem } from '../types/markdown';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/vs2015.css';

interface MarkdownViewProps {
  /** レンダリングするMarkdown文字列 */
  content: string;
  /** Markdownファイルの親ディレクトリ（ローカル相対画像の解決用） */
  parentDir: string;
  /** 拡大率（ズームスケール） */
  zoomLevel: number;
  /** レンダリングされたDOMから抽出された見出しリストを親に渡すコールバック */
  onHeadingsExtracted?: (headings: TocItem[]) => void;
}

/**
 * ローカルの相対パス画像・絶対パス画像を非同期にBase64 Data URLへ解決して表示するコンポーネント
 */
const LocalImage: React.FC<{ src?: string; alt?: string; title?: string; parentDir: string }> = ({
  src,
  alt,
  title,
  parentDir,
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(src || '');

  useEffect(() => {
    let isMounted = true;
    if (!src) return;

    // Web URL (http/https) や既にData URLの場合はそのまま使用
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      setResolvedSrc(src);
      return;
    }

    // Tauri の Rust バックエンドコマンドを呼び出してローカル画像をBase64形式で取得
    invoke<string>('read_local_asset', {
      assetPath: src,
      baseDir: parentDir || null,
    })
      .then((dataUrl) => {
        if (isMounted) {
          setResolvedSrc(dataUrl);
        }
      })
      .catch((err) => {
        console.warn('ローカル画像の読み込みに失敗しました:', src, err);
        if (isMounted) {
          setResolvedSrc(src);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src, parentDir]);

  return <img src={resolvedSrc} alt={alt || ''} title={title} loading="lazy" />;
};

/**
 * Markdown 本文のレンダリングコンポーネント
 * GFM（表・タスクリスト）、KaTeX数式、Mermaidダイアグラム、コードハイライト、
 * GitHub Alerts、相対画像解決などを包括的に処理します。
 */
export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  parentDir,
  zoomLevel,
  onHeadingsExtracted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * レンダリング完了後にDOMから実際の見出し要素（h1〜h6）を直接走査・抽出し、
   * 目次（TOC）との100%正確なリンクを構築します。
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current || !onHeadingsExtracted) return;

      const headingElements = containerRef.current.querySelectorAll<HTMLElement>(
        'h1, h2, h3, h4, h5, h6'
      );

      const items: TocItem[] = [];
      headingElements.forEach((el, index) => {
        // IDが存在しない場合は自動連番を割り当て
        if (!el.id) {
          el.id = `heading-auto-${index + 1}`;
        }
        const level = parseInt(el.tagName.replace('H', ''), 10) || 1;
        const text = el.textContent?.trim() || `セクション ${index + 1}`;

        items.push({
          id: el.id,
          text,
          level,
        });
      });

      // 親コンポーネントへ抽出した見出し一覧を通知
      onHeadingsExtracted(items);
    }, 100);

    return () => clearTimeout(timer);
  }, [content, onHeadingsExtracted]);

  /**
   * リンククリック時のハンドリング
   * - ページ内アンカー（#heading）: スムーズスクロール
   * - 外部リンク（http/https/mailto）: 外部ブラウザで安全に開く
   */
  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = decodeURIComponent(href.substring(1));
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      e.preventDefault();
      try {
        await openUrl(href);
      } catch (err) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="markdown-body"
      style={{
        transform: `scale(${zoomLevel})`,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex, rehypeHighlight]}
        components={{
          // コードブロックおよび Mermaid のカスタムレンダリング
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            // Mermaid ダイアグラムの場合
            if (language === 'mermaid') {
              return <MermaidBlock chart={codeString} />;
            }

            // 複数行コードブロックの場合
            const isCodeBlock = match || String(children).includes('\n');
            if (isCodeBlock) {
              return (
                <CodeBlock language={language} value={codeString}>
                  {children}
                </CodeBlock>
              );
            }

            // インラインコードの場合
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },

          // 引用（blockquote）および GitHub Alerts 構文のカスタムレンダリング
          blockquote({ children }) {
            const childrenArray = React.Children.toArray(children);
            const firstChild = childrenArray[0];

            if (
              React.isValidElement<{ children?: React.ReactNode }>(firstChild) &&
              firstChild.props &&
              firstChild.props.children
            ) {
              const innerText = React.Children.toArray(firstChild.props.children)
                .map((c) => (typeof c === 'string' ? c : ''))
                .join('')
                .trim();

              // [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION] を判定
              const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(innerText);

              if (alertMatch) {
                const alertType = alertMatch[1].toLowerCase() as AlertType;
                const cleanedChildren = React.Children.map(firstChild.props.children, (child) => {
                  if (typeof child === 'string') {
                    return child.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
                  }
                  return child;
                });

                const updatedFirstChild = React.cloneElement(firstChild, {}, cleanedChildren);
                const remainingChildren = childrenArray.slice(1);

                return (
                  <AlertBlock type={alertType}>
                    {updatedFirstChild}
                    {remainingChildren}
                  </AlertBlock>
                );
              }
            }

            return <blockquote>{children}</blockquote>;
          },

          // 画像要素（ローカル相対パスの自動解決対応）
          img({ src, alt, title }) {
            return <LocalImage src={src} alt={alt} title={title} parentDir={parentDir} />;
          },

          // リンク要素（安全な外部リンクオープナー連携）
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                onClick={(e) => handleLinkClick(e, href)}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
