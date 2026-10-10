import { countBelow, flatten, parseTree, type Node } from '../comments';

const comment = (id: string, replies: unknown = '', extra: Record<string, unknown> = {}) => ({
  kind: 't1',
  data: {
    id,
    name: `t1_${id}`,
    author: `user_${id}`,
    body: `Body ${id}`,
    created_utc: 1,
    replies,
    ...extra,
  },
});
const listing = (...children: unknown[]) => ({ kind: 'Listing', data: { after: null, children } });

const tree: Node[] = parseTree(
  listing(
    comment(
      'a',
      listing(comment('b', listing(comment('c'))), {
        kind: 'more',
        data: { id: 'm', count: 4, children: ['x', 'y'], parent_id: 't1_a' },
      }),
    ),
    comment('d', '', { collapsed: true }),
    { kind: 't3', data: {} },
  ),
);

describe('comment trees', () => {
  it('nests replies and keeps "more" placeholders, skipping other things', () => {
    const rows = flatten(tree, new Set());
    expect(rows.map((r) => `${r.kind === 'comment' ? r.comment.id : 'more'}@${r.depth}`)).toEqual([
      'a@0',
      'b@1',
      'c@2',
      'more@1',
      'd@0',
    ]);
  });

  it('folds a collapsed comment’s thread away and counts it', () => {
    const rows = flatten(tree, new Set(['a']));
    const first = rows[0];
    expect(first?.kind === 'comment' && first.hidden).toBe(2 + 4);
    expect(rows).toHaveLength(2);
    expect(countBelow(tree)).toBe(4 + 4);
  });

  it('collapses what Reddit collapsed until opened', () => {
    const collapsed = (expanded: Set<string>) => {
      const last = flatten(tree, new Set(), expanded).at(-1);
      return last?.kind === 'comment' && last.collapsed;
    };
    expect(collapsed(new Set())).toBe(true);
    expect(collapsed(new Set(['d']))).toBe(false);
  });
});
