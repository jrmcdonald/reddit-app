/**
 * The Markdown Reddit uses in posts and comments, parsed into blocks and
 * inline runs that `components/markdown.tsx` draws. A deliberate subset:
 * paragraphs, headings, quotes, lists, code, rules, tables, emphasis,
 * links, spoilers and superscript. Anything not understood is shown as the
 * text it is, never dropped.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold' | 'italic' | 'strike' | 'sup' | 'spoiler'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; url: string; children: Inline[] };

export type Block =
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'heading'; level: number; content: Inline[] }
  | { type: 'quote'; blocks: Block[] }
  | { type: 'list'; ordered: boolean; start: number; items: Block[][] }
  | { type: 'code'; text: string }
  | { type: 'rule' }
  | { type: 'table'; align: Align[]; header: Inline[][]; rows: Inline[][][] };

export type Align = 'left' | 'center' | 'right' | null;

const FENCE = /^\s{0,3}(```|~~~)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>(?!!)\s?(.*)$/;
const BULLET = /^(\s{0,3})([-*+])\s+(.*)$/;
const NUMBER = /^(\s{0,3})(\d{1,9})[.)]\s+(.*)$/;
const INDENTED = /^( {4}|\t)(.*)$/;
/** A table's second line: `---`, `:--`, `--:` or `:-:` between pipes. */
const DELIMITER = /^\s{0,3}\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines);
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', content: parseInline(joinLines(paragraph)) });
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i] as string;

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const marker = fence[1] as string;
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] as string).trim().startsWith(marker)) {
        body.push(lines[i] as string);
        i++;
      }
      i++; // the closing fence
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }

    if (!paragraph.length && INDENTED.test(line)) {
      const body: string[] = [];
      while (
        i < lines.length &&
        (INDENTED.test(lines[i] as string) || !(lines[i] as string).trim())
      ) {
        body.push((lines[i] as string).replace(/^( {4}|\t)/, ''));
        i++;
      }
      while (body.length && !(body[body.length - 1] as string).trim()) body.pop();
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }

    const table = tableAt(lines, i);
    if (table) {
      flush();
      blocks.push(table.block);
      i = table.end;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: 'heading',
        level: (heading[1] as string).length,
        content: parseInline(heading[2] as string),
      });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      flush();
      blocks.push({ type: 'rule' });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      flush();
      const body: string[] = [];
      while (i < lines.length) {
        const match = QUOTE.exec(lines[i] as string);
        if (!match) break;
        body.push(match[1] as string);
        i++;
      }
      blocks.push({ type: 'quote', blocks: parseBlocks(body) });
      continue;
    }

    const bullet = BULLET.exec(line);
    const number = NUMBER.exec(line);
    if (bullet || number) {
      flush();
      const ordered = !bullet;
      const start = number ? Number(number[2]) : 1;
      const items: string[][] = [];
      while (i < lines.length) {
        const current = lines[i] as string;
        const item = ordered ? NUMBER.exec(current) : BULLET.exec(current);
        if (item) {
          items.push([item[3] as string]);
          i++;
          continue;
        }
        // A continuation: indented under the item, or a lazy line of its text.
        const last = items[items.length - 1];
        if (last && current.trim() && (/^\s{2,}/.test(current) || !isBlockStart(current))) {
          last.push(current.replace(/^\s{2,4}/, ''));
          i++;
          continue;
        }
        // A blank line followed by an indented continuation stays in the item.
        if (last && !current.trim() && /^\s{2,}\S/.test(lines[i + 1] ?? '')) {
          last.push('');
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: 'list', ordered, start, items: items.map((item) => parseBlocks(item)) });
      continue;
    }

    paragraph.push(line);
    i++;
  }
  flush();
  return blocks;
}

/**
 * A table starting at `lines[start]`: a header row, a delimiter row with as
 * many columns, then body rows until a blank line or a line with no pipe.
 * Rows with too few cells are padded, and extra cells dropped, as Reddit does.
 */
function tableAt(lines: string[], start: number): { block: Block; end: number } | null {
  const headerLine = lines[start] as string;
  const delimiterLine = lines[start + 1];
  if (!headerLine.includes('|') || delimiterLine === undefined) return null;
  if (!DELIMITER.test(delimiterLine) || !delimiterLine.includes('-')) return null;
  const headerCells = splitRow(headerLine);
  const delimiterCells = splitRow(delimiterLine);
  // A lone "---" under a line is a heading's underline or a rule, not a table.
  if (!delimiterLine.includes('|') && headerCells.length < 2) return null;
  if (headerCells.length !== delimiterCells.length) return null;

  const align = delimiterCells.map((cell): Align => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    return left && right ? 'center' : right ? 'right' : left ? 'left' : null;
  });
  const fit = (cells: string[]) =>
    align.map((_, column) => parseInline((cells[column] ?? '').trim()));

  const rows: Inline[][][] = [];
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (!line.trim() || !line.includes('|')) break;
    rows.push(fit(splitRow(line)));
    i++;
  }
  return { block: { type: 'table', align, header: fit(headerCells), rows }, end: i };
}

