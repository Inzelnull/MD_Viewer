import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  /** Mermaid記法のダイアグラムテキスト */
  chart: string;
}

// Mermaid の初期化設定
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

/**
 * Mermaid記法（フローチャート、シーケンス図、クラス図等）を
 * 動的にSVG画像へレンダリングするコンポーネント
 */
export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // SVG生成用のユニークなDOM ID
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      try {
        setError(null);
        // Mermaid APIを用いてSVGを生成
        const { svg } = await mermaid.render(idRef.current, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Mermaid レンダリングエラー:', err);
          setError(err?.message || 'ダイアグラムの描画に失敗しました');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  // エラー時はフォールバックとしてコードブロック形式で表示
  if (error) {
    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span style={{ color: 'var(--alert-caution-border)' }}>Mermaid 構文エラー</span>
        </div>
        <pre>
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  // 正常レンダリング時はSVGを埋め込み
  return (
    <div
      className="mermaid-wrapper"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
