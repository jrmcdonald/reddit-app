import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { useColors } from '@/theme';
import { linkTarget } from '@/utils/links';

/** Opens a link from a post or comment: in the app if it is Reddit's, else in Safari's sheet. */
export function useOpenLink() {
  const colors = useColors();
  return useCallback(
    (url: string) => {
      const target = linkTarget(url);
      if (target.kind === 'subreddit') {
        router.push({ pathname: '/r/[name]', params: { name: target.name } });
      } else if (target.kind === 'post') {
        router.push({
          pathname: '/post/[id]',
          params: target.comment ? { id: target.id, focus: target.comment } : { id: target.id },
        });
      } else {
        WebBrowser.openBrowserAsync(target.url, {
          controlsColor: colors.accent,
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        }).catch(() => undefined);
      }
    },
    [colors.accent],
  );
}
