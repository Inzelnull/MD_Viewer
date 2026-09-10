import React, { useEffect, useState } from 'react';
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

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/vs2015.css';

interface MarkdownViewProps {
  content: string;
  parentDir: string;
  zoomLevel: number;
}

// Custom Async Image component to load local relative images via Tauri Rust backend
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

    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      setResolvedSrc(src);
      return;
    }

    // Try reading local file via Tauri command
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
        console.warn('Failed to resolve local image:', src, err);
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

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  parentDir,
  zoomLevel,
}) => {
  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
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
      className="markdown-body"
      style={{
        transform: `scale(${zoomLevel})`,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex, rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (language === 'mermaid') {
              return <MermaidBlock chart={codeString} />;
            }

            // Check if code block (has newline or language specified)
            const isCodeBlock = match || String(children).includes('\n');

            if (isCodeBlock) {
              return (
                <CodeBlock language={language} value={codeString}>
                  {children}
                </CodeBlock>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
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

              const alertMatch = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(innerText);

              if (alertMatch) {
                const alertType = alertMatch[1].toLowerCase() as AlertType;
                // Remove the [!ALERT] header from the first child text
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
          img({ src, alt, title }) {
            return <LocalImage src={src} alt={alt} title={title} parentDir={parentDir} />;
          },
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
