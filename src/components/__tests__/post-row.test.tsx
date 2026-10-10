import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Post } from '@/utils/posts';

import { PostRow } from '../post/post-row';
import { renderInApp } from './render';

const picture = {
  renditions: [{ url: 'https://i.example.com/a.jpg', width: 640, height: 480 }],
  aspect: 4 / 3,
};

const post: Post = {
  id: 'abc',
  fullname: 't3_abc',
  title: 'Charcoal studies',
  subreddit: 'Example',
  author: 'someone',
  createdUtc: Date.now() / 1000 - 4 * 3600,
  score: 864,
  comments: 41,
  upvoteRatio: 0.97,
  nsfw: true,
  spoiler: false,
  saved: false,
  stickied: false,
  locked: false,
  removed: false,
  flair: null,
  body: '',
  permalink: '/r/Example/comments/abc/x/',
  media: { kind: 'image', picture },
};

describe('PostRow', () => {
  it('reads the whole post as one button', async () => {
    await renderInApp(<PostRow post={post} />);
    expect(
      screen.getByRole('button', {
        name: 'Charcoal studies, r/Example, by someone, 4 hours ago, 864 points, 41 comments, Image, NSFW',
      }),
    ).toBeOnTheScreen();
  });

  it('covers NSFW media until tapped', async () => {
    await renderInApp(<PostRow post={post} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show NSFW media' }));
    expect(screen.queryByRole('button', { name: 'Show NSFW media' })).toBeNull();
    // Shown, the picture is part of the row's own button, not read twice.
    expect(screen.queryByRole('imagebutton')).toBeNull();
  });

  it('saves a post when signed in', async () => {
    const { post: send } = await renderInApp(<PostRow post={post} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Unsave' })).toBeOnTheScreen();
    await waitFor(() => expect(send).toHaveBeenCalledWith('/api/save', { id: 't3_abc' }));
  });

  it('has no save button in anonymous mode', async () => {
    await renderInApp(<PostRow post={post} />, 'anonymous');
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
