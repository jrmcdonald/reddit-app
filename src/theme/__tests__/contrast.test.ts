import { AA, contrastRatio } from '../contrast';
import { palettes, type Colors } from '../index';

type Role = keyof Colors;

/**
 * Every foreground the app puts on every background it can sit on, with the
 * WCAG AA level it has to meet, in both palettes. A new colour, or a colour
 * used somewhere new, belongs in this list.
 */
const PAIRS: [fg: Role, bg: Role[], minimum: number, what: string][] = [
  ['text', ['background', 'surface', 'surfaceRaised'], AA.text, 'body text'],
  [
    'textSecondary',
    ['background', 'surface', 'surfaceRaised'],
    AA.text,
    'secondary text, captions and post details',
  ],
  ['accent', ['background', 'surface', 'surfaceRaised'], AA.text, 'links, saved marks, the tab'],
  ['onAccent', ['accent'], AA.text, 'text on accent buttons and the selected chip'],
  ['warning', ['background', 'surface', 'surfaceRaised'], AA.text, 'the NSFW badge'],
  ['danger', ['background', 'surface'], AA.text, 'error text and the Sign out row'],
  ['onAccent', ['danger'], AA.text, 'text on destructive buttons'],
  ['onCover', ['cover'], AA.text, 'the "Tap to show" label on covered media'],
  [
    'outline',
    ['background', 'surface', 'surfaceRaised'],
    AA.nonText,
    'field, chip, badge and secondary button edges',
  ],
  ['textSecondary', ['surface', 'background'], AA.nonText, "a comment thread's depth line"],
];

describe.each(['light', 'dark'] as const)('%s theme contrast (WCAG 2.2 AA)', (scheme) => {
  const colors = palettes[scheme];
  const cases = PAIRS.flatMap(([fg, bgs, minimum, what]) =>
    bgs.map((bg) => [fg, bg, minimum, what] as const),
  );

  it.each(cases)('%s on %s is at least %s:1 (%s)', (fg, bg, minimum) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(minimum);
  });
});

describe('the swiper', () => {
  it('has white text on its black backdrop and on the shade behind the caption', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeGreaterThanOrEqual(AA.text);
    // The caption sits on rgba(0,0,0,0.6) over any image: at worst over
    // white, which composites to #666666.
    expect(contrastRatio('#FFFFFF', '#666666')).toBeGreaterThanOrEqual(AA.text);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});
