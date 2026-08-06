/**
 * WCAG 2.2 contrast check for the token palette in src/styles/global.css.
 * Keep the values here in sync with the CSS custom properties.
 * Exits non-zero if any pair falls below its required ratio.
 */

const light = {
  bg: '#f5f7fa',
  bgRaised: '#ffffff',
  ink: '#161a26',
  inkMuted: '#4e5769',
  accents: {
    trellais: '#14594a',
    'trellais-2': '#7a6019',
    panodash: '#0a6b4c',
    ssd: '#6e551c',
    'stacking-sense': '#2b3cc4',
    mwcapcon: '#8c4426',
    geeqoid: '#5b32b5',
  },
};

const dark = {
  bg: '#0a0d18',
  bgRaised: '#131828',
  ink: '#e8ebf2',
  inkMuted: '#9aa3b8',
  accents: {
    trellais: '#e3b961',
    'trellais-2': '#63c6a0',
    panodash: '#35e58c',
    ssd: '#e2c170',
    'stacking-sense': '#96a6ff',
    mwcapcon: '#f0a07a',
    geeqoid: '#bfa0ff',
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
