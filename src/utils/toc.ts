import { TocItem } from '../types/markdown';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractToc(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;

  const slugCounts: Record<string, number> = {};

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    // Clean markdown styling inside headings (e.g. `code`, **bold**, etc.)
    const rawText = match[2].trim();
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
