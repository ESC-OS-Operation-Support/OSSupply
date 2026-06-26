import { requireAuth } from '../auth.js';
import { getItems, getItemCategories, createItem, updateItem, deleteItem, photoUrl } from '../api.js';
import { h, openModal, showToast, showConfirm } from '../ui.js';
import { renderSelect, initSelect } from '../select.js';

async function init() {
  const user = await requireAuth(['staff', 'admin']);
  if (!user) return;

  const app = document.getElementById('app');

  let currentPage     = 1;
  let currentSearch   = '';
  let currentCategory = '';
  let debounceTimer;
  let categories      = [];

  ({ categories } = await getItemCategories());

  function renderPagination(pg) {
    if (!pg || pg.pages <= 1) return '';
    const { page, pages, total, limit } = pg;
    const from = (page - 1) * limit + 1;
    const to   = Math.min(page * limit, total);

    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
    }
    const buttons = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) buttons.push(`<span class="pagination-gap">…</span>`);
      buttons.push(`<button class="btn btn-sm page-btn ${n === page ? 'btn-primary' : 'btn-secondary'}" data-page="${n}">${n}</button>`);
      prev = n;
    }

    return `
      <div class="table-pagination">
        <span>แสดง ${from}–${to} จาก ${total} รายการ</span>
        <div style="display:flex;gap:.4rem;align-items:center">
          <button class="btn btn-secondary btn-sm page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>←</button>
          ${buttons.join('')}
          <button class="btn btn-secondary btn-sm page-btn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>→</button>
        </div>
      </div>`;
  }

  function openItemModal(item = null) {
    const isEdit = Boolean(item);
    const val    = (f, fb = '') => item ? h(item[f] ?? fb) : fb;

    const close = openModal(isEdit ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่', `
      <div id="modal-error"></div>
      <form id="item-form" class="form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">ชื่อ <span class="form-required">*</span></label>
            <input class="form-input" name="name" required value="${val('name')}">
          </div>
          <div class="form-group">
            <label class="form-label">หมวดหมู่</label>
            <input class="form-input" name="category" list="cat-datalist" value="${val('category')}">
            <datalist id="cat-datalist">
              ${categories.map(c => `<option value="${h(c)}">`).join('')}
            </datalist>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">หน่วย</label>
            <input class="form-input" name="unit" placeholder="เช่น อัน, กล่อง, ชุด" value="${val('unit')}">
          </div>
          <div class="form-group">
            <label class="form-label">ที่เก็บ (Shelf)</label>
            <input class="form-input" name="stock_location" placeholder="เช่น 01A" value="${val('stock_location')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">คำอธิบาย</label>
          <textarea class="form-textarea" name="description">${val('description')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">จำนวนทั้งหมด <span class="form-required">*</span></label>
          <input class="form-input" type="number" name="total_quantity" min="1" required value="${val('total_quantity', '1')}">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="modal-submit-btn">บันทึก</button>
          <button type="button" class="btn btn-secondary" id="modal-cancel-btn">ยกเลิก</button>
        </div>
      </form>`);

    document.getElementById('modal-cancel-btn').addEventListener('click', close);
    document.getElementById('item-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd  = new FormData(e.target);
      const btn = document.getElementById('modal-submit-btn');
      btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
      const data = {
        name:           fd.get('name'),
        category:       fd.get('category')       || undefined,
        description:    fd.get('description')    || undefined,
        total_quantity: parseInt(fd.get('total_quantity')),
        unit:           fd.get('unit')           || undefined,
        stock_location: fd.get('stock_location') || undefined,
      };
      try {
        if (isEdit) await updateItem(item.id, data);
        else        await createItem(data);
        close();
        showToast(isEdit ? 'แก้ไขอุปกรณ์สำเร็จ' : 'เพิ่มอุปกรณ์สำเร็จ');
        await loadItems();
      } catch (err) {
        document.getElementById('modal-error').innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
        btn.disabled = false; btn.textContent = 'บันทึก';
      }
    });
  }

  async function loadItems() {
    const container = document.getElementById('items-container');
    container.innerHTML = '<div class="spinner">กำลังโหลด...</div>';

    const { items, pagination } = await getItems({
      page: currentPage, limit: 20,
      search:   currentSearch   || undefined,
      category: currentCategory || undefined,
    });

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:48px"></th>
              <th>ชื่อ / ID</th><th>หมวดหมู่</th><th>หน่วย</th><th>ที่เก็บ</th>
              <th>ทั้งหมด</th><th>พร้อมใช้</th><th>ซ่อม</th><th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            ${items.length === 0
              ? `<tr><td colspan="9" class="empty-text">ไม่พบอุปกรณ์</td></tr>`
              : items.map(item => `
                <tr class="${item.is_active === 0 ? 'item-inactive' : ''}">
                  <td style="padding:0.35rem 0.5rem">
                    ${item.image_r2_key
                      ? `<img src="${photoUrl(item.image_r2_key)}" alt="${h(item.name)}" class="table-item-thumb">`
                      : `<div class="table-item-thumb table-item-thumb-ph"></div>`}
                  </td>
                  <td>
                    <span style="font-weight:600">${h(item.name)}</span>
                    <div class="mono" style="font-size:.72rem;color:var(--text-muted);margin-top:.15rem">#${h(String(item.id).slice(0, 8))}</div>
                  </td>
                  <td>${h(item.category || '—')}</td>
                  <td>${h(item.unit || '—')}</td>
                  <td><span class="mono" style="font-size:.82rem">${h(item.stock_location || '—')}</span></td>
                  <td>${item.total_quantity}</td>
                  <td><span class="qty-available">${item.available_quantity}</span></td>
                  <td>${item.repair_quantity}</td>
                  <td>
                    <div class="actions-bar">
                      <button class="btn btn-outline-primary btn-sm do-edit" data-id="${h(item.id)}">แก้ไข</button>
                      <a href="/admin-stock/?id=${h(item.id)}" class="btn btn-secondary btn-sm" style="color:var(--info);border-color:var(--info)">สต็อก</a>
                      <button class="btn btn-danger btn-sm do-delete" data-id="${h(item.id)}" data-name="${h(item.name)}">ลบ</button>
                    </div>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
        ${renderPagination(pagination)}
      </div>`;

    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        loadItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.do-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(i => i.id === btn.dataset.id);
        openItemModal(item);
      });
    });

    container.querySelectorAll('.do-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await showConfirm(`ลบ "${btn.dataset.name}"?`, { danger: true })) return;
        try { await deleteItem(btn.dataset.id); showToast('ลบอุปกรณ์แล้ว'); await loadItems(); }
        catch (err) { alert(err.message); }
      });
    });
  }

  app.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">จัดการอุปกรณ์</h1>
      <button class="btn btn-primary" id="btn-create">+ เพิ่มอุปกรณ์</button>
    </div>
    <div class="filter-row" style="margin-bottom:1.25rem">
      <input class="filter-select search-input" id="search-input" placeholder="ค้นหาชื่ออุปกรณ์..." autocomplete="off">
      ${renderSelect({ id: 'cat-filter', value: '', options: [['', 'ทุกหมวดหมู่'], ...categories.map(c => [c, c])] })}
    </div>
    <div id="items-container"></div>`;

  await loadItems();

  document.getElementById('btn-create').addEventListener('click', () => openItemModal());

  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = e.target.value.trim();
      currentPage   = 1;
      loadItems();
    }, 300);
  });

  initSelect('cat-filter', v => { currentCategory = v; currentPage = 1; loadItems(); });
}

init();
