import { screen } from '@testing-library/react-native';

import { Markdown } from '../markdown';
import { renderInApp } from './render';

describe('Markdown tables', () => {
  it('reads each row as one element, every cell after its heading', async () => {
    await renderInApp(
      <Markdown source={'| Item | Count |\n|:--|--:|\n| Rope | 2 |\n| Lamp | 1 |'} />,
    );
    expect(screen.getByLabelText('Table, 2 rows. Columns: Item, Count')).toBeOnTheScreen();
    expect(screen.getByLabelText('Item: Rope, Count: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Item: Lamp, Count: 1')).toBeOnTheScreen();
  });

  it('leaves a row with a link for VoiceOver to reach cell by cell', async () => {
    await renderInApp(<Markdown source={'| Source |\n|---|\n| [Atlas](https://example.com) |'} />);
    expect(screen.queryByLabelText('Source: Atlas')).toBeNull();
    expect(screen.getByRole('link', { name: 'Atlas' })).toBeOnTheScreen();
  });
});
