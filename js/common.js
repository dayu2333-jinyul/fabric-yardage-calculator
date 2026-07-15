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
