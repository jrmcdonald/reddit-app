import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useOpenLink } from '@/hooks/use-open-link';
import { radius, spacing, type as typeScale, useColors } from '@/theme';
import {
  hasLink,
  inlineText,
  parseMarkdown,
  type Align,
  type Block,
  type Inline,
} from '@/utils/markdown';

import { ThemedText } from './themed-text';

/**
 * A post's or comment's Markdown, drawn with native text. Links open in the
 * app or in Safari's sheet; spoilers are blacked out until tapped.
 */
export function Markdown({ source, size = 'body' }: { source: string; size?: 'body' | 'small' }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} size={size} />
      ))}
    </View>
  );
}

function BlockView({ block, size }: { block: Block; size: 'body' | 'small' }) {
  const colors = useColors();
  const text = size === 'small' ? styles.small : typeScale.body;
  switch (block.type) {
    case 'paragraph':
      return (
        <ThemedText style={text}>
          <Runs nodes={block.content} />
        </ThemedText>
      );
    case 'heading':
      return (
        <ThemedText
          accessibilityRole="header"
          style={[text, styles.heading, block.level <= 2 && styles.headingLarge]}>
          <Runs nodes={block.content} />
        </ThemedText>
      );
    case 'quote':
      return (
        <View style={[styles.quote, { borderLeftColor: colors.outline }]}>
          {block.blocks.map((child, index) => (
            <BlockView key={index} block={child} size={size} />
          ))}
        </View>
      );
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.item}>
              <ThemedText
                style={[text, styles.marker]}
                accessibilityElementsHidden
                importantForAccessibility="no">
                {block.ordered ? `${block.start + index}.` : '•'}
              </ThemedText>
              <View style={styles.itemBody}>
                {item.map((child, i) => (
                  <BlockView key={i} block={child} size={size} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    case 'code':
      return (
        <View style={[styles.code, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.mono, { color: colors.text }]}>{block.text}</Text>
        </View>
      );
    case 'rule':
      return <View style={[styles.rule, { backgroundColor: colors.border }]} />;
    case 'table':
      return <Table block={block} size={size} />;
  }
}

/** Points per character, roughly, at the body size: for sizing columns before layout. */
const CHAR_WIDTH = 8.5;
const CELL_PADDING = spacing.sm * 2;
const MIN_COLUMN = 56;
const MAX_COLUMN = 240;

/**
 * A table, scrolling sideways when it is wider than the screen. Columns are
 * sized from their longest cell, so every row lines up without measuring;
 * a long cell wraps within its column. Each row is read as one element,
 * every cell after its column's heading, unless a cell holds a link that
 * VoiceOver must reach on its own.
 */
function Table({
  block,
  size,
}: {
  block: Extract<Block, { type: 'table' }>;
  size: 'body' | 'small';
}) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const text = size === 'small' ? styles.small : typeScale.body;
  const scale = (size === 'small' ? 15 / 16 : 1) * fontScale;
  const headings = block.header.map(inlineText);
  const widths = block.align.map((_, column) => {
    const longest = Math.max(
      ...[block.header, ...block.rows].map((row) => inlineText(row[column] ?? []).length),
    );
    const width = Math.min(Math.max(longest * CHAR_WIDTH, MIN_COLUMN), MAX_COLUMN) * scale;
    return Math.ceil(width + CELL_PADDING);
  });

  const row = (cells: Inline[][], index: number, header: boolean) => {
    const label = header
      ? `Table, ${block.rows.length} ${block.rows.length === 1 ? 'row' : 'rows'}. Columns: ${headings.join(', ')}`
      : cells
          .map((cell, column) => {
            const heading = headings[column];
            const value = inlineText(cell);
            return heading ? `${heading}: ${value}` : value;
          })
          .join(', ');
    const readAsOne = !cells.some(hasLink);
    return (
      <View
        key={index}
        accessible={readAsOne}
        accessibilityLabel={readAsOne ? label : undefined}
        style={[
          styles.tableRow,
          !header && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
          header && { backgroundColor: colors.surfaceRaised },
        ]}>
        {cells.map((cell, column) => (
          <View key={column} style={[styles.cell, { width: widths[column] }]}>
            <ThemedText
              style={[text, header && styles.bold, alignStyle(block.align[column] ?? null)]}>
              <Runs nodes={cell} />
            </ThemedText>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { borderColor: colors.border }]}>
        {row(block.header, -1, true)}
        {block.rows.map((cells, index) => row(cells, index, false))}
      </View>
    </ScrollView>
  );
}

function alignStyle(align: Align) {
  return align === 'center' ? styles.center : align === 'right' ? styles.right : null;
}

function Runs({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <Run key={index} node={node} />
      ))}
    </>
  );
}

function Run({ node }: { node: Inline }): ReactNode {
  const colors = useColors();
  const openLink = useOpenLink();
  switch (node.type) {
    case 'text':
      return node.text;
    case 'bold':
      return (
        <Text style={styles.bold}>
          <Runs nodes={node.children} />
        </Text>
      );
    case 'italic':
      return (
        <Text style={styles.italic}>
          <Runs nodes={node.children} />
        </Text>
      );
    case 'strike':
      return (
        <Text style={styles.strike}>
          <Runs nodes={node.children} />
        </Text>
      );
    case 'sup':
      return (
        <Text style={styles.sup}>
          <Runs nodes={node.children} />
        </Text>
      );
    case 'code':
      return (
        <Text style={[styles.mono, { backgroundColor: colors.surfaceRaised }]}>{node.text}</Text>
      );
    case 'link':
      return (
        <Text
          accessibilityRole="link"
          onPress={() => openLink(node.url)}
          style={[styles.link, { color: colors.accent }]}>
          <Runs nodes={node.children} />
        </Text>
      );
    case 'spoiler':
      return <Spoiler nodes={node.children} />;
  }
}

function Spoiler({ nodes }: { nodes: Inline[] }) {
  const colors = useColors();
  const [shown, setShown] = useState(false);
  if (shown) return <Runs nodes={nodes} />;
  return (
    <Text
      accessibilityRole="button"
      accessibilityLabel={`Spoiler, ${inlineText(nodes).length} characters. Double-tap to show`}
      onPress={() => setShown(true)}
      style={{ backgroundColor: colors.text, color: colors.text }}>
      <Runs nodes={nodes} />
    </Text>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.sm },
  small: { fontSize: 15, lineHeight: 21 },
  heading: { fontWeight: '700' },
  headingLarge: { fontSize: 19, lineHeight: 25 },
  quote: { borderLeftWidth: 3, paddingLeft: spacing.sm + 2, gap: spacing.sm },
  list: { gap: spacing.xs },
  item: { flexDirection: 'row', gap: spacing.sm },
  marker: { minWidth: 16 },
  itemBody: { flex: 1, gap: spacing.xs },
  code: { borderRadius: radius.sm, padding: spacing.sm },
  mono: { fontFamily: 'Menlo', fontSize: 14, lineHeight: 19 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  cell: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2 },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  sup: { fontSize: 12 },
  link: { textDecorationLine: 'underline' },
});
