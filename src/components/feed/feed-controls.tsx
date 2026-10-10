import * as Haptics from 'expo-haptics';
import type { SymbolViewProps } from 'expo-symbols';
import { ActionSheetIOS, Pressable, StyleSheet, View } from 'react-native';

import { PERIODS, SORTS, type Period, type Sort } from '@/api/endpoints';
import type { View as FeedView } from '@/settings/preferences';
import { minTapTarget, radius, spacing, useColors } from '@/theme';
import { PERIOD_LABELS, SORT_LABELS, sortLabel } from '@/utils/feeds';

import { Icon } from '../icon';
import { ThemedText } from '../themed-text';

const VIEW_BUTTONS: { view: FeedView; label: string; icon: SymbolViewProps['name'] }[] = [
  { view: 'list', label: 'List', icon: 'list.bullet' },
  { view: 'cards', label: 'Cards', icon: 'rectangle.grid.1x2' },
  { view: 'grid', label: 'Grid', icon: 'square.grid.3x3' },
];

/**
 * Above a feed: the sort, and how the feed is shown (list, cards, grid, or
 * the fullscreen swiper). Sorts come from iOS's own action sheet.
 */
export function FeedControls({
  sort,
  period,
  sorts = SORTS,
  onSort,
  view,
  onView,
  onSwiper,
}: {
  sort: Sort;
  period: Period;
  sorts?: readonly Sort[];
  onSort(sort: Sort, period: Period): void;
  view: FeedView;
  onView(view: FeedView): void;
  onSwiper(): void;
}) {
  const colors = useColors();

  const chooseSort = () => {
    const options = sorts.map((s) => SORT_LABELS[s]);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Sort posts by',
        options: [...options, 'Cancel'],
        cancelButtonIndex: options.length,
      },
      (index) => {
        const chosen = sorts[index];
        if (!chosen) return;
        if (chosen !== 'top') return onSort(chosen, period);
        const periods = PERIODS.map((p) => PERIOD_LABELS[p]);
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Top posts from',
            options: [...periods, 'Cancel'],
            cancelButtonIndex: periods.length,
          },
          (p) => {
            const chosenPeriod = PERIODS[p];
            if (chosenPeriod) onSort('top', chosenPeriod);
          },
        );
      },
    );
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sort: ${sortLabel(sort, period)}`}
        accessibilityHint="Chooses how posts are ordered"
        onPress={chooseSort}
        style={[styles.sort, { backgroundColor: colors.surfaceRaised }]}>
        <ThemedText variant="label">{sortLabel(sort, period)}</ThemedText>
        <Icon name="chevron.down" size={12} />
      </Pressable>
      <View
        accessibilityRole="toolbar"
        accessibilityLabel="View"
        style={[styles.views, { backgroundColor: colors.surfaceRaised }]}>
        {VIEW_BUTTONS.map((button) => {
          const selected = view === button.view;
          return (
            <Pressable
              key={button.view}
              accessibilityRole="button"
              accessibilityLabel={button.label}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                Haptics.selectionAsync().catch(() => undefined);
                onView(button.view);
              }}
              style={[styles.viewButton, selected && { backgroundColor: colors.surface }]}>
              <Icon name={button.icon} size={17} color={selected ? 'accent' : 'textSecondary'} />
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swiper"
          accessibilityHint="Opens the pictures and videos full screen, one at a time"
          onPress={onSwiper}
          style={styles.viewButton}>
          <Icon name="rectangle.portrait.on.rectangle.portrait" size={17} color="textSecondary" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sort: {
    minHeight: minTapTarget - 6,
    paddingHorizontal: spacing.md - 4,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  views: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 2 },
  viewButton: {
    minWidth: minTapTarget,
    minHeight: minTapTarget - 6,
    borderRadius: radius.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
