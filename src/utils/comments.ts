/**
 * A post's comments: Reddit's nested listing turned into a tree, and the tree
 * flattened into rows for one list, with collapsed threads folded away.
 *
 * Reddit sends a few hundred comments at most and leaves the rest as "more"
 * placeholders. Loading one (`/api/morechildren`) returns its comments as a
 * flat list, each naming its parent, which `expandMore` grafts into the tree
 * where the placeholder was.
 */
import { ListingSchema, parseThing, type RawComment, type RawMore } from '@/api/schemas';

export interface Comment {
  id: string;
  /** "t1_<id>". */
  fullname: string;
  author: string;
  body: string;
  score: number;
  scoreHidden: boolean;
  createdUtc: number;
  /** Written by the post's author. */
  op: boolean;
  /** "moderator" or "admin" when speaking officially. */
  distinguished: string | null;
  flair: string | null;
  saved: boolean;
  stickied: boolean;
  /** Reddit's own collapsing: below the score threshold, or a moderator's. */
  collapsedByReddit: boolean;
  /** A saved comment's post, for the Saved tab. */
  postTitle: string | null;
  subreddit: string | null;
  /** The post's id, without "t3_". */
  postId: string | null;
  permalink: string | null;
}

export type Node =
  | { kind: 'comment'; comment: Comment; replies: Node[] }
  | { kind: 'more'; id: string; count: number; children: string[]; parentId: string | null };

export function toComment(raw: RawComment): Comment {
  return {
    id: raw.id,
    fullname: raw.name,
    author: raw.author,
    body: raw.body,
    score: raw.score,
    scoreHidden: raw.score_hidden,
    createdUtc: raw.created_utc,
    op: raw.is_submitter,
    distinguished: raw.distinguished ?? null,
    flair: raw.author_flair_text?.trim() || null,
    saved: raw.saved,
    stickied: raw.stickied,
    collapsedByReddit: raw.collapsed,
    postTitle: raw.link_title ?? null,
    subreddit: raw.subreddit ?? null,
    postId: raw.link_id?.replace(/^t3_/, '') ?? null,
    permalink: raw.permalink ?? null,
  };
}

function moreNode(raw: RawMore): Node {
  return {
    kind: 'more',
    id: raw.id,
    count: raw.count,
    children: raw.children,
    parentId: raw.parent_id ?? null,
  };
}

/** The tree under a listing of comments (a post's, or a comment's replies). */
export function parseTree(listing: unknown): Node[] {
  const parsed = ListingSchema.safeParse(listing);
  if (!parsed.success) return [];
  const nodes: Node[] = [];
  for (const child of parsed.data.data.children) {
    const thing = parseThing(child);
    if (!thing) continue;
    if (thing.kind === 't1') {
      nodes.push({
        kind: 'comment',
        comment: toComment(thing.data),
        replies: parseTree(thing.data.replies),
      });
    } else if (thing.kind === 'more') {
      nodes.push(moreNode(thing.data));
    }
  }
  return nodes;
}

export type Row =
  | {
      kind: 'comment';
      key: string;
      comment: Comment;
      depth: number;
      collapsed: boolean;
      /** Comments folded away under a collapsed one. */
      hidden: number;
    }
  | {
      kind: 'more';
      key: string;
      depth: number;
      id: string;
      count: number;
      children: string[];
      /** The comment whose thread continues on its own page, for "Continue this thread". */
      parentId: string | null;
    };

/** All comments in a subtree, counting placeholders' unseen ones. */
export function countBelow(nodes: Node[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.kind === 'comment') n += 1 + countBelow(node.replies);
    else n += node.count;
  }
  return n;
}

/**
 * The rows to show. A comment is collapsed when the person collapsed it, or
 * when Reddit did and the person has not opened it (`expanded`).
 */
export function flatten(
  nodes: Node[],
  collapsed: ReadonlySet<string>,
  expanded: ReadonlySet<string> = new Set(),
  depth = 0,
  out: Row[] = [],
): Row[] {
  for (const node of nodes) {
    if (node.kind === 'more') {
      if (node.count === 0 && node.children.length === 0 && !node.parentId) continue;
      out.push({
        kind: 'more',
        key: `more-${node.id}`,
        depth,
        id: node.id,
        count: node.count,
        children: node.children,
        parentId: node.parentId,
      });
      continue;
    }
    const { comment } = node;
    const isCollapsed =
      collapsed.has(comment.id) || (comment.collapsedByReddit && !expanded.has(comment.id));
    out.push({
      kind: 'comment',
      key: comment.id,
      comment,
      depth,
      collapsed: isCollapsed,
      hidden: isCollapsed ? countBelow(node.replies) : 0,
    });
    if (!isCollapsed) flatten(node.replies, collapsed, expanded, depth + 1, out);
  }
  return out;
}

/**
 * The tree with the placeholder `moreId` replaced by the comments loaded for
 * it. `things` is morechildren's flat list: each names its parent, so a
 * reply to one of them nests under it, and the rest take the placeholder's
 * place, in order.
 */
export function expandMore(nodes: Node[], moreId: string, things: unknown[]): Node[] {
  const loaded: { parent: string | null; node: Node; fullname: string | null }[] = [];
  for (const thing of things) {
    const parsed = parseThing(thing);
    if (!parsed) continue;
    if (parsed.kind === 't1') {
      loaded.push({
        parent: parsed.data.parent_id ?? null,
        node: { kind: 'comment', comment: toComment(parsed.data), replies: [] },
        fullname: parsed.data.name,
      });
    } else if (parsed.kind === 'more') {
      loaded.push({
        parent: parsed.data.parent_id ?? null,
        node: moreNode(parsed.data),
        fullname: null,
      });
    }
  }
  const byFullname = new Map<string, Node>();
  for (const item of loaded) {
    if (item.fullname) byFullname.set(item.fullname, item.node);
  }
  const top: Node[] = [];
  for (const item of loaded) {
    const parent = item.parent ? byFullname.get(item.parent) : undefined;
    if (parent && parent.kind === 'comment') parent.replies.push(item.node);
    else top.push(item.node);
  }

  const replace = (list: Node[]): Node[] =>
    list.flatMap((node): Node[] => {
      if (node.kind === 'more') return node.id === moreId ? top : [node];
      return [{ ...node, replies: replace(node.replies) }];
    });
  return replace(nodes);
}

/** The placeholder with this id, to know which children to ask for. */
export function findMore(nodes: Node[], moreId: string): Extract<Node, { kind: 'more' }> | null {
  for (const node of nodes) {
    if (node.kind === 'more') {
      if (node.id === moreId) return node;
    } else {
      const found = findMore(node.replies, moreId);
      if (found) return found;
    }
  }
  return null;
}
