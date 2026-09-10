import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      try {
        setError(null);
        // Clear old element if any
        const { svg } = await mermaid.render(idRef.current, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Mermaid render error:', err);
          setError(err?.message || 'Failed to render diagram');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span style={{ color: 'var(--alert-caution-border)' }}>Mermaid Error</span>
        </div>
        <pre>
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-wrapper"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
