import { Redirect } from 'expo-router';

import { useSession } from '@/session/session';

/**
 * Where the app opens: every screen lives in a tab or behind the first-run
 * screen, so "/" only says which. Anonymous mode has no Home.
 */
export default function Index() {
  const { session } = useSession();
  if (session.status !== 'ready') return <Redirect href="/welcome" />;
  return <Redirect href={session.mode === 'user' ? '/home' : '/popular'} />;
}
