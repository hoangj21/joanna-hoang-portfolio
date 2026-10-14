/**
 * Tiny inline formatter for content text: **bold**, *italic* and [label](href).
 * Everything else is HTML-escaped, so content files can't inject markup.
 */
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const allowedHref = /^(?:https?:\/\/|mailto:|#)/i;

export function inline(text: string): string {
  return escape(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
      if (!allowedHref.test(href)) return label;

      const external = /^https?:\/\//i.test(href);
      const attrs = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${href}"${attrs}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
