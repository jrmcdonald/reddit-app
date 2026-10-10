import { Feed } from '@/components/feed/feed';

export default function HomeScreen() {
  return (
    <Feed
      feed={{ kind: 'home' }}
      emptyMessage="Your home feed is empty. Subscribe to some subreddits on Reddit, or look in Popular."
    />
  );
}
