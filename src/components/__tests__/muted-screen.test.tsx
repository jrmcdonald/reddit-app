import { act, fireEvent, screen } from '@testing-library/react-native';

import MutedScreen from '@/app/(tabs)/settings/muted';
import { getPreferences, updatePreferences } from '@/settings/preferences';

import { renderInApp } from './render';

// The screen sets its title on the navigator; there is none here.
jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));

describe('Muted', () => {
  beforeEach(() => updatePreferences({ mutedWords: [], mutedSubreddits: [] }));
  afterEach(async () => {
    await act(() => updatePreferences({ mutedWords: [], mutedSubreddits: [] }));
  });

  it('adds a word, and removes it with its own button', async () => {
    await renderInApp(<MutedScreen />);
    expect(screen.getByRole('button', { name: 'Add word' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Mute a word or phrase'), 'spoilers');
    await fireEvent.press(screen.getByRole('button', { name: 'Add word' }));
    expect(getPreferences().mutedWords).toEqual(['spoilers']);
    expect(screen.getByLabelText('Mute a word or phrase')).toHaveDisplayValue('');

    await fireEvent.press(screen.getByRole('button', { name: 'Unmute spoilers' }));
    expect(getPreferences().mutedWords).toEqual([]);
  });

  it('adds a subreddit only once it is a valid name', async () => {
    await renderInApp(<MutedScreen />);
    const field = screen.getByLabelText('Mute a subreddit');
    await fireEvent.changeText(field, 'r/a');
    expect(screen.getByRole('button', { name: 'Add subreddit' })).toBeDisabled();
    await fireEvent.changeText(field, 'r/AskHistorians');
    await fireEvent(field, 'submitEditing');
    expect(getPreferences().mutedSubreddits).toEqual(['AskHistorians']);
    expect(screen.getByRole('button', { name: 'Unmute r/AskHistorians' })).toBeOnTheScreen();
  });
});
