import { isSafeRenderedMarkdownImageUrl, renderedMarkdownAnchorUrl } from './markdownPathUtils';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

interface RenderMarkdownOptions {
  resolveUrl?: (url: string) => string | undefined;
  resolveImageUrl?: (url: string) => string | undefined;
}

function safeUrl(value: string, options: RenderMarkdownOptions): string | undefined {
  const resolved = options.resolveUrl?.(value.trim()) ?? value.trim();
  const safe = renderedMarkdownAnchorUrl(resolved);
  return safe ? escapeHtml(safe) : undefined;
}

function safeImageUrl(value: string, options: RenderMarkdownOptions): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const resolved = options.resolveImageUrl?.(trimmed) ?? trimmed;
  return resolved && isSafeRenderedMarkdownImageUrl(resolved) ? escapeHtml(resolved) : undefined;
}

function inlineMarkdown(value: string, options: RenderMarkdownOptions): string {
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_match, alt: string, url: string) => {
      const src = safeImageUrl(url, options);
      return src ? `<img src="${src}" alt="${alt}">` : alt;
    },
  );
  html = html.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_match, text: string, url: string) => {
      const href = safeUrl(url, options);
      return href ? `<a href="${href}" rel="noreferrer">${text}</a>` : text;
    },
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>');
  html = html.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>');
  return html;
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function isBlockStarter(line: string): boolean {
  return (
    isBlank(line) ||
    /^```/.test(line.trim()) ||
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+[.)]\s+/.test(line) ||
    /^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)
  );
}

export function renderMarkdown(markdown: string, options: RenderMarkdownOptions = {}): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : '';
      html.push(`<pre><code${languageClass}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      html.push(`<h${level}>${inlineMarkdown(heading[2]!.trim(), options)}</h${level}>`);
      continue;
    }

    if (/^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push('<hr>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [line.replace(/^>\s?/, '')];
      while (index + 1 < lines.length && /^>\s?/.test(lines[index + 1] ?? '')) {
        index += 1;
        quote.push((lines[index] ?? '').replace(/^>\s?/, ''));
      }
      html.push(`<blockquote>${renderMarkdown(quote.join('\n'), options)}</blockquote>`);
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index] ?? '')) {
        items.push(
          `<li>${inlineMarkdown((lines[index] ?? '').replace(/^[-*+]\s+/, ''), options)}</li>`,
        );
        index += 1;
      }
      index -= 1;
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index] ?? '')) {
        items.push(
          `<li>${inlineMarkdown((lines[index] ?? '').replace(/^\d+[.)]\s+/, ''), options)}</li>`,
        );
        index += 1;
      }
      index -= 1;
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraph: string[] = [line.trim()];
    while (index + 1 < lines.length && !isBlockStarter(lines[index + 1] ?? '')) {
      index += 1;
      paragraph.push((lines[index] ?? '').trim());
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(' '), options)}</p>`);
  }

  return html.join('\n');
}
