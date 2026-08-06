/**
 * WCAG 2.2 contrast check for the token palette in src/styles/global.css.
 * Keep the values here in sync with the CSS custom properties.
 * Exits non-zero if any pair falls below its required ratio.
 */

const light = {
  bg: '#faf7f2',
  bgRaised: '#ffffff',
  ink: '#201c16',
  inkMuted: '#5c5546',
  accents: {
    trellais: '#1d5c42',
    'trellais-2': '#8a6d1f',
    panodash: '#0b6b35',
    ssd: '#6f5410',
    'stacking-sense': '#2b3cc4',
    mwcapcon: '#8a4520',
    geeqoid: '#6d28a8',
  },
};

const dark = {
  bg: '#14110c',
  bgRaised: '#1d1913',
  ink: '#efeae0',
  inkMuted: '#aaa291',
  accents: {
    trellais: '#d9ae53',
    'trellais-2': '#6fbd97',
    panodash: '#3ee07f',
    ssd: '#ddbc63',
    'stacking-sense': '#97a5ff',
    mwcapcon: '#e39a6b',
    geeqoid: '#c29bf0',
  },
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

let failed = false;

function check(label, fg, bg, min) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed = true;
  console.log(
    `${ok ? ' ok ' : 'FAIL'}  ${label.padEnd(44)} ${r.toFixed(2)}:1  (needs ${min}:1)`
  );
}

for (const [mode, t] of [
  ['light', light],
  ['dark', dark],
]) {
  console.log(`\n— ${mode} mode —`);
  for (const bgName of ['bg', 'bgRaised']) {
    const bg = t[bgName];
    check(`ink on ${bgName}`, t.ink, bg, 4.5);
    check(`ink-muted on ${bgName}`, t.inkMuted, bg, 4.5);
    for (const [name, accent] of Object.entries(t.accents)) {
      // Accents are used for small text (kickers, links, status pills) → 4.5:1
      check(`accent ${name} on ${bgName}`, accent, bg, 4.5);
    }
  }
  // Subscribe button: bg text on ink background
  check('bg on ink (button)', t.bg, t.ink, 4.5);
}

console.log('');
if (failed) {
  console.error('Contrast check FAILED');
  process.exit(1);
}
console.log('All contrast checks passed.');
