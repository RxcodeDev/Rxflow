/**
 * Lightweight but safe Markdown → HTML renderer.
 * No external dependencies. XSS-safe: user text is always escaped before
 * injecting into HTML; only allow-listed tags come from our own patterns.
 */

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Process inline markdown on already-escaped text */
function inline(s: string): string {
  return s
    // Inline code (process first so inner chars aren't touched)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    // Links — only http/https to prevent javascript: xss
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>',
    );
}

export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) return '';

  const lines = md.split('\n');
  const out: string[] = [];
  let codeLines: string[] = [];
  let codeLang = '';
  let inCode = false;
  let ulItems: string[] = [];
  let olItems: string[] = [];

  const flushUl = () => {
    if (ulItems.length > 0) {
      out.push(`<ul>${ulItems.map(li => `<li>${li}</li>`).join('')}</ul>`);
      ulItems = [];
    }
  };
  const flushOl = () => {
    if (olItems.length > 0) {
      out.push(`<ol>${olItems.map(li => `<li>${li}</li>`).join('')}</ol>`);
      olItems = [];
    }
  };
  const flushLists = () => { flushUl(); flushOl(); };

  for (const line of lines) {
    // ── Code block fence
    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code${codeLang ? ` class="language-${escHtml(codeLang)}"` : ''}>${escHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        codeLang = '';
        inCode = false;
      } else {
        flushLists();
        codeLang = line.slice(3).trim();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    // ── Headings
    if (line.startsWith('### ')) { flushLists(); out.push(`<h3>${inline(escHtml(line.slice(4)))}</h3>`); continue; }
    if (line.startsWith('## '))  { flushLists(); out.push(`<h2>${inline(escHtml(line.slice(3)))}</h2>`); continue; }
    if (line.startsWith('# '))   { flushLists(); out.push(`<h1>${inline(escHtml(line.slice(2)))}</h1>`); continue; }

    // ── Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) { flushLists(); out.push('<hr>'); continue; }

    // ── Blockquote
    if (line.startsWith('> ')) {
      flushLists();
      out.push(`<blockquote>${inline(escHtml(line.slice(2)))}</blockquote>`);
      continue;
    }

    // ── Unordered list (-, *, +)
    const ulMatch = line.match(/^[-*+] (.*)/);
    if (ulMatch) { flushOl(); ulItems.push(inline(escHtml(ulMatch[1]))); continue; }

    // ── Ordered list
    const olMatch = line.match(/^\d+\. (.*)/);
    if (olMatch) { flushUl(); olItems.push(inline(escHtml(olMatch[1]))); continue; }

    // ── Empty line — flush lists, emit spacing
    if (line.trim() === '') { flushLists(); out.push('<br>'); continue; }

    // ── Paragraph
    flushLists();
    out.push(`<p>${inline(escHtml(line))}</p>`);
  }

  flushLists();
  if (inCode) {
    out.push(`<pre><code>${escHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return out.join('\n');
}

/** Extract markdown string from wiki content JSON (supports both formats) */
export function extractMarkdown(content: Record<string, unknown>): string {
  if (content?.type === 'markdown') return (content.content as string) ?? '';
  return '';
}

/** Pack markdown string into the wiki content JSON format */
export function packMarkdown(md: string): Record<string, unknown> {
  return { type: 'markdown', content: md };
}
