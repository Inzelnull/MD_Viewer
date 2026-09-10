import { TocItem } from '../types/markdown';

/**
 * テキストからURLやDOM IDとして安全に使用できるスラッグ文字列を生成します。
 * @param text 変換対象の文字列
 * @returns スラッグ文字列
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Markdownテキストから見出し（#〜######）を正規表現で走査し、目次（TOC）リストを抽出します。
 * @param markdown Markdownテキスト全文
 * @returns 目次項目（TocItem）の配列
 */
export function extractToc(markdown: string): TocItem[] {
  // 行頭の # 記号とその後のテキストを検出
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;

  const slugCounts: Record<string, number> = {};

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();

    // 見出し内のインライン記法（太字、コード、リンク等）を除去してプレーンテキスト化
    const cleanText = rawText
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    let baseSlug = slugify(cleanText);
    if (!baseSlug) {
      baseSlug = `heading-${items.length + 1}`;
    }

    // 重複するスラッグ名に連番を付与
    let finalSlug = baseSlug;
    if (slugCounts[baseSlug] !== undefined) {
      slugCounts[baseSlug] += 1;
      finalSlug = `${baseSlug}-${slugCounts[baseSlug]}`;
    } else {
      slugCounts[baseSlug] = 0;
    }

    items.push({
      id: finalSlug,
      text: cleanText,
      level,
    });
  }

  return items;
}
