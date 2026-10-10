import { inlineText, parseInline, parseMarkdown } from '../markdown';
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
