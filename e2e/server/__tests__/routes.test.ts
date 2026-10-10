/**
 * The fake Reddit itself: what the walkthrough relies on beyond the data,
 * which client.test.ts checks through the app's own client.
 */
import { buildFixtures, CLIENT_ID, USER_TOKEN } from '../fixtures.ts';
import { createRouter } from '../routes.ts';

const ORIGIN = 'https://localhost:8443';

describe('fake Reddit', () => {
  it('sends the sign-in straight back to the app with the state', () => {
    const route = createRouter(ORIGIN);
    const query = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      state: 'abc',
      redirect_uri: 'perch://oauth/callback',
    });
    const reply = route({
      method: 'GET',
      url: `/api/v1/authorize.compact?${query}`,
      headers: {},
      body: '',
    });
    expect(reply).toEqual({
      status: 302,
      location: 'perch://oauth/callback?state=abc&code=walkthrough-code',
    });
  });

  it('wants a token for the API, and accepts revoking one', () => {
    const route = createRouter(ORIGIN);
    expect(route({ method: 'GET', url: '/best', headers: {}, body: '' }).status).toBe(401);
    expect(
      route({ method: 'POST', url: '/api/v1/revoke_token', headers: {}, body: '' }).status,
    ).toBe(204);
  });

  it('serves a picture for every image address it hands out', () => {
    const route = createRouter(ORIGIN);
    const fixtures = buildFixtures(ORIGIN);
    // Building the feeds, a gallery's thread and the subreddits hands out the addresses.
    fixtures.feed('home');
    fixtures.feed('popular');
    fixtures.thread('pf004');
    const paths = fixtures.imagePaths();
    expect(paths.length).toBeGreaterThan(50);
    for (const path of paths) {
      const reply = route({ method: 'GET', url: path, headers: {}, body: '' });
      expect('png' in reply && reply.png.subarray(1, 4).toString('ascii')).toBe('PNG');
    }
    expect(
      route({ method: 'GET', url: '/media/pf001/9999x9999.png', headers: {}, body: '' }).status,
    ).toBe(404);
  });

  it('shifts every time so ages read the same on any day', () => {
    const at = (now: number) => {
      const route = createRouter(ORIGIN, now);
      const reply = route({
        method: 'GET',
        url: '/r/popular/hot',
        headers: { authorization: `Bearer ${USER_TOKEN}` },
        body: '',
      });
      const listing = (
        reply as { json: { data: { children: { data: { created_utc: number } }[] } } }
      ).json;
      return now - (listing.data.children[0]?.data.created_utc ?? 0);
    };
    expect(at(1_800_000_000)).toBe(at(1_900_000_000));
    expect(at(1_800_000_000)).toBe(4 * 3600);
  });
});
