// === DOM Shortcuts ===
const $ = id => document.getElementById(id);
const qs = (sel, ctx) => (ctx || document).querySelector(sel);
const qsa = (sel, ctx) => (ctx || document).querySelectorAll(sel);
const show = el => { if (el) el.style.display = ''; };
const hide = el => { if (el) el.style.display = 'none'; };
const val = id => { const el = $(id); return el ? el.value : null; };

// === Unit System (metric/imperial) ===
let unitSystem = 'imperial';
const UNIT_IN_TO_CM = 2.54;
const UNIT_YD_TO_M = 0.9144;

function getUnitLabel(key) {
  const labels = {
    inches: unitSystem === 'imperial' ? 'inches' : 'cm',
    in: unitSystem === 'imperial' ? 'in' : 'cm',
    yards: unitSystem === 'imperial' ? 'yards' : 'meters',
    yd: unitSystem === 'imperial' ? 'yd' : 'm',
    waste: unitSystem === 'imperial' ? '%' : '%'
  };
  return labels[key] || key;
}

function toInches(val) {
  return unitSystem === 'imperial' ? val : val / UNIT_IN_TO_CM;
}

function fromInches(val) {
  return unitSystem === 'imperial' ? val : val * UNIT_IN_TO_CM;
}

function toggleUnitSystem(pageId) {
  unitSystem = unitSystem === 'imperial' ? 'metric' : 'imperial';
  const toggle = $('unitToggle');
  if (toggle) {
    toggle.textContent = unitSystem === 'imperial' ? 'Switch to Metric' : 'Switch to Imperial';
    toggle.classList.toggle('metric-active', unitSystem === 'metric');
  }
  // Update all [data-unit] labels
  qsa('[data-unit]').forEach(el => {
    const key = el.dataset.unit;
    el.textContent = getUnitLabel(key);
  });
  // Convert all inputs with data-imperial-val
  qsa('[data-imperial-val]').forEach(el => {
    const imperial = parseFloat(el.dataset.imperialVal);
    if (!isNaN(imperial)) {
      el.value = unitSystem === 'imperial' ? imperial : (imperial * UNIT_IN_TO_CM).toFixed(1);
    }
  });
  // Trigger recalc on current page
  const calcBtn = qs('[data-calc-btn]');
  if (calcBtn && calcBtn.onclick) calcBtn.onclick();
}

// === Yardage Calculation Core ===
function computeYardage({ pieceLen, pieceWid = 0, qty = 1, fw = 54, seam = 0.5, hem = 0, repeat = 0, wastePct = 10 }) {
  const adjLen = pieceLen + seam * 2 + hem + repeat;
  let piecesPerWidth = 1;
  if (pieceWid > 0) {
    const adjWid = pieceWid + seam * 2;
    if (adjWid > 0) piecesPerWidth = Math.floor(fw / adjWid) || 1;
  }
  const totalAdjPieces = Math.ceil(qty / piecesPerWidth);
  const totalInches = totalAdjPieces * adjLen;
  let yards = (totalInches / 36) * (1 + wastePct / 100);
  yards = Math.ceil(yards * 4) / 4;
  return { yards, totalInches, adjLen, piecesPerWidth, totalAdjPieces, totalCm: totalInches * UNIT_IN_TO_CM, meters: yards * UNIT_YD_TO_M };
}

// === Cost Calculation ===
function computeCost(yards, pricePerYard) {
  return (yards * pricePerYard).toFixed(2);
}

// === Fractional Formatting ===
function formatYards(yards) {
  const fracs = { 0: '', 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾' };
  const whole = Math.floor(yards);
  const rem = Math.round((yards - whole) * 100) / 100;
  for (const [dec, sym] of Object.entries(fracs)) {
    if (Math.abs(rem - parseFloat(dec)) < 0.02) {
      return whole > 0 ? (sym ? whole + ' ' + sym : whole.toString()) : (sym || yards.toFixed(2) + ' yds');
    }
  }
  return yards.toFixed(2) + ' yds';
}

// === Unit Toggle on Change ===
function storeImperialVal(el) {
  if (unitSystem === 'imperial') {
    el.dataset.imperialVal = el.value;
  } else {
    const val = parseFloat(el.value);
    if (!isNaN(val)) el.dataset.imperialVal = (val / UNIT_IN_TO_CM).toFixed(2);
  }
}

// === Share Result ===
function shareResult(text) {
  if (navigator.share) {
    navigator.share({ title: 'Fabric Yardage Result', text });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = qs('.share-btn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Share', 2000); }
    }).catch(() => {});
  }
}

// === Print Result ===
function printResult(htmlContent) {
  const w = window.open('', '', 'width=500,height=400');
  w.document.write('<!DOCTYPE html><html><head><title>Fabric Yardage Result</title><style>body{font:14px/1.5 system-ui,sans-serif;padding:24px}@media print{body{padding:0}}</style></head><body>' + htmlContent + '</body></html>');
  w.document.close();
  w.focus();
  w.print();
}

// === Enter Key Support ===
function bindEnterKey(containerId, btnId) {
  qsa('#' + containerId + ' .calc-on-enter').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = $(btnId);
        if (btn) btn.click();
      }
    });
  });
}

// === Realtime Calc Binding ===
function bindRealtimeCalc(containerId, calcFn) {
  qsa('#' + containerId + ' [data-realtime]').forEach(el => {
    el.addEventListener('input', () => {
      if (typeof window[calcFn] === 'function') window[calcFn]();
    });
  });
}

