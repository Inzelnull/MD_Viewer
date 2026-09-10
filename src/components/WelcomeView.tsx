import React, { useState } from 'react';
import { FileUp, FolderOpen, Sparkles } from 'lucide-react';

interface WelcomeViewProps {
  /** ファイルオープンダイアログを起動する関数 */
  onOpenFile: () => void;
  /** デモMarkdownをロードする関数 */
  onLoadSample: () => void;
  /** ファイルがドロップされたときのハンドラ */
  onDropFile?: (file: File) => void;
}

/**
 * ファイル未選択時に表示されるウェルカム画面コンポーネント
 * ドラッグ＆ドロップエリア、ファイルを開くボタン、デモ読み込みボタン、ショートカット一覧を表示します。
 */
export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onOpenFile,
  onLoadSample,
  onDropFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // ドラッグオーバー処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  // ドラッグリーブ処理
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // ドロップ処理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (onDropFile) {
        onDropFile(file);
      }
    }
  };

  return (
    <div
      className="welcome-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`welcome-card ${isDragOver ? 'drag-over' : ''}`}>
        <FileUp className="welcome-icon" />
        <h2 className="welcome-title">Markdown Preview Viewer</h2>
        <p className="welcome-desc">
          Markdownファイル（<code>.md</code>, <code>.markdown</code>）をここにドラッグ＆ドロップするか、
          以下のボタンからファイルを選択してください。
        </p>

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button className="btn btn-primary" onClick={onOpenFile} style={{ height: 34, padding: '0 16px' }}>
            <FolderOpen size={16} />
            <span>ファイルを開く</span>
          </button>
          <button className="btn" onClick={onLoadSample} style={{ height: 34, padding: '0 16px', border: '1px solid var(--border-color)' }}>
            <Sparkles size={16} />
            <span>デモMarkdownを表示</span>
          </button>
        </div>

        {/* キーボードショートカット一覧 */}
        <div
          style={{
            marginTop: '24px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'left',
          }}
        >
          <div><strong>Ctrl + O</strong>: ファイルを開く</div>
          <div><strong>Ctrl + F</strong>: 文書内検索</div>
          <div><strong>Ctrl + B</strong>: 目次サイドバー表示切替</div>
          <div><strong>F11</strong>: 全画面モード切替</div>
          <div><strong>Ctrl + P</strong>: 印刷 / PDF保存</div>
          <div><strong>Ctrl + +/-</strong>: 拡大 / 縮小</div>
          <div><strong>Ctrl + 0</strong>: 拡大率リセット</div>
        </div>
      </div>
    </div>
  );
};
