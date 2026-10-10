import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { minTapTarget, spacing, useColors } from '@/theme';
import { age, ageSpoken, compact, plural } from '@/utils/format';
import type { Comment, Row } from '@/utils/comments';

import { Markdown } from '../markdown';
import { SaveButton } from '../post/save-button';
import { ThemedText } from '../themed-text';

/** Indent per level, in points. Deep threads stop indenting at MAX_INDENT. */
const STEP = 12;
const MAX_INDENT = 8;

function Indent({ depth }: { depth: number }) {
  const colors = useColors();
  const levels = Math.min(depth, MAX_INDENT);
  if (!levels) return null;
  return (
    <View style={[styles.indent, { width: levels * STEP }]} accessibilityElementsHidden>
      <View style={[styles.line, { backgroundColor: colors.textSecondary }]} />
    </View>
  );
}

function header(comment: Comment) {
  const parts = [comment.author];
  if (comment.op) parts.push('OP');
  if (comment.distinguished === 'moderator') parts.push('moderator');
  if (comment.distinguished === 'admin') parts.push('Reddit admin');
  return parts;
}

/**
 * One comment: who and when on a line that collapses and expands the thread
 * under it, then the text. A collapsed comment shows only its line, with how
 * many replies are folded away.
 */
export function CommentRow({
  row,
  onToggle,
}: {
  row: Extract<Row, { kind: 'comment' }>;
  onToggle(): void;
}) {
  const colors = useColors();
  const { comment, depth, collapsed, hidden } = row;
  const score = comment.scoreHidden ? '–' : compact(comment.score);
  const spokenScore = comment.scoreHidden ? 'score hidden' : plural(comment.score, 'point');
  const label = [
    ...header(comment),
    ageSpoken(comment.createdUtc),
    spokenScore,
    comment.stickied ? 'pinned' : null,
    collapsed ? `collapsed${hidden ? `, ${plural(hidden, 'reply', 'replies')} hidden` : ''}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: colors.background },
      ]}>
      <Indent depth={depth} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={collapsed ? 'Expands this thread' : 'Collapses this thread'}
            accessibilityState={{ expanded: !collapsed }}
            onPress={onToggle}
            style={styles.header}>
            <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
              <ThemedText variant="caption" style={styles.author}>
                {comment.author}
              </ThemedText>
              {comment.op ? (
                <ThemedText variant="caption" style={[styles.author, { color: colors.accent }]}>
                  {' OP'}
                </ThemedText>
              ) : null}
              {comment.distinguished === 'moderator' ? ' · MOD' : ''}
              {comment.flair ? ` · ${comment.flair}` : ''}
              {` · ${age(comment.createdUtc)} · ↑ ${score}`}
              {comment.stickied ? ' · pinned' : ''}
              {collapsed && hidden ? ` · ${plural(hidden, 'reply', 'replies')} hidden` : ''}
            </ThemedText>
          </Pressable>
          {!collapsed ? (
            <SaveButton fullname={comment.fullname} saved={comment.saved} size={16} />
          ) : null}
        </View>
        {!collapsed ? <Markdown source={comment.body} size="small" /> : null}
      </View>
    </View>
  );
}

/** "Load 6 more replies", or "Continue this thread" where Reddit stops nesting. */
export function MoreRow({
  row,
  postId,
  loading,
  onLoad,
}: {
  row: Extract<Row, { kind: 'more' }>;
  postId: string;
  loading: boolean;
  onLoad(): void;
}) {
  const colors = useColors();
  const continueThread = row.count === 0 || row.children.length === 0;
  const title = continueThread
    ? 'Continue this thread'
    : `Load ${plural(row.count, 'more reply', 'more replies')}`;
  const onPress = () => {
    if (continueThread) {
      const focus = row.parentId?.replace(/^t1_/, '');
      if (focus) router.push({ pathname: '/post/[id]', params: { id: postId, focus } });
      return;
    }
    onLoad();
  };
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: colors.background },
      ]}>
      <Indent depth={row.depth} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ busy: loading }}
        disabled={loading}
        onPress={onPress}
        style={styles.more}>
        {loading ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : (
          <ThemedText variant="label" style={{ color: colors.accent }}>
            {title}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indent: { alignItems: 'flex-end', paddingRight: spacing.sm },
  line: { width: 2, flex: 1, borderRadius: 1 },
  body: { flex: 1, paddingBottom: spacing.sm + 2, gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  header: { flex: 1, minHeight: minTapTarget, justifyContent: 'center' },
  author: { fontWeight: '600' },
  more: { flex: 1, minHeight: minTapTarget, justifyContent: 'center' },
});
