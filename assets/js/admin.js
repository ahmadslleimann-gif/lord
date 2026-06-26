/* ============================================================
   LORD — Admin dashboard
   Drafts live in localStorage; publishing = writing the new
   products-data.js (direct save via File System Access API
   when available, otherwise download-and-replace).
   ============================================================ */
(function () {
  'use strict';

  // غيّر كلمة المرور من هون:
  var PASSWORD = 'lord26';

  var DRAFT_KEY = 'lord-admin-draft-v1';
  var CAT_AR = { perfume: 'عطور', eyewear: 'نظارات', bags: 'شنط', accessories: 'إكسسوارات' };
  var GEN_AR = { men: 'رجالي', women: 'نسائي', unisex: 'يونيسكس' };

  // ---------- state ----------
  var published = Array.isArray(window.LORD_PRODUCTS) ? window.LORD_PRODUCTS : [];
  var brandMeta = {};
  (Array.isArray(window.LORD_BRANDS) ? window.LORD_BRANDS : []).forEach(function (b) {
    brandMeta[b.name] = b.description || '';
  });

  var products;
  var dirty = false;
  var editingId = null;
  var pendingImage = null; // dataURL chosen in the open modal
  var fileHandle = null;   // File System Access handle for direct save

  try {
    var draft = localStorage.getItem(DRAFT_KEY);
    products = draft ? JSON.parse(draft) : JSON.parse(JSON.stringify(published));
    dirty = !!draft;
  } catch (e) {
    products = JSON.parse(JSON.stringify(published));
  }

  // ---------- elements ----------
  var $ = function (id) { return document.getElementById(id); };
  var gate = $('admGate'), app = $('admApp');

  // ---------- login ----------
  $('admLoginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('admPass').value === PASSWORD) {
      sessionStorage.setItem('lord-admin-in', '1');
      enter();
    } else {
      $('admGateErr').hidden = false;
      $('admPass').value = '';
      $('admPass').focus();
    }
  });
  function enter() {
    gate.hidden = true;
    app.hidden = false;
    render();
    updateSaveStatus();
    detectServer();
  }
  if (sessionStorage.getItem('lord-admin-in') === '1') enter();

  // ---------- server publishing (when hosted with PHP) ----------
  // On the real hosting, api/save-products.php writes the catalog file
  // directly — one click and the products are live. On a static/local
  // server the ping fails and the download/direct-save buttons remain.
  var serverMode = false;
  function detectServer() {
    if (location.protocol === 'file:') return;
    fetch('api/save-products.php', { method: 'GET', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ping) {
          serverMode = true;
          $('admPublishServer').hidden = false;
          $('admDownload').classList.remove('solid');
          $('admDownload').classList.add('ghost');
          $('admSaveDirect').hidden = true;
        }
      })
      .catch(function () { /* static hosting — keep the fallback buttons */ });
  }

  $('admPublishServer').addEventListener('click', function () {
    var pass = prompt('تأكيد النشر — اكتب كلمة المرور:');
    if (pass == null) return;
    var btn = this;
    btn.disabled = true;
    btn.textContent = '… عم ينشر';
    fetch('api/save-products.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass, content: buildFile() })
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.j && res.j.ok) {
          alert('انتشر ✦ المنتجات صارت ظاهرة عالموقع');
          published_ok();
        } else if (res.status === 403) {
          alert('كلمة المرور غلط — ما انتشر شي');
        } else {
          alert('صار خطأ بالنشر: ' + ((res.j && res.j.error) || res.status) + '\nجرب زر «نشر — تنزيل الملف»');
        }
      })
      .catch(function () {
        alert('ما قدرت اوصل عالسيرفر — جرب زر «نشر — تنزيل الملف»');
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'نشر عالموقع ⚡';
      });
  });

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) { return '$' + Number(n).toFixed(2).replace(/\.00$/, ''); }

  function markDirty() {
    dirty = true;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(products));
      localStorage.setItem(DRAFT_KEY + '-savedAt', new Date().toISOString());
    } catch (e) {}
    $('admDirty').hidden = false;
    updateSaveStatus();
  }

  function updateSaveStatus() {
    var savedAt = localStorage.getItem(DRAFT_KEY + '-savedAt');
    var statusEl = $('admStatus');
    var savedAtEl = $('admSavedAt');
    if (dirty && savedAt) {
      var date = new Date(savedAt);
      savedAtEl.textContent = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      statusEl.hidden = false;
      $('admDirty').hidden = false;
    } else if (!dirty) {
      statusEl.hidden = true;
      $('admDirty').hidden = true;
    }
  }

  function nextId() {
    var max = 0;
    products.concat(published).forEach(function (p) { if (p.id > max) max = p.id; });
    return max + 1;
  }

  // ---------- render ----------
  function render() {
    // stats
    var sale = products.filter(function (p) { return p.oldPrice; }).length;
    var brands = {};
    products.forEach(function (p) { brands[p.brand] = 1; });
    $('admStats').innerHTML =
      stat(products.length, 'منتج') +
      stat(sale, 'على التخفيض') +
      stat(Object.keys(brands).length, 'ماركة') +
      stat(dirty ? 'مسودة' : 'منشور', 'حالة التعديلات');

    // brand datalist
    $('brandList').innerHTML = Object.keys(brands).sort().map(function (b) {
      return '<option value="' + esc(b) + '">';
    }).join('');

    // rows
    var q = $('admSearch').value.trim().toLowerCase();
    var fc = $('admFilterCat').value, fg = $('admFilterGen').value;
    var sortBy = $('admSort').value;
    var list = products.filter(function (p) {
      return (!fc || p.category === fc) && (!fg || p.gender === fg) &&
        (!q || (p.name + ' ' + p.brand).toLowerCase().indexOf(q) !== -1);
    });

    list.sort(function (a, b) {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ar', { sensitivity: 'base' });
      }
      if (sortBy === 'priceAsc') {
        return a.price - b.price;
      }
      if (sortBy === 'priceDesc') {
        return b.price - a.price;
      }
      return b.id - a.id;
    });

    $('admRows').innerHTML = list.map(function (p) {
      return '<tr data-id="' + p.id + '">' +
        '<td><img class="adm-thumb" src="' + esc(p.image) + '" alt="" loading="lazy" ' +
          'onerror="this.src=\'assets/images/lion-gold.png\';this.style.opacity=0.35"></td>' +
        '<td class="adm-name">' + esc(p.name) + '</td>' +
        '<td>' + esc(p.brand) + '</td>' +
        '<td><span class="adm-chip">' + (CAT_AR[p.category] || p.category) + '</span></td>' +
        '<td>' + (GEN_AR[p.gender] || p.gender) + '</td>' +
        '<td class="adm-price">' + money(p.price) +
          (p.oldPrice ? ' <s>' + money(p.oldPrice) + '</s>' : '') + '</td>' +
        '<td class="adm-row-actions">' +
          '<button type="button" class="adm-mini" data-act="edit">تعديل</button>' +
          '<button type="button" class="adm-mini danger" data-act="del">حذف</button>' +
        '</td></tr>';
    }).join('');
    $('admEmpty').hidden = list.length > 0;
    $('admDirty').hidden = !dirty;
  }
  function stat(v, label) {
    return '<div class="adm-stat"><b>' + v + '</b><span>' + label + '</span></div>';
  }

  ['admSearch', 'admFilterCat', 'admFilterGen', 'admSort'].forEach(function (id) {
    $(id).addEventListener('input', render);
  });
  $('admClearFilters').addEventListener('click', function () {
    $('admSearch').value = '';
    $('admFilterCat').value = '';
    $('admFilterGen').value = '';
    $('admSort').value = 'new';
    render();
  });

  // ---------- table actions ----------
  $('admRows').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = Number(btn.closest('tr').dataset.id);
    var p = products.find(function (x) { return x.id === id; });
    if (!p) return;
    if (btn.dataset.act === 'edit') openModal(p);
    else if (btn.dataset.act === 'del') {
      if (confirm('أكيد بدك تحذف «' + p.name + '»؟')) {
        products = products.filter(function (x) { return x.id !== id; });
        markDirty();
        render();
      }
    }
  });

  // ---------- modal ----------
  var modal = $('admModal');

  function openModal(p) {
    editingId = p ? p.id : null;
    pendingImage = p ? p.image : null;
    $('admFormTitle').textContent = p ? 'تعديل: ' + p.name : 'منتج جديد';
    $('fName').value = p ? p.name : '';
    $('fBrand').value = p ? p.brand : '';
    $('fCategory').value = p ? p.category : 'perfume';
    $('fPrice').value = p ? p.price : '';
    $('fOldPrice').value = p && p.oldPrice ? p.oldPrice : '';
    $('fGender').value = p ? p.gender : 'men';
    $('fDesc').value = p ? (p.description || '') : '';
    $('fImageFile').value = '';
    var prev = $('fImagePreview');
    prev.hidden = !pendingImage;
    if (pendingImage) prev.src = pendingImage;
    $('fImageHint').hidden = !!pendingImage;
    modal.hidden = false;
    $('fName').focus();
  }
  function closeModal() { modal.hidden = true; }

  $('admAdd').addEventListener('click', function () { openModal(null); });
  $('admFormCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // image upload → compressed dataURL (max 700px, JPEG 82%)
  $('fImageFile').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var MAX = 700;
        var scale = Math.min(1, MAX / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        pendingImage = c.toDataURL('image/jpeg', 0.82);
        var prev = $('fImagePreview');
        prev.src = pendingImage;
        prev.hidden = false;
        $('fImageHint').hidden = true;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  $('admForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var price = parseFloat($('fPrice').value);
    var old = parseFloat($('fOldPrice').value);
    var data = {
      id: editingId != null ? editingId : nextId(),
      name: $('fName').value.trim(),
      brand: $('fBrand').value.trim() || 'LORD Selection',
      price: price,
      oldPrice: (old && old > price) ? old : null,
      image: pendingImage || 'assets/images/lion-gold.png',
      gender: $('fGender').value,
      category: $('fCategory').value,
      description: $('fDesc').value.trim()
    };
    if (editingId != null) {
      var i = products.findIndex(function (x) { return x.id === editingId; });
      products[i] = data;
    } else {
      products.unshift(data); // الجديد بيطلع بأول الصفحة
    }
    markDirty();
    closeModal();
    render();
  });

  // ---------- reset ----------
  $('admReset').addEventListener('click', function () {
    if (!confirm('رح ترجع كل المنتجات متل ما هي بالملف المنشور وتنحذف المسودة. أكيد؟')) return;
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY + '-savedAt');
    products = JSON.parse(JSON.stringify(published));
    dirty = false;
    render();
    updateSaveStatus();
  });

  // ---------- publish ----------
  function buildFile() {
    var brands = {};
    products.forEach(function (p) { brands[p.brand] = (brands[p.brand] || 0) + 1; });
    var brandList = Object.keys(brands)
      .sort(function (a, b) { return brands[b] - brands[a]; })
      .map(function (name) {
        return {
          name: name,
          count: brands[name],
          description: brandMeta[name] || 'Premium quality, verified authentic'
        };
      });
    return (
      '/* ============================================================\n' +
      '   LORD — PRODUCT CATALOG DATA\n' +
      '   To add a product: copy one block below, change the values,\n' +
      '   put the photo in assets/images/products/ and save this file.\n' +
      '   gender: "men" | "women" | "unisex"\n' +
      '   category: "perfume" | "eyewear" | "bags" | "accessories"\n' +
      '   oldPrice: null if not on sale\n' +
      '   (يمكن تعديل هالملف من لوحة التحكم admin.html)\n' +
      '   ============================================================ */\n\n' +
      'window.LORD_PRODUCTS = ' + JSON.stringify(products, null, 2) + ';\n\n' +
      'window.LORD_BRANDS = ' + JSON.stringify(brandList, null, 2) + ';\n'
    );
  }

  function published_ok() {
    dirty = false;
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY + '-savedAt');
    published = JSON.parse(JSON.stringify(products));
    render();
    updateSaveStatus();
  }

  $('admDownload').addEventListener('click', function () {
    var blob = new Blob([buildFile()], { type: 'text/javascript;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products-data.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    alert('نزل الملف ✦\nاستبدل فيه الملف القديم:\nassets/js/products-data.js');
    published_ok();
  });

  // direct save (Chrome/Edge): pick assets/js/products-data.js once, then overwrite
  if (window.showSaveFilePicker) {
    var direct = $('admSaveDirect');
    direct.hidden = false;
    direct.addEventListener('click', function () {
      (async function () {
        try {
          if (!fileHandle) {
            fileHandle = await window.showSaveFilePicker({
              suggestedName: 'products-data.js',
              types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }]
            });
          }
          var w = await fileHandle.createWritable();
          await w.write(buildFile());
          await w.close();
          alert('انحفظ مباشرة ✦ المنتجات صارت منشورة عالموقع');
          published_ok();
        } catch (err) {
          if (err && err.name !== 'AbortError') {
            alert('ما قدرت احفظ مباشرة — استعمل زر «نشر — تنزيل الملف»');
          }
        }
      })();
    });
  }
})();
