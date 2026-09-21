import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

import { TocItem } from '../types/markdown';
import { domToReact } from '../utils/domToReact';

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
const LocalImage: React.FC<{ src?: string; alt?: string; title?: string; parentDir: string }> =
  React.memo(({ src, alt, title, parentDir }) => {
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
  });

LocalImage.displayName = 'LocalImage';

/**
 * Markdown 本文のレンダリングコンポーネント
 * Rust（pulldown-cmark）バックエンドで高速パースし、
 * GFM、KaTeX数式、Mermaidダイアグラム、シンタックスハイライト、
 * GitHub Alerts、相対画像解決を包括的に処理します。
 */
export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ content, parentDir, zoomLevel, onHeadingsExtracted }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderedHtml, setRenderedHtml] = useState<string>('');

    /**
     * Rust の pulldown-cmark バックエンドを呼び出して HTML 文字列を取得
     */
    useEffect(() => {
      let isMounted = true;

      invoke<string>('render_markdown', { content })
        .then((html) => {
          if (isMounted) {
            setRenderedHtml(html);
          }
        })
        .catch((err) => {
          console.error('Markdown のパースに失敗しました:', err);
          if (isMounted) {
            // エラー時のフォールバック
            setRenderedHtml(`<pre><code>${content}</code></pre>`);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [content]);

    /**
     * リンククリック時のハンドリング
     * - ページ内アンカー（#heading）: スムーズスクロール
     * - 外部リンク（http/https/mailto）: 外部ブラウザで安全に開く
     */
    const handleLinkClick = useCallback(
      async (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
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

        if (
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('mailto:')
        ) {
          e.preventDefault();
          try {
            await openUrl(href);
          } catch {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }
      },
      []
    );

    /**
     * HTML 文字列から React 要素ツリー（ReactNode配列）を生成
     */
    const reactElements = useMemo(() => {
      return domToReact(renderedHtml, {
        parentDir,
        onLinkClick: handleLinkClick,
        LocalImageComponent: LocalImage,
      });
    }, [renderedHtml, parentDir, handleLinkClick]);

    /**
     * レンダリング完了後に DOM から実際の見出し要素（h1〜h6）を直接走査・抽出し、
     * 目次（TOC）とのリンクを構築します。
     */
    useEffect(() => {
      const timer = setTimeout(() => {
        if (!containerRef.current || !onHeadingsExtracted) return;

        const headingElements = containerRef.current.querySelectorAll<HTMLElement>(
          'h1, h2, h3, h4, h5, h6'
        );

        const items: TocItem[] = [];
        headingElements.forEach((el, index) => {
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
      }, 80);

      return () => clearTimeout(timer);
    }, [reactElements, onHeadingsExtracted]);

    return (
      <div
        ref={containerRef}
        className="markdown-body"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
        }}
      >
        {reactElements}
      </div>
    );
  }
);

MarkdownView.displayName = 'MarkdownView';


