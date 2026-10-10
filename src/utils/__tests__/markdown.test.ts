import { hasLink, inlineText, parseInline, parseMarkdown, type Block } from '../markdown';
import { plainText } from '../markdown-plain';

describe('parseMarkdown', () => {
  it('splits paragraphs, headings, quotes, lists, code and rules', () => {
    const blocks = parseMarkdown(
      '# Title\n\nFirst line\nsame paragraph\n\n> quoted\n\n- one\n- two\n\n1. first\n2. second\n\n```\ncode\n```\n\n---',
    );
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'quote',
      'list',
      'list',
      'code',
      'rule',
    ]);
    const paragraph = blocks[1];
    expect(paragraph?.type === 'paragraph' && inlineText(paragraph.content)).toBe(
      'First line same paragraph',
    );
    const ordered = blocks[4];
    expect(ordered?.type === 'list' && ordered.ordered).toBe(true);
  });

  it('keeps a hard break where a line ends in two spaces', () => {
    const [block] = parseMarkdown('one  \ntwo');
    expect(block?.type === 'paragraph' && inlineText(block.content)).toBe('one\ntwo');
  });

  it('does not take a spoiler for a quote', () => {
    expect(parseMarkdown('>!hidden!< text')[0]?.type).toBe('paragraph');
  });
});

describe('tables', () => {
  const table = (source: string) => {
    const block = parseMarkdown(source).find((b) => b.type === 'table');
    return block as Extract<Block, { type: 'table' }> | undefined;
  };
  const text = (rows: Parameters<typeof inlineText>[0][]) => rows.map(inlineText);

  it('reads the header, alignment and rows', () => {
    const found = table(
      'Before\n\n| Item | Count | Price |\n|:--|:-:|--:|\n| Rope | 2 | £4 |\n| Lamp | 1 | £12 |\n\nAfter',
    );
    expect(found?.align).toEqual(['left', 'center', 'right']);
    expect(text(found?.header ?? [])).toEqual(['Item', 'Count', 'Price']);
    expect(found?.rows.map(text)).toEqual([
      ['Rope', '2', '£4'],
      ['Lamp', '1', '£12'],
    ]);
    expect(
      parseMarkdown('Before\n\n| a | b |\n|--|--|\n| 1 | 2 |\n\nAfter').map((b) => b.type),
    ).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('takes pipes at the ends as optional, and pads short rows', () => {
    const found = table('a | b | c\n--- | --- | ---\n1 | 2\n1 | 2 | 3 | 4');
    expect(found?.align).toEqual([null, null, null]);
    expect(found?.rows.map(text)).toEqual([
      ['1', '2', ''],
      ['1', '2', '3'],
    ]);
  });

  it('keeps escaped pipes and pipes in code within a cell', () => {
    const found = table('| a | b |\n|---|---|\n| x \\| y | `p|q` |');
    expect(found?.rows.map(text)).toEqual([['x | y', 'p|q']]);
  });

  it('ends at a blank line or a line with no pipe', () => {
    const blocks = parseMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\nplain line');
    expect(blocks.map((b) => b.type)).toEqual(['table', 'paragraph']);
  });

  it('interrupts a paragraph, as Reddit does', () => {
    const blocks = parseMarkdown('Some text\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'table']);
  });

  it('is not a table without a matching delimiter row', () => {
    expect(table('a | b\nnot a delimiter')).toBeUndefined();
    expect(table('a | b\n---')).toBeUndefined();
    expect(table('| a | b |\n|---|---|---|')).toBeUndefined();
    expect(parseMarkdown('Text\n\n---').map((b) => b.type)).toEqual(['paragraph', 'rule']);
  });

  it('reads links and emphasis in cells', () => {
    const found = table('| a |\n|---|\n| **bold** [link](https://example.com) |');
    const cell = found?.rows[0]?.[0] ?? [];
    expect(cell.map((node) => node.type)).toEqual(['bold', 'text', 'link']);
    expect(hasLink(cell)).toBe(true);
    expect(hasLink(found?.header[0] ?? [])).toBe(false);
  });
});

describe('parseInline', () => {
  it('reads emphasis, code, links, spoilers and superscript', () => {
    const nodes = parseInline(
      '**bold** *it* ~~old~~ `x` [site](https://example.com) >!secret!< ^up',
    );
    expect(nodes.filter((n) => n.type !== 'text').map((n) => n.type)).toEqual([
      'bold',
      'italic',
      'strike',
      'code',
      'link',
      'spoiler',
      'sup',
    ]);
  });

  it('links bare addresses without trailing punctuation, and r/ and u/ names', () => {
    const links = parseInline('See https://example.com/a. Or r/Example and u/someone')
      .filter((n) => n.type === 'link')
      .map((n) => (n.type === 'link' ? n.url : ''));
    expect(links).toEqual(['https://example.com/a', '/r/Example', '/u/someone']);
  });

  it('leaves snake_case and escapes alone', () => {
    expect(inlineText(parseInline('a_snake_case_name and \\*stars\\*'))).toBe(
      'a_snake_case_name and *stars*',
    );
  });

  it('decodes the entities Reddit leaves in', () => {
    expect(inlineText(parseInline('Fish &amp; chips&#x200B;'))).toBe('Fish & chips');
  });
});

describe('plainText', () => {
  it('strips Markdown for a preview and hides spoilers', () => {
    expect(plainText('## Hi\n\n**Bold** [link](https://x.y) and >!ending!<\n\n- item')).toBe(
      'Hi Bold link and ▒▒▒ item',
    );
  });
});