/**
 * A table row's cells, split on its pipes: not an escaped `\|`, nor one in a
 * code span. The pipes at either end are optional.
 */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let code = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (ch === '\\' && line[i + 1] === '|') {
      cell += '\\|';
      i++;
    } else if (ch === '`') {
      code = !code;
      cell += ch;
    } else if (ch === '|' && !code) {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  if (/^\s*$/.test(cells[0] ?? '') && line.trimStart().startsWith('|')) cells.shift();
  if (cells.length && /^\s*$/.test(cells[cells.length - 1] ?? '') && line.trimEnd().endsWith('|')) {
    cells.pop();
  }
  return cells.map((c) => c.trim());
}

function isBlockStart(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    NUMBER.test(line)
  );
}

/**
 * A paragraph's lines as one string. Reddit, like Markdown, joins lines with
 * a space, except where a line ends in two spaces or a backslash: a break.
 */
function joinLines(lines: string[]): string {
  let out = '';
  lines.forEach((line, index) => {
    if (index === 0) {
      out = line.trimStart();
      return;
    }
    const previous = lines[index - 1] as string;
    const hard = / {2,}$/.test(previous) || /\\$/.test(previous);
    if (hard) out = out.replace(/( {2,}|\\)$/, '');
    out += (hard ? '\n' : ' ') + line.trim();
  });
  return out.trimEnd();
}

/** Inline runs: emphasis, code, links, spoilers, superscript and plain text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = '';
  let i = 0;

  const push = (node: Inline) => {
    if (buffer) {
      out.push({ type: 'text', text: buffer });
      buffer = '';
    }
    out.push(node);
  };

  while (i < text.length) {
    const rest = text.slice(i);
    const ch = text[i] as string;

    // Escaped punctuation is itself.
    if (
      ch === '\\' &&
      i + 1 < text.length &&
      /[\\`*_{}[\]()#+\-.!>|~^]/.test(text[i + 1] as string)
    ) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        push({ type: 'code', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (rest.startsWith('>!')) {
      const end = text.indexOf('!<', i + 2);
      if (end > i) {
        push({ type: 'spoiler', children: parseInline(text.slice(i + 2, end).trim()) });
        i = end + 2;
        continue;
      }
    }

    if (ch === '[') {
      const link = /^\[((?:[^\][]|\[[^\]]*\])*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/.exec(
        rest,
      );
      if (link) {
        push({
          type: 'link',
          url: link[2] as string,
          children: parseInline(link[1] as string),
        });
        i += link[0].length;
        continue;
      }
    }

    const strong = /^(\*\*|__)(?=\S)([\s\S]*?\S)\1/.exec(rest);
    if (strong) {
      push({ type: 'bold', children: parseInline(strong[2] as string) });
      i += strong[0].length;
      continue;
    }
    const strike = /^~~(?=\S)([\s\S]*?\S)~~/.exec(rest);
    if (strike) {
      push({ type: 'strike', children: parseInline(strike[1] as string) });
      i += strike[0].length;
      continue;
    }
    // Underscores only at word edges: snake_case_names stay as they are.
    const emphasis =
      /^\*(?=\S)([\s\S]*?\S)\*(?!\*)/.exec(rest) ??
      (/[A-Za-z0-9]/.test(text[i - 1] ?? '')
        ? null
        : /^_(?=\S)([\s\S]*?\S)_(?![A-Za-z0-9])/.exec(rest));
    if (emphasis) {
      push({ type: 'italic', children: parseInline(emphasis[1] as string) });
      i += emphasis[0].length;
      continue;
    }

    if (ch === '^') {
      const group = /^\^\(([^)]*)\)/.exec(rest);
      const word = /^\^(\S+)/.exec(rest);
      const match = group ?? word;
      if (match) {
        push({ type: 'sup', children: parseInline(match[1] as string) });
        i += match[0].length;
        continue;
      }
    }

    // Bare web addresses become links, without trailing punctuation.
    const bare = /^https?:\/\/[^\s<>"]+/.exec(rest);
    if (bare && !/[A-Za-z0-9]/.test(text[i - 1] ?? '')) {
      let url = bare[0];
      while (/[.,;:!?)]$/.test(url) && !(url.endsWith(')') && url.includes('(')))
        url = url.slice(0, -1);
      push({ type: 'link', url, children: [{ type: 'text', text: url }] });
      i += url.length;
      continue;
    }

    // r/subreddit and u/user, as Reddit links them.
    const mention = /^\/?([ru])\/([A-Za-z0-9_-]{2,21})/.exec(rest);
    if (mention && !/[A-Za-z0-9/]/.test(text[i - 1] ?? '')) {
      push({
        type: 'link',
        url: `/${mention[1]}/${mention[2]}`,
        children: [{ type: 'text', text: mention[0] }],
      });
      i += mention[0].length;
      continue;
    }

    buffer += ch;
    i++;
  }
  if (buffer) out.push({ type: 'text', text: buffer });
  return out.map(decodeEntities);
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&#x200B;': '',
};

function decodeEntities(node: Inline): Inline {
  if (node.type === 'text') {
    return {
      type: 'text',
      text: node.text.replace(/&(amp|lt|gt|quot|#39|nbsp|#x200B);/g, (m) => ENTITIES[m] ?? m),
    };
  }
  return node;
}

/** The plain text of inline runs, for accessibility labels. */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text' || node.type === 'code') return node.text;
      return inlineText(node.children);
    })
    .join('');
}

/** Whether inline runs hold a link anywhere. */
export function hasLink(nodes: Inline[]): boolean {
  return nodes.some(
    (node) =>
      node.type === 'link' ||
      (node.type !== 'text' && node.type !== 'code' && hasLink(node.children)),
  );
}
