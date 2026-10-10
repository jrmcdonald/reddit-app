/**
 * Reddit Markdown reduced to plain text, for a text post's preview in a
 * list: no symbols, links as their text, spoilers hidden.
 */
export function plainText(markdown: string): string {
  return (
    markdown
      // Spoilers: >!hidden!<
      .replace(/>!([\s\S]*?)!</g, '▒▒▒')
      // Images and links: keep the text.
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Code fences and inline code.
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      // Headings, quotes, list markers at the start of a line.
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
      // Emphasis and strike-through.
      .replace(/(\*\*|__|\*|_|~~)(?=\S)([\s\S]*?\S)\1/g, '$2')
      // Superscript.
      .replace(/\^\(([^)]*)\)/g, '$1')
      .replace(/\^(\S+)/g, '$1')
      // Escapes, entities Reddit leaves in raw_json, and table pipes.
      .replace(/\\([\\`*_{}[\]()#+\-.!>|~^])/g, '$1')
      .replace(/&nbsp;|&#x200B;/g, ' ')
      .replace(/^\|?[-:| ]+\|?$/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
