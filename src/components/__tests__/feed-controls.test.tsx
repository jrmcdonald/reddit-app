import { fireEvent, render, screen } from '@testing-library/react-native';

import { FeedControls } from '../feed/feed-controls';

describe('FeedControls', () => {
  it('names the sort and the views, with the current one selected', async () => {
    const onView = jest.fn();
    const onSwiper = jest.fn();
    await render(
      <FeedControls
        sort="top"
        period="week"
        onSort={jest.fn()}
        view="list"
        onView={onView}
        onSwiper={onSwiper}
      />,
    );
    expect(screen.getByRole('button', { name: 'Sort: Top · This week' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'List', selected: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Grid' }));
    expect(onView).toHaveBeenCalledWith('grid');
    await fireEvent.press(screen.getByRole('button', { name: 'Swiper' }));
    expect(onSwiper).toHaveBeenCalled();
  });
});
