import { fireEvent, screen } from '@testing-library/react-native';

import type { Post } from '@/utils/posts';

import { PostMedia } from '../post/post-media';
import { renderInApp } from './render';

// Video plays natively; nothing here plays one.
jest.mock('../post/clip-player', () => ({ ClipPlayer: () => null }));

const picture = (n: number) => ({
  renditions: [{ url: `https://i.example.com/${n}.jpg`, width: 640, height: 480 }],
  aspect: 4 / 3,
});

const post: Post = {
  id: 'abc',
  fullname: 't3_abc',
  title: 'Brass plate build',
  subreddit: 'Example',
  author: 'someone',
  createdUtc: 1_700_000_000,
  score: 1,
  comments: 0,
  upvoteRatio: null,
  nsfw: false,
  spoiler: false,
  saved: false,
  stickied: false,
  locked: false,
  removed: false,
  flair: null,
  body: '',
  permalink: '/r/Example/comments/abc/x/',
  media: {
    kind: 'gallery',
    items: [
      { picture: picture(1), caption: null },
      { picture: picture(2), caption: 'The plate' },
    ],
  },
};

describe('PostMedia', () => {
  it('opens a gallery picture full screen to zoom, and closes', async () => {
    await renderInApp(<PostMedia post={post} />);
    await fireEvent.press(screen.getByRole('imagebutton', { name: 'Image 2 of 2: The plate' }));
    expect(screen.getByRole('image', { name: 'Image 2 of 2: The plate' })).toBeOnTheScreen();
    expect(screen.getByText('2 of 2')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
