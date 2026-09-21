import React, { useState, useCallback } from 'react';
import { Check, Copy } from './icons';

interface CodeBlockProps {
  /** 言語名（例: typescript, rust, python） */
  language: string;
  /** コピー用のプレーンテキストコード文字列 */
  value: string;
  /** Rust (syntect) により生成されたハイライト済みHTML（オプショナル） */
  highlightedHtml?: string;
  /** 子要素（オプショナル） */
  children?: React.ReactNode;
}

/**
 * VS Code風のシンタックスハイライト付きコードブロックコンポーネント
 * ヘッダー部に言語バッジとワンクリックコードコピーボタンを表示します。
 * ハイライトは Rust バックエンド（syntect）でネイティブ処理されます。
 */
export const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, value, highlightedHtml, children }) => {
    const [copied, setCopied] = useState(false);

    /**
     * クリップボードへのコピー処理
     */
    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        // 2秒後に「コピー完了」表示を元に戻す
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('クリップボードへのコピーに失敗しました: ', err);
      }
    }, [value]);

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
              className={language ? `language-${language}` : ''}
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


