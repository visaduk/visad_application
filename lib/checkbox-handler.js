// Country-agnostic checkbox marker. Iterates the data values for each
// checkbox field declared in cfg.checkboxes and applies the right strategy:
//
//   type: 'div'         — pdf2htmlEX <div> with x/y CSS classes; resolves
//                         coordinates and replaces the empty-glyph in place.
//                         Use for standalone single-box rows.
//
//   type: 'inline_text' — text anchor: replace `<before><empty>?<after>`
//                         with `<before><checked>?<after>` (first match only).
//                         Use for multi-option inline rows like
//                         `□ Male □ Female`, where each option is uniquely
//                         identified by the text immediately after its box.
//
//   type: 'inline'      — legacy Portugal anchor: replace `label_before + empty`
//                         with `label_before + checked`. Functionally a subset
//                         of inline_text — kept for backwards compatibility.
//
//   type: 'inline_last' — Portugal-only hardcoded HTML rewrite for the
//                         last `Other` option in the purpose row.

const { CHECKED_GLYPH, escapeRegex, replaceCheckboxChar } = require('./html-utils');

function applyCheckboxes(html, data, cfg) {
  const cssCache = {};
  const empty = cfg.checkboxGlyphs.empty;

  for (const [field, options] of Object.entries(cfg.checkboxes)) {
    const value = data[field];
    if (!value) continue;

    const values = Array.isArray(value) ? value : [value];
    for (const val of values) {
      const option = options[val];
      if (!option) continue;

      if (option.type === 'div') {
        html = replaceCheckboxChar(html, option, cssCache, empty);
      } else if (option.type === 'inline_text') {
        const before = option.before || '';
        const after = option.after || '';
        const search = before + empty + after;
        const replacement = before + CHECKED_GLYPH + after;
        const idx = html.indexOf(search);
        if (idx !== -1) {
          html = html.substring(0, idx) + replacement + html.substring(idx + search.length);
        }
      } else if (option.type === 'inline') {
        if (option.label_before) {
          html = html.replace(
            option.label_before + empty,
            option.label_before + CHECKED_GLYPH
          );
        }
      } else if (option.type === 'inline_last') {
        // Portugal-only: hardcoded HTML rewrite for the last "Other" of purpose row.
        html = html.replace(
          'it <span class="_ _0"></span><span class="ff5">' + empty + '<span class="ff1"> <span class="_ _2"></span>Ot',
          'it <span class="_ _0"></span><span class="ff5">' + CHECKED_GLYPH + '<span class="ff1"> <span class="_ _2"></span>Ot'
        );
      }
    }
  }

  return html;
}

module.exports = { applyCheckboxes };
