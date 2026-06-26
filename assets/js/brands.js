/* ============================================================
   LORD — Brands page
   ============================================================ */
(function () {
  'use strict';

  const grid = document.getElementById('brandsGrid');
  if (!grid) return;

  const BRANDS = (Array.isArray(window.LORD_BRANDS) ? window.LORD_BRANDS : [])
    .filter((b) => b.count > 0)
    // the house's own unbranded selection goes last, after the famous houses
    .sort((a, b) => (a.name === 'LORD Selection') - (b.name === 'LORD Selection'));

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  grid.innerHTML = BRANDS.map((b, i) => (
    '<a class="bcard" role="listitem" href="products.html?brand=' + encodeURIComponent(b.name) + '"' +
    ' style="animation-delay:' + Math.min(i, 11) * 0.06 + 's">' +
      '<span class="bcard-initial" aria-hidden="true">' + esc(b.name.charAt(0)) + '</span>' +
      '<h2 class="bcard-name">' + esc(b.name) + '</h2>' +
      '<p class="bcard-desc">' + esc(b.description) + '</p>' +
      '<span class="bcard-foot">' +
        '<span class="bcard-count">' + b.count + (b.count === 1 ? ' Piece' : ' Pieces') + '</span>' +
        '<span class="bcard-link">Explore' +
          '<svg width="22" height="8" viewBox="0 0 26 10" fill="none" aria-hidden="true"><path d="M0 5h24M20 1l4 4-4 4" stroke="currentColor"/></svg>' +
        '</span>' +
      '</span>' +
    '</a>'
  )).join('');
})();
