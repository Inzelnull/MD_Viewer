import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
  children?: React.ReactNode;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span>{language || 'text'}</span>
        <button
          className={`code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{children || value}</code>
      </pre>
    </div>
  );
};