// === Init ===
function initPage() {
  // FAQ accordion
  qsa('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const a = q.nextElementSibling;
      if (a && a.classList.contains('faq-a')) {
        a.classList.toggle('open');
        q.classList.toggle('open');
      }
    });
  });
  // Unit toggle
  const toggle = $('unitToggle');
  if (toggle) {
    toggle.addEventListener('click', toggleUnitSystem);
  }
}

document.addEventListener('DOMContentLoaded', initPage);
// === Exit Intent Overlay ===
let exitShown = false;
function setupExitIntent() {
  document.addEventListener('mouseleave', function(e) {
    if (exitShown) return;
    if (e.clientY > 0) return;
    exitShown = true;
    const overlay = document.createElement('div');
    overlay.className = 'email-modal-overlay';
    overlay.innerHTML = '<div class="email-modal exit-modal" onclick="event.stopPropagation()">' +
      '<button class="email-modal-close" onclick="this.closest(\'.email-modal-overlay\').remove();exitShown=false;">&times;</button>' +
      '<div class="email-modal-icon" style="color:var(--green-deep);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>' +
      '<div class="email-modal-title">Need a Different Calculation?</div>' +
      '<div class="email-modal-desc" style="text-align:center;">Try our specialized calculators for your exact project:</div>' +
      '<div class="exit-links"><a href="/upholstery-fabric-yardage.html" class="exit-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="14" rx="2"/></svg>Upholstery</a><a href="/curtain-fabric-yardage.html" class="exit-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3v18M20 3v18"/></svg>Curtains</a><a href="/cushion-fabric-yardage.html" class="exit-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12a4 4 0 014-4h12a4 4 0 014 4v4a4 4 0 01-4 4H6a4 4 0 01-4-4v-4z"/></svg>Cushions</a><a href="/quilt-fabric-calculator.html" class="exit-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>Quilts</a></div>' +
      '<button class="btn btn-secondary" onclick="this.closest(\'.email-modal-overlay\').remove();exitShown=false;" style="width:100%;justify-content:center;">Stay on this page</button>' +
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.classList.add('show'); }, 10);
  });
}

function setupExitIntentStyles() {
  if (document.getElementById('exitIntentStyles')) return;
  const style = document.createElement('style');
  style.id = 'exitIntentStyles';
  style.textContent = '.email-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;opacity:0;transition:opacity .3s;pointer-events:none}.email-modal-overlay.show{opacity:1;pointer-events:auto}.email-modal{background:var(--card,#1e293b);border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;position:relative;border:1px solid var(--border,#334155);transform:scale(0.95);transition:transform .3s}.email-modal-overlay.show .email-modal{transform:scale(1)}.email-modal-close{position:absolute;top:8px;right:12px;background:none;border:none;color:var(--muted,#94a3b8);font-size:1.5rem;cursor:pointer;padding:4px 8px;line-height:1}.email-modal-close:hover{color:var(--text,#e2e8f0)}.email-modal-icon{font-size:2.5rem;margin-bottom:12px}.email-modal-title{font-size:1.15rem;font-weight:600;margin-bottom:8px;color:var(--text,#e2e8f0)}.email-modal-desc{font-size:0.9rem;color:var(--muted,#94a3b8);margin-bottom:16px;line-height:1.5}.exit-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}.exit-link{display:flex;align-items:center;gap:6px;padding:10px 8px;background:var(--bg,#0f172a);border-radius:8px;text-decoration:none;color:var(--text,#e2e8f0);font-size:0.85rem;transition:all .15s}.exit-link svg{width:18px;height:18px;flex-shrink:0;color:var(--accent,#38bdf8)}.exit-link:hover{background:var(--border,#334155)}';
  document.head.appendChild(style);
}

// Override initPage to also set up exit intent
const origInitPage = initPage;
initPage = function() {
  if (typeof origInitPage === 'function') origInitPage();
  setupExitIntentStyles();
  setupExitIntent();
};

// ═══════════════════════════════════════════════════════════
// Animation Engine — Scroll observer + number pop
// ═══════════════════════════════════════════════════════════

function initAnimations() {
  // Setup scroll observer for .anim-on-scroll elements
  const scrollEls = qsa('.anim-on-scroll');
  if (scrollEls.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    scrollEls.forEach(function(el) { observer.observe(el); });
  }

  // Result number pop on value change
  const resultVal = $('yardsResult');
  if (resultVal) {
    const origSet = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');
    // Use MutationObserver instead
    const obs = new MutationObserver(function() {
      resultVal.classList.remove('pop');
      void resultVal.offsetWidth;
      resultVal.classList.add('pop');
    });
    obs.observe(resultVal, { childList: true, characterData: true, subtree: true });
  }

  // Add click-feedback to all buttons
  qsa('button, .action-btn, .btn').forEach(function(el) {
    if (!el.classList.contains('click-feedback')) {
      el.classList.add('click-feedback');
    }
  });
}

// Wait for DOM and initialize animations
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

// Re-init after dynamic content loads (e.g. modal)
document.addEventListener('DOMContentLoaded', function() {
  // Re-observe new .anim-on-scroll elements added by modals
  setTimeout(function() {
    const newScrollEls = qsa('.anim-on-scroll:not(.anim-observed)');
    if (newScrollEls.length > 0 && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('anim-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      newScrollEls.forEach(function(el) {
        el.classList.add('anim-observed');
        observer.observe(el);
      });
    }
  }, 500);
});
