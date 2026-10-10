/**
 * The app source that SideStore (and AltStore) read to install and update
 * the app: a JSON file listing the app and its newest release. Each release
 * attaches one beside its IPA, so the source's address can stay
 * `releases/latest/download/source.json`.
 *
 * Everything that SideStore checks against the downloaded IPA comes from the
 * built app itself, never from the repository: the version and build number,
 * the IPA's size and hash, the minimum iOS version, and the privacy usage
 * strings. A source that disagrees with its IPA fails to install.
 */

/** What the release build says about itself, from its Info.plist. */
export type BuiltApp = {
  bundleIdentifier: string;
  version: string;
  buildVersion: string;
  minOSVersion: string;
  /** NS…UsageDescription keys and their strings. */
  privacy: Record<string, string>;
  entitlements: string[];
};

export type Release = {
  /** owner/name on GitHub. */
  repository: string;
  tag: string;
  /** When the release was published, as ISO 8601. */
  date: string;
  /** The release's notes, as release-please wrote them (Markdown). */
  notes: string;
  ipaName: string;
  size: number;
  sha256: string;
};

const TINT = '#1F5FD6';

const SCREENSHOTS = ['home', 'home-cards', 'swiper', 'post', 'saved', 'anonymous-dark'];
const SCREENSHOT_SIZE = { width: 1206, height: 2622 };

const DESCRIPTION = [
  'A quiet, read-only Reddit reader for one person.',
  '',
  'Your home feed, Popular and any subreddit, as a list, large cards, a grid of pictures or a fullscreen swiper. Read posts and their comments, save posts and comments and read them back, in light or dark. NSFW and spoiler media stay covered until tapped. Sign in with your Reddit account, or browse anonymously. No ads, no voting, no replying.',
  '',
  'You need a Reddit app client ID of your own (an installed app at reddit.com/prefs/apps). Not affiliated with Reddit.',
].join('\n');

function text(info: Record<string, unknown>, key: string): string {
  const value = info[key];
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Info.plist has no ${key}`);
  }
  return value;
}

/**
 * Reads the built app's Info.plist and entitlements, each converted to JSON
 * with `plutil -convert json`. An unsigned build has no entitlements file.
 */
export function builtApp(
  info: Record<string, unknown>,
  entitlements: Record<string, unknown> = {},
): BuiltApp {
  const privacy: Record<string, string> = {};
  for (const [key, value] of Object.entries(info)) {
    if (/^NS\w+UsageDescription$/.test(key) && typeof value === 'string') {
      privacy[key] = value;
    }
  }
  return {
    bundleIdentifier: text(info, 'CFBundleIdentifier'),
    version: text(info, 'CFBundleShortVersionString'),
    buildVersion: text(info, 'CFBundleVersion'),
    minOSVersion: text(info, 'MinimumOSVersion'),
    privacy,
    entitlements: Object.keys(entitlements).sort(),
  };
}

/**
 * Turns release-please's Markdown into the plain text SideStore shows:
 * section names as lines, entries as bullets, and no links or commit hashes.
 */
export function plainNotes(markdown: string): string {
  const lines: string[] = [];
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    // The version heading repeats what SideStore already shows.
    if (line.startsWith('## ')) continue;
    if (line.startsWith('### ')) {
      if (lines.length > 0) lines.push('');
      lines.push(line.slice(4));
      continue;
    }
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const entry = line
        .slice(2)
        // Commit and issue links: " ([abc1234](https://…))", ", closes [#12](…)"
        .replace(/,?\s*(closes\s+)?\(?\[[0-9a-f]{7,40}\]\([^)]*\)\)?/gi, '')
        .replace(/,?\s*(closes\s+)?\(?\[#\d+\]\([^)]*\)\)?/gi, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .trim();
      if (entry) lines.push(`• ${entry}`);
    }
  }
  return lines.join('\n').trim() || 'Maintenance and small fixes.';
}

export function source(app: BuiltApp, release: Release) {
  if (release.tag !== `v${app.version}`) {
    throw new Error(`Release ${release.tag} holds a build of version ${app.version}`);
  }
  const [owner = ''] = release.repository.split('/');
  const raw = `https://raw.githubusercontent.com/${release.repository}/${release.tag}`;
  const downloadURL = `https://github.com/${release.repository}/releases/download/${release.tag}/${release.ipaName}`;
  const notes = plainNotes(release.notes);

  return {
    name: 'Perch',
    identifier: `${app.bundleIdentifier}.source`,
    subtitle: 'A quiet Reddit reader for your iPhone.',
    description: DESCRIPTION,
    iconURL: `${raw}/assets/images/icon.png`,
    website: `https://github.com/${release.repository}`,
    tintColor: TINT,
    apps: [
      {
        name: 'Perch',
        bundleIdentifier: app.bundleIdentifier,
        developerName: owner,
        subtitle: 'Read Reddit: feeds, posts, comments and saves.',
        localizedDescription: DESCRIPTION,
        iconURL: `${raw}/assets/images/icon.png`,
        tintColor: TINT,
        category: 'social',
        screenshots: SCREENSHOTS.map((name) => ({
          imageURL: `${raw}/e2e/screenshots/${name}.png`,
          ...SCREENSHOT_SIZE,
        })),
        versions: [
          {
            version: app.version,
            buildVersion: app.buildVersion,
            date: release.date,
            localizedDescription: notes,
            downloadURL,
            size: release.size,
            sha256: release.sha256,
            minOSVersion: app.minOSVersion,
          },
        ],
        // The same, for sources read by older versions of AltStore.
        version: app.version,
        versionDate: release.date,
        versionDescription: notes,
        downloadURL,
        size: release.size,
        appPermissions: {
          entitlements: app.entitlements,
          privacy: app.privacy,
        },
      },
    ],
    news: [],
  };
}
