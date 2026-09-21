import React, { useState, useMemo } from 'react';
import hljs from 'highlight.js';
import { Check, Copy } from './icons';

interface CodeBlockProps {
  /** 言語名（例: typescript, rust, python） */
  language: string;
  /** コードの文字列 */
  value: string;
  /** ハイライト済みのReact要素（オプショナル） */
  children?: React.ReactNode;
}

/**
 * VS Code風のシンタックスハイライト付きコードブロックコンポーネント
 * ヘッダー部に言語バッジとワンクリックコードコピーボタンを表示します。
 */
export const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, value, children }) => {
    const [copied, setCopied] = useState(false);

    // highlight.js を直接呼び出してコードハイライト HTML を生成
    const highlightedHtml = useMemo(() => {
      if (!value) return '';
      if (language && hljs.getLanguage(language)) {
        try {
          return hljs.highlight(value, { language }).value;
        } catch {
          // 指定言語で失敗した場合は自動検出へフォールバック
        }
      }
      try {
        return hljs.highlightAuto(value).value;
      } catch {
        return '';
      }
    }, [language, value]);

    /**
     * クリップボードへのコピー処理
     */
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        // 2秒後に「コピー完了」表示を元に戻す
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('クリップボードへのコピーに失敗しました: ', err);
      }
    };

    return (
      <div className="code-block-wrapper">
        {/* コードブロック上部バー（言語名 + コピーボタン） */}
        <div className="code-block-header">
          <span>{language || 'text'}</span>
          <button
            className={`code-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="コードをコピー"
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>コピー完了!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>コピー</span>
              </>
            )}
          </button>
        </div>

        {/* ハイライト済みコード本文 */}
        <pre>
          {highlightedHtml ? (
            <code
              className={`hljs ${language ? `language-${language}` : ''}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <code>{children || value}</code>
          )}
        </pre>
      </div>
    );
  }
);

CodeBlock.displayName = 'CodeBlock';

