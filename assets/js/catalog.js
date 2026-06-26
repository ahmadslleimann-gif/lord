/* ============================================================
   LORD — Catalog page (filters, search, sort, quick view)
   ============================================================ */
(function () {
  'use strict';

  const ALL = Array.isArray(window.LORD_PRODUCTS) ? window.LORD_PRODUCTS : [];
  const BRANDS = Array.isArray(window.LORD_BRANDS) ? window.LORD_BRANDS : [];
  const PAGE_SIZE = 24;
  const WHATSAPP = '96181112800';

  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const titleEl = document.getElementById('catalogTitle');
  const countEl = document.getElementById('catalogCount');
  const emptyEl = document.getElementById('catalogEmpty');
  const moreWrap = document.getElementById('catalogMore');
  const moreBtn = document.getElementById('loadMore');
  const searchEl = document.getElementById('catalogSearch');
  const brandSel = document.getElementById('brandSelect');
  const sortSel = document.getElementById('sortSelect');
  const genderChips = document.getElementById('genderChips');
  const categoryChips = document.getElementById('categoryChips');
  const clearBtn = document.getElementById('clearFilters');

  const GENDER_LABEL = { men: 'For Him', women: 'For Her', unisex: 'Unisex' };
  const CATEGORY_LABEL = { perfume: 'Perfumes', eyewear: 'Eyewear', bags: 'Bags', accessories: 'Accessories' };

  // ---------- state from URL ----------
  const params = new URLSearchParams(location.search);
  // legacy links from the old PHP site: ?collection=perfume|glasses
  const legacy = (params.get('collection') || '').toLowerCase();
  const state = {
    gender: (params.get('gender') || '').toLowerCase(),
    category: (params.get('category') || (legacy === 'perfume' ? 'perfume' : legacy === 'glasses' ? 'eyewear' : '')).toLowerCase(),
    brand: params.get('brand') || '',
    q: params.get('q') || '',
    sort: params.get('sort') || 'featured',
    shown: PAGE_SIZE
  };
  if (!GENDER_LABEL[state.gender]) state.gender = '';
  if (!CATEGORY_LABEL[state.category]) state.category = '';
  if (/^\d+$/.test(state.brand)) state.brand = ''; // old numeric brand ids

  // ---------- brand select ----------
  BRANDS.filter((b) => b.count > 0).forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b.name;
    opt.textContent = b.name;
    brandSel.appendChild(opt);
  });
  if (state.brand && ![...brandSel.options].some((o) => o.value === state.brand)) state.brand = '';

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const money = (n) => '$' + Number(n).toFixed(2).replace(/\.00$/, '');

  function discount(p) {
    if (!p.oldPrice || !p.price || p.oldPrice <= p.price) return 0;
    return Math.round((1 - p.price / p.oldPrice) * 100);
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = ALL.filter((p) =>
      (!state.gender || p.gender === state.gender) &&
      (!state.category || p.category === state.category) &&
      (!state.brand || p.brand === state.brand) &&
      (!q || (p.name + ' ' + p.brand + ' ' + (p.description || '')).toLowerCase().includes(q))
    );
    if (state.sort === 'price_asc') list = list.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (state.sort === 'price_desc') list = list.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (state.sort === 'name_asc') list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  function pageTitle() {
    if (state.q.trim()) return '“' + state.q.trim() + '”';
    if (state.brand) return state.brand;
    const g = GENDER_LABEL[state.gender] || '';
    const c = CATEGORY_LABEL[state.category] || '';
    if (g && c) return c + ' — ' + g;
    return g || c || 'All Pieces';
  }

  function syncURL() {
    const p = new URLSearchParams();
    if (state.gender) p.set('gender', state.gender);
    if (state.category) p.set('category', state.category);
    if (state.brand) p.set('brand', state.brand);
    if (state.q.trim()) p.set('q', state.q.trim());
    if (state.sort !== 'featured') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function cardHTML(p, i) {
    const off = discount(p);
    return (
      '<article class="pcard" role="listitem" tabindex="0" data-id="' + p.id + '"' +
      ' aria-label="' + esc(p.name) + ' — ' + money(p.price) + '"' +
      ' style="animation-delay:' + Math.min(i % PAGE_SIZE, 11) * 0.05 + 's">' +
        '<div class="pcard-media">' +
          (off ? '<span class="pcard-badge">-' + off + '%</span>' : '') +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '"' +
            (i < 8 ? '' : ' loading="lazy"') + ' decoding="async" width="600" height="648"' +
            ' onerror="this.src=\'assets/images/lion-gold.png\';this.style.objectFit=\'contain\';this.style.opacity=0.3">' +
          '<span class="pcard-view">Quick View</span>' +
        '</div>' +
        '<div class="pcard-body">' +
          '<div class="pcard-brand">' + esc(p.brand) + '</div>' +
          '<h3 class="pcard-name">' + esc(p.name) + '</h3>' +
          '<div class="pcard-price"><b>' + money(p.price) + '</b>' +
            (p.oldPrice ? '<s>' + money(p.oldPrice) + '</s>' : '') +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    const list = filtered();
    const slice = list.slice(0, state.shown);

    grid.innerHTML = slice.map(cardHTML).join('');
    titleEl.textContent = pageTitle();
    countEl.innerHTML = list.length
      ? 'Showing <b>' + slice.length + '</b> of <b>' + list.length + '</b> pieces'
      : 'No pieces found';
    emptyEl.hidden = list.length > 0;
    moreWrap.hidden = list.length <= state.shown;

    document.title = pageTitle() + ' — LORD | The Collection';
    syncURL();
  }

  // ---------- chips / inputs ----------
  function bindChips(wrap, key) {
    wrap.querySelectorAll('.chip').forEach((chip) => {
      if ((chip.dataset[key] || '') === state[key]) {
        wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
      }
      chip.addEventListener('click', () => {
        wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state[key] = chip.dataset[key] || '';
        state.shown = PAGE_SIZE;
        render();
      });
    });
  }
  bindChips(genderChips, 'gender');
  bindChips(categoryChips, 'category');

  brandSel.value = state.brand;
  brandSel.addEventListener('change', () => {
    state.brand = brandSel.value;
    state.shown = PAGE_SIZE;
    render();
  });

  sortSel.value = ['featured', 'price_asc', 'price_desc', 'name_asc'].includes(state.sort) ? state.sort : 'featured';
  state.sort = sortSel.value;
  sortSel.addEventListener('change', () => {
    state.sort = sortSel.value;
    render();
  });

  searchEl.value = state.q;
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchEl.value;
      state.shown = PAGE_SIZE;
      render();
    }, 220);
  });

  moreBtn.addEventListener('click', () => {
    state.shown += PAGE_SIZE;
    render();
  });

  clearBtn.addEventListener('click', () => {
    state.gender = '';
    state.category = '';
    state.brand = '';
    state.q = '';
    state.sort = 'featured';
    state.shown = PAGE_SIZE;
    searchEl.value = '';
    brandSel.value = '';
    sortSel.value = 'featured';
    [genderChips, categoryChips].forEach((wrap) => {
      wrap.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    });
    render();
  });

  // ---------- quick view ----------
  const qview = document.getElementById('qview');
  const qImg = document.getElementById('qviewImg');
  const qBrand = document.getElementById('qviewBrand');
  const qName = document.getElementById('qviewName');
  const qMeta = document.getElementById('qviewMeta');
  const qDesc = document.getElementById('qviewDesc');
  const qPrice = document.getElementById('qviewPrice');
  const qOld = document.getElementById('qviewOld');
  const qOff = document.getElementById('qviewOff');
  const qOrder = document.getElementById('qviewOrder');
  const qClose = document.getElementById('qviewClose');
  let lastFocus = null;

  function openView(p) {
    qImg.src = p.image;
    qImg.alt = p.name;
    qBrand.textContent = p.brand;
    qName.textContent = p.name;
    qMeta.textContent = [GENDER_LABEL[p.gender], CATEGORY_LABEL[p.category]].filter(Boolean).join(' · ');
    qDesc.textContent = p.description || 'A signature piece from the LORD collection — authentic, sealed, and delivered to your door anywhere in Lebanon.';
    qPrice.textContent = money(p.price);
    const off = discount(p);
    qOld.hidden = !p.oldPrice;
    qOld.textContent = p.oldPrice ? money(p.oldPrice) : '';
    qOff.hidden = !off;
    qOff.textContent = off ? '-' + off + '%' : '';
    qOrder.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(
      'Hello LORD ✦ I would like to order:\n' + p.name + ' — ' + p.brand + '\nPrice: ' + money(p.price)
    );
    lastFocus = document.activeElement;
    qview.hidden = false;
    requestAnimationFrame(() => qview.classList.add('open'));
    document.body.style.overflow = 'hidden';
    qClose.focus();
  }

  function closeView() {
    qview.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { qview.hidden = true; }, 350);
    if (lastFocus) lastFocus.focus();
  }

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    const p = ALL.find((x) => String(x.id) === card.dataset.id);
    if (p) openView(p);
  });
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.pcard');
    if (!card) return;
    e.preventDefault();
    const p = ALL.find((x) => String(x.id) === card.dataset.id);
    if (p) openView(p);
  });
  qClose.addEventListener('click', closeView);
  qview.addEventListener('click', (e) => { if (e.target === qview) closeView(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !qview.hidden) closeView();
  });

  // ---------- first paint ----------
  render();

  // deep link: products.html?id=272 opens the piece directly
  const deepId = params.get('id');
  if (deepId) {
    const p = ALL.find((x) => String(x.id) === deepId);
    if (p) setTimeout(() => openView(p), 600);
  }
})();
