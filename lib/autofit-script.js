// Injects the editor styles, the client-side interactivity script, and the
// inlined html2canvas/jspdf bundles before </body>.
//
// The client-side checkbox toggle handler is widened to recognize BOTH
// U+2610 (Portugal ☐) and U+25A1 (Italy □) so toggling works on either
// template.

const { TICK_SVG } = require('./html-utils');

function addAutoFitScript(html, opts) {
  const pdfFilename = (opts.pdfFilenamePrefix || 'visa-application') + '.pdf';

  const script = `
<style>
/* ── Editable field indicators ── */
[data-editable="text"] {
  transition: all 0.15s ease;
  border-radius: 2px;
  cursor: move;
}
[data-editable="text"]:hover {
  background: rgba(59, 130, 246, 0.06);
  outline: 1.5px dashed rgba(59, 130, 246, 0.5);
  outline-offset: 1px;
}
[data-editable="text"][contenteditable="true"] {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  border-radius: 2px;
  cursor: text;
  -webkit-user-select: text;
  user-select: text;
}
[data-editable="text"]::selection,
[data-editable="text"] *::selection {
  background: rgba(59, 130, 246, 0.25);
  color: inherit;
}
[data-editable="text"].dragging {
  opacity: 0.7;
  outline: 2px solid #3b82f6;
}

/* Checkbox hover & toggle */
[data-editable="checkbox"] {
  transition: all 0.1s ease;
  border-radius: 2px;
}
[data-editable="checkbox"] .elfill-tick {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  overflow: visible;
}
[data-editable="checkbox"]:hover {
  background: rgba(59, 130, 246, 0.08);
  outline: 1.5px dashed rgba(59, 130, 246, 0.5);
  outline-offset: 1px;
  cursor: pointer;
}

/* ── Toolbar ── */
#elfill-toolbar {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 99999;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
#elfill-toolbar .elfill-logo {
  font-weight: 700;
  font-size: 14px;
  color: #1e293b;
  letter-spacing: -0.3px;
  padding-right: 6px;
  border-right: 1px solid #e2e8f0;
  margin-right: 2px;
}
#elfill-toolbar button {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
  font-family: inherit;
}
#elfill-toolbar .save-btn {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 1px 3px rgba(59,130,246,0.3);
}
#elfill-toolbar .save-btn:hover {
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(59,130,246,0.4);
  transform: translateY(-1px);
}
#elfill-toolbar .save-btn:active {
  transform: translateY(0);
}
#elfill-toolbar .reset-btn {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
#elfill-toolbar .reset-btn:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}
#elfill-toolbar .edit-hint {
  color: #94a3b8;
  font-size: 11px;
  max-width: 140px;
  line-height: 1.3;
}
#elfill-toolbar .addtext-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}
#elfill-toolbar .addtext-btn:hover {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #bae6fd;
}
#elfill-toolbar .addtext-btn.active {
  background: #0ea5e9;
  color: #fff;
  border-color: #0284c7;
  box-shadow: 0 1px 3px rgba(14,165,233,0.3);
}

/* Freeform text cursor when add-text mode is active */
.elfill-addtext-mode .pc {
  cursor: crosshair !important;
}
.elfill-addtext-mode .pc * {
  cursor: crosshair !important;
}
/* Freeform added text */
.elfill-added {
  position: absolute;
  z-index: 10;
  white-space: pre-wrap;
  cursor: move;
  min-width: 20px;
  min-height: 12px;
  transition: outline 0.15s ease;
}
.elfill-added:hover {
  outline: 1.5px dashed #0ea5e9;
  outline-offset: 1px;
}
.elfill-added[contenteditable="true"] {
  outline: 2px solid #0ea5e9;
  outline-offset: 1px;
  background: rgba(14, 165, 233, 0.06);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  cursor: text;
}
.elfill-added.dragging {
  opacity: 0.7;
  outline: 2px solid #0ea5e9;
}

/* ── Format bar (appears near selected freeform text) ── */
#elfill-formatbar {
  position: fixed;
  z-index: 100000;
  background: #1e293b;
  border-radius: 8px;
  padding: 4px 6px;
  display: none;
  gap: 2px;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#elfill-formatbar.show { display: flex; }
#elfill-formatbar button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
  font-family: Georgia, serif;
}
#elfill-formatbar button:hover { background: #334155; color: #fff; }
#elfill-formatbar button.active { background: #3b82f6; color: #fff; }
#elfill-formatbar .fmt-sep {
  width: 1px;
  height: 18px;
  background: #475569;
  margin: 0 3px;
}
#elfill-formatbar select {
  background: #334155;
  color: #e2e8f0;
  border: none;
  border-radius: 5px;
  padding: 4px 6px;
  font-size: 11px;
  cursor: pointer;
  outline: none;
}
#elfill-formatbar select:hover { background: #475569; }
#elfill-formatbar .fmt-delete {
  color: #f87171 !important;
}
#elfill-formatbar .fmt-delete:hover {
  background: #dc2626 !important;
  color: #fff !important;
}

/* ── Loading overlay ── */
#elfill-loading {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 100001;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#elfill-loading.show { display: flex; }
#elfill-loading .spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: elfill-spin 0.8s linear infinite;
}
@keyframes elfill-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
#elfill-loading .loading-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
#elfill-loading .loading-progress {
  color: #94a3b8;
  font-size: 13px;
}

/* ── Toast notification ── */
#elfill-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  z-index: 99999;
  background: #1e293b;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}
#elfill-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Hide everything edit-related when printing ── */
@media print {
  #elfill-toolbar { display: none !important; }
  #elfill-toast { display: none !important; }
  [data-editable] { outline: none !important; background: none !important; box-shadow: none !important; }
  [data-editable]:hover { outline: none !important; background: none !important; transform: none !important; }
  [data-editable][contenteditable] { outline: none !important; background: none !important; box-shadow: none !important; }
  .elfill-added { outline: none !important; background: none !important; box-shadow: none !important; }
  #elfill-formatbar { display: none !important; }
  #elfill-loading { display: none !important; }
  .elfill-added:hover { outline: none !important; }
  .elfill-added[contenteditable] { outline: none !important; background: none !important; box-shadow: none !important; }
}
</style>
<script>
document.addEventListener('DOMContentLoaded', function() {

  // ── Auto-fit: wrap overflowing text ──
  document.querySelectorAll('.c .t').forEach(function(el) {
    if (!el.textContent.trim()) return;
    var container = el.closest('.c');
    if (!container) return;
    var cRect = container.getBoundingClientRect();
    var eRect = el.getBoundingClientRect();
    if (eRect.right > cRect.right + 2) {
      var avail = cRect.right - eRect.left;
      if (avail > 20) {
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
        el.style.width = avail + 'px';
        el.style.lineHeight = '1.2';
      }
    }
  });
  document.querySelectorAll('.pc > .t').forEach(function(el) {
    if (!el.textContent.trim()) return;
    var page = el.closest('.pf');
    if (!page) return;
    var pRect = page.getBoundingClientRect();
    var eRect = el.getBoundingClientRect();
    if (eRect.right > pRect.right + 2) {
      var avail = pRect.right - eRect.left;
      if (avail > 20) {
        el.style.whiteSpace = 'normal';
        el.style.wordWrap = 'break-word';
        el.style.width = avail + 'px';
        el.style.lineHeight = '1.2';
      }
    }
  });

  // ── Editable text fields (drag + format + edit) ──
  var originals = new Map();

  document.querySelectorAll('[data-editable="text"]').forEach(function(el) {
    originals.set(el, el.innerHTML);

    var isDragging = false, hasDragged = false, dragStartX, dragStartY, origLeft, origBottom;
    var pc = el.closest('.pc');

    el.addEventListener('mousedown', function(e) {
      if (el.contentEditable === 'true') return;
      if (e.target.closest('#elfill-formatbar')) return;
      isDragging = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      var cs = window.getComputedStyle(el);
      origLeft = parseFloat(cs.left) || 0;
      origBottom = parseFloat(cs.bottom) || 0;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged = true;
        el.classList.add('dragging');
        var pcRect = pc ? pc.getBoundingClientRect() : null;
        var scaleX = pcRect ? pcRect.width / pc.offsetWidth : 1;
        var scaleY = pcRect ? pcRect.height / pc.offsetHeight : 1;
        el.style.left = (origLeft + dx / scaleX) + 'px';
        el.style.bottom = (origBottom - dy / scaleY) + 'px';
      }
    });

    document.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('dragging');
    });

    el.addEventListener('click', function(e) {
      if (hasDragged) { hasDragged = false; return; }
      if (el.contentEditable === 'true') return;
      showFormatBar(el);
    });

    el.addEventListener('dblclick', function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection().removeAllRanges();
      hideFormatBar();
      el._origWS = el.style.whiteSpace || '';
      el.style.whiteSpace = 'pre-wrap';
      el.contentEditable = 'true';
      el.focus();
      setTimeout(function() {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }, 0);
    });

    el.addEventListener('blur', function() {
      el.contentEditable = 'false';
      el.style.whiteSpace = el._origWS || '';
      if (el.innerHTML !== originals.get(el)) {
        showToast('Field updated');
      }
    });

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.innerHTML = originals.get(el); el.blur(); }
    });
  });

  // ── Editable checkboxes (handles both U+2610 ☐ and U+25A1 □) ──
  var TICK_SVG = ${JSON.stringify(TICK_SVG)};
  var EMPTY_GLYPHS = ['\\u2610', '\\u25A1'];

  function findEmptyGlyphIndex(s) {
    for (var i = 0; i < EMPTY_GLYPHS.length; i++) {
      var idx = s.indexOf(EMPTY_GLYPHS[i]);
      if (idx !== -1) return { idx: idx, glyph: EMPTY_GLYPHS[i] };
    }
    return null;
  }

  // Detect the template's native empty glyph once (☐ for Portugal, □ for Italy)
  // so toggling a pre-checked box off restores the correct character. Per-element
  // detection would fail on boxes that are already ticked server-side because
  // their innerHTML is the SVG, with no glyph to sniff.
  var nativeEmpty = (function () {
    var pages = document.body ? document.body.innerHTML : '';
    if (pages.indexOf('\\u25A1') !== -1) return '\\u25A1';
    return '\\u2610';
  })();

  document.querySelectorAll('[data-editable="checkbox"]').forEach(function(el) {
    originals.set(el, el.innerHTML);
    el.style.cursor = 'pointer';

    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var tick = el.querySelector('.elfill-tick');
      if (tick) {
        tick.outerHTML = nativeEmpty;
      } else {
        var hit = findEmptyGlyphIndex(el.innerHTML);
        if (hit) {
          el.innerHTML = el.innerHTML.replace(hit.glyph, TICK_SVG);
        } else if (el.innerHTML.indexOf('\\u2611') !== -1) {
          el.innerHTML = el.innerHTML.replace('\\u2611', TICK_SVG);
        }
      }
    });
  });

  // ── Toast notification ──
  var toast = document.createElement('div');
  toast.id = 'elfill-toast';
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2000);
  }

  // ── Toolbar ──
  var toolbar = document.createElement('div');
  toolbar.id = 'elfill-toolbar';
  toolbar.innerHTML =
    '<span class="elfill-logo">elfill</span>' +
    '<span class="edit-hint">Click any value to edit</span>' +
    '<button class="addtext-btn" id="elfill-addtext">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M12 5v14M5 12h14"/></svg>' +
      'Add Text</button>' +
    '<button class="save-btn" id="elfill-save">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M6 9l6 6 6-6"/></svg>' +
      'Save as PDF</button>' +
    '<button class="reset-btn" id="elfill-reset">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
      'Reset</button>';
  document.body.appendChild(toolbar);

  var loading = document.createElement('div');
  loading.id = 'elfill-loading';
  loading.innerHTML =
    '<div class="spinner"></div>' +
    '<div class="loading-text">Generating PDF</div>' +
    '<div class="loading-progress" id="elfill-progress">Loading libraries...</div>';
  document.body.appendChild(loading);

  function showLoading(msg) {
    document.getElementById('elfill-progress').textContent = msg;
    loading.classList.add('show');
  }
  function hideLoading() {
    loading.classList.remove('show');
  }

  document.getElementById('elfill-save').addEventListener('click', async function() {
    var btn = this;
    btn.disabled = true;
    showLoading('Preparing PDF...');

    // Snapshot any existing zoom on <html> / <body> so we can restore after capture.
    // Browser zoom (Ctrl+/-) and CSS zoom both distort html2canvas output; we force
    // both to 100% during the capture and put things back afterwards.
    var origHtmlZoom = document.documentElement.style.zoom;
    var origBodyZoom = document.body.style.zoom;
    var origHtmlTransform = document.documentElement.style.transform;
    var origScrollX = window.scrollX;
    var origScrollY = window.scrollY;

    try {
      document.documentElement.style.zoom = '1';
      document.body.style.zoom = '1';
      document.documentElement.style.transform = 'none';
      // Give the browser one paint cycle to settle layout at 100%.
      await new Promise(function(r) { requestAnimationFrame(function() { requestAnimationFrame(r); }); });

      toolbar.style.display = 'none';
      toast.style.display = 'none';
      formatBar.classList.remove('show');
      var pages = document.querySelectorAll('.pf');
      var pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [pages[0].offsetWidth, pages[0].offsetHeight]
      });

      var capStyle = document.createElement('style');
      capStyle.id = 'elfill-capture-hide';
      capStyle.textContent = '[data-editable],[data-editable]:hover,.elfill-added,.elfill-added:hover{outline:none!important;box-shadow:none!important;background:transparent!important;}';
      document.head.appendChild(capStyle);
      loading.classList.remove('show');
      toolbar.style.display = 'none';
      toast.style.display = 'none';
      formatBar.classList.remove('show');

      var allPc = document.querySelectorAll('.pc');
      allPc.forEach(function(pc) { pc.classList.add('opened'); });

      for (var i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage([pages[i].offsetWidth, pages[i].offsetHeight]);

        pages[i].scrollIntoView();
        await new Promise(function(r) { setTimeout(r, 100); });

        var pageW = pages[i].offsetWidth;
        var pageH = pages[i].offsetHeight;
        var canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          // Pin the simulated viewport to the page's intrinsic CSS size so the
          // current browser-zoom / devicePixelRatio can't skew the capture.
          width: pageW,
          height: pageH,
          windowWidth: pageW,
          windowHeight: pageH,
          scrollX: 0,
          scrollY: -window.scrollY,
          ignoreElements: function(el) {
            return el.id === 'elfill-toolbar' || el.id === 'elfill-toast' ||
                   el.id === 'elfill-formatbar' || el.id === 'elfill-loading';
          }
        });

        var imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
      }

      showLoading('Downloading PDF...');
      pdf.save(${JSON.stringify(pdfFilename)});

      hideLoading();
      showToast('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      hideLoading();
      showToast('PDF failed — falling back to print');
      window.print();
    } finally {
      // Restore zoom, scroll, and UI regardless of success/failure.
      document.documentElement.style.zoom = origHtmlZoom;
      document.body.style.zoom = origBodyZoom;
      document.documentElement.style.transform = origHtmlTransform;
      window.scrollTo(origScrollX, origScrollY);
      toolbar.style.display = 'flex';
      toast.style.display = '';
      var hideStyle = document.getElementById('elfill-capture-hide');
      if (hideStyle) hideStyle.remove();
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M6 9l6 6 6-6"/></svg>Save as PDF';
    }
  });

  document.getElementById('elfill-reset').addEventListener('click', function() {
    if (!confirm('Reset all changes to original values?')) return;
    originals.forEach(function(html, el) {
      el.innerHTML = html;
      el.contentEditable = 'false';
    });
    document.querySelectorAll('.elfill-added').forEach(function(el) { el.remove(); });
    showToast('All changes reverted');
  });

  // ── Format bar ──
  var formatBar = document.createElement('div');
  formatBar.id = 'elfill-formatbar';
  formatBar.innerHTML =
    '<button id="fmt-bold" title="Bold (Ctrl+B)"><b>B</b></button>' +
    '<button id="fmt-italic" title="Italic (Ctrl+I)"><i>I</i></button>' +
    '<button id="fmt-underline" title="Underline (Ctrl+U)"><u>U</u></button>' +
    '<div class="fmt-sep"></div>' +
    '<select id="fmt-size" title="Font size">' +
      '<option value="20">Small</option>' +
      '<option value="26">Medium</option>' +
      '<option value="30" selected>Normal</option>' +
      '<option value="38">Large</option>' +
      '<option value="48">XL</option>' +
    '</select>' +
    '<div class="fmt-sep"></div>' +
    '<button id="fmt-delete" class="fmt-delete" title="Delete">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
    '</button>';
  document.body.appendChild(formatBar);

  var activeEl = null;

  function showFormatBar(el) {
    activeEl = el;
    var rect = el.getBoundingClientRect();
    formatBar.style.left = rect.left + 'px';
    formatBar.style.top = (rect.top - 40) + 'px';
    formatBar.classList.add('show');
    var cs = window.getComputedStyle(el);
    document.getElementById('fmt-bold').classList.toggle('active', cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 700);
    document.getElementById('fmt-italic').classList.toggle('active', cs.fontStyle === 'italic');
    document.getElementById('fmt-underline').classList.toggle('active', cs.textDecoration.includes('underline'));
  }

  function hideFormatBar() {
    formatBar.classList.remove('show');
    activeEl = null;
  }

  document.getElementById('fmt-bold').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    var isBold = window.getComputedStyle(activeEl).fontWeight >= 700;
    activeEl.style.fontWeight = isBold ? 'normal' : 'bold';
    this.classList.toggle('active');
  });

  document.getElementById('fmt-italic').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    var isItalic = window.getComputedStyle(activeEl).fontStyle === 'italic';
    activeEl.style.fontStyle = isItalic ? 'normal' : 'italic';
    this.classList.toggle('active');
  });

  document.getElementById('fmt-underline').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    var isUnder = window.getComputedStyle(activeEl).textDecoration.includes('underline');
    activeEl.style.textDecoration = isUnder ? 'none' : 'underline';
    this.classList.toggle('active');
  });

  document.getElementById('fmt-size').addEventListener('change', function(e) {
    if (!activeEl) return;
    activeEl.style.fontSize = this.value + 'px';
  });

  document.getElementById('fmt-delete').addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (!activeEl) return;
    activeEl.remove();
    hideFormatBar();
    showToast('Text removed');
  });

  document.addEventListener('mousedown', function(e) {
    if (e.target.closest('#elfill-formatbar') || e.target.closest('.elfill-added')) return;
    hideFormatBar();
  });

  // ── Add Text mode ──
  var addTextMode = false;
  var addTextBtn = document.getElementById('elfill-addtext');

  addTextBtn.addEventListener('click', function() {
    addTextMode = !addTextMode;
    addTextBtn.classList.toggle('active', addTextMode);
    document.body.classList.toggle('elfill-addtext-mode', addTextMode);
    if (addTextMode) {
      showToast('Click anywhere on the form to add text');
    }
  });

  function setupFreeformEl(newEl, pc) {
    var isDragging = false, dragStartX, dragStartY, origLeft, origBottom;

    newEl.addEventListener('mousedown', function(e) {
      if (newEl.contentEditable === 'true') return;
      if (e.target.closest('#elfill-formatbar')) return;
      isDragging = true;
      newEl.classList.add('dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      origLeft = parseFloat(newEl.style.left) || 0;
      origBottom = parseFloat(newEl.style.bottom) || 0;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      var pcRect = pc.getBoundingClientRect();
      var scaleX = pcRect.width / pc.offsetWidth;
      var scaleY = pcRect.height / pc.offsetHeight;
      newEl.style.left = (origLeft + dx / scaleX) + 'px';
      newEl.style.bottom = (origBottom - dy / scaleY) + 'px';
    });

    document.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      newEl.classList.remove('dragging');
    });

    newEl.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      newEl.contentEditable = 'true';
      newEl.focus();
      var range = document.createRange();
      range.selectNodeContents(newEl);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    newEl.addEventListener('click', function(e) {
      e.stopPropagation();
      if (newEl.contentEditable !== 'true') {
        showFormatBar(newEl);
      }
    });

    newEl.addEventListener('blur', function() {
      if (!newEl.textContent.trim()) {
        newEl.remove();
        hideFormatBar();
      } else {
        newEl.contentEditable = 'false';
        showToast('Text updated');
      }
    });

    newEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); newEl.blur(); }
      if (e.key === 'Escape') { newEl.remove(); hideFormatBar(); }
    });
  }

  document.querySelectorAll('.pc').forEach(function(pc) {
    pc.addEventListener('click', function(e) {
      if (!addTextMode) return;
      if (e.target.closest('[data-editable]') || e.target.closest('.elfill-added')) return;

      var pcRect = pc.getBoundingClientRect();
      var scaleX = pcRect.width / pc.offsetWidth;
      var scaleY = pcRect.height / pc.offsetHeight;
      var clickX = (e.clientX - pcRect.left) / scaleX;
      var clickY = (e.clientY - pcRect.top) / scaleY;
      var pcHeight = pc.offsetHeight;
      var bottomPos = pcHeight - clickY;

      var newEl = document.createElement('div');
      newEl.className = 'elfill-added';
      newEl.style.cssText =
        'left:' + clickX + 'px;' +
        'bottom:' + bottomPos + 'px;' +
        'font-family:ff6;' +
        'font-size:30px;' +
        'line-height:0.915527;' +
        'transform:matrix(0.375,0,0,0.375,0,0);' +
        'transform-origin:0 100%;' +
        'color:#000;';
      newEl.contentEditable = 'true';
      newEl.setAttribute('data-freeform', 'true');
      pc.appendChild(newEl);
      newEl.focus();

      setupFreeformEl(newEl, pc);

      addTextMode = false;
      addTextBtn.classList.remove('active');
      document.body.classList.remove('elfill-addtext-mode');
    });
  });

});
</script>`;

  const libs = `<script>${opts.html2canvasJs}</script><script>${opts.jspdfJs}</script>`;

  if (html.includes('</body>')) {
    html = html.replace('</body>', libs + script + '</body>');
  } else if (html.includes('</html>')) {
    html = html.replace('</html>', libs + script + '</html>');
  } else {
    html += libs + script;
  }
  return html;
}

module.exports = { addAutoFitScript };
