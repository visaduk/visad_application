// Pure HTML utilities shared by all country configs and the checkbox handler.

const TICK_SVG = '<svg class="elfill-tick" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="3.5" width="9" height="9" fill="currentColor"/></svg>';

const EMPTY_GLYPHS = ['\u2610', '\u25A1'];   // ☐ (Portugal) and □ (Italy)
const CHECKED_GLYPH = '\u2611';              // ☑

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mark a div containing oldVal as editable (adds data-editable attribute).
// `loose: true` allows the anchor to be preceded by inner spans/whitespace,
// not just plain text — needed for templates whose values are wrapped in
// leading spans (e.g. Italy's residence_valid_until).
function markDivEditable(html, oldVal, type, opts) {
  const escaped = escapeRegex(oldVal);
  const inner = opts && opts.loose
    ? `(?:(?!<\\/?div)[\\s\\S])*?`
    : `[^<]*`;
  const re = new RegExp(`(<div )(class="t [^"]*">${inner}${escaped})`, 'g');
  return html.replace(re, `$1data-editable="${type}" $2`);
}

// Wrap every checkbox glyph (☐ U+2610, □ U+25A1, ☑ U+2611) in its own clickable
// span so each box toggles independently — including the many boxes inside a
// single multi-option row like `□ Male □ Female`. The client-side handler
// queries these spans directly, not the parent div.
//
// Note: the glyphs in <script> strings appear as escape sequences (`\u2610`),
// not raw characters, in the transmitted HTML — so they won't be matched by
// this regex and the injected JS remains intact.
function tagAllCheckboxDivs(html) {
  html = html.replace(
    /[\u2610\u25A1\u2611]/g,
    function (m) { return '<span data-editable="checkbox">' + m + '</span>'; }
  );
  // Swap any pre-checked ☑ for the SVG tick so it renders bold.
  html = html.replace(
    /(<span data-editable="checkbox">)\u2611(<\/span>)/g,
    '$1' + TICK_SVG + '$2'
  );
  return html;
}

// Wrap value in a bold inline span. Inherits the enclosing div's font-family
// so replacements sit inside the original line box — overriding the font
// (e.g. to Cambria) can push the glyph above its row on templates whose
// embedded fonts have a shorter ascent, breaking vertical alignment.
function bold(val) {
  return `<span style="font-weight:bold;">${val}</span>`;
}

// Resolve a pdf2htmlEX coordinate class (e.g. "y4f", "x12") to its px value.
// Caller passes a per-request `cache` object so cross-request bleeding can't happen.
function getCssValue(html, cls, cache) {
  if (cache[cls] !== undefined) return cache[cls];
  const regex = new RegExp(`\\.${cls}\\{([^}]+)\\}`);
  const match = html.match(regex);
  if (match && match[1].includes('px')) {
    const valMatch = match[1].match(/([\d.]+)/);
    if (valMatch) {
      cache[cls] = parseFloat(valMatch[1]);
      return cache[cls];
    }
  }
  cache[cls] = 0;
  return 0;
}

// Find the next empty-checkbox glyph whose enclosing div has the (x, y) class
// pair matching `option`, then convert it to a tick.
function replaceCheckboxChar(html, option, cssCache, emptyGlyph) {
  let pos = 0;
  while (true) {
    const idx = html.indexOf(emptyGlyph, pos);
    if (idx === -1) break;

    const before = html.substring(Math.max(0, idx - 500), idx);
    const divMatches = [...before.matchAll(/<div class="([^"]+)">/g)];

    if (divMatches.length > 0) {
      const lastDiv = divMatches[divMatches.length - 1];
      const classes = lastDiv[1];
      const yMatch = classes.match(/\b(y[0-9a-f]+)\b/);
      const xMatch = classes.match(/\b(x[0-9a-f]+)\b/);

      if (yMatch && xMatch) {
        const yPx = getCssValue(html, yMatch[1], cssCache);
        const xPx = getCssValue(html, xMatch[1], cssCache);

        if (Math.abs(yPx - option.y) < 1 && Math.abs(xPx - option.x) < 1) {
          return html.substring(0, idx) + CHECKED_GLYPH + html.substring(idx + 1);
        }
      }
    }
    pos = idx + 1;
  }
  return html;
}

module.exports = {
  TICK_SVG,
  EMPTY_GLYPHS,
  CHECKED_GLYPH,
  escapeRegex,
  markDivEditable,
  tagAllCheckboxDivs,
  bold,
  getCssValue,
  replaceCheckboxChar,
};
