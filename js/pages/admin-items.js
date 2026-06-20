import { requireAuth } from '../auth.js';
import { getItems, createItem, updateItem, deleteItem } from '../api.js';
import { h, openModal } from '../ui.js';

async function init() {
  const user = await requireAuth(['staff', 'admin']);
  if (!user) return;

  const app = document.getElementById('app');

  async function renderPage() {
    const { items } = await getItems();

    app.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">จัดการอุปกรณ์</h1>
        <button class="btn btn-primary" id="btn-create">+ เพิ่มอุปกรณ์</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ชื่อ</th><th>หมวดหมู่</th><th>ทั้งหมด</th><th>พร้อมใช้</th><th>ซ่อม</th><th>การดำเนินการ</th></tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr class="${item.is_active === 0 ? 'item-inactive' : ''}">
                <td>${h(item.name)}</td>
                <td>${h(item.category || '-')}</td>
                <td>${item.total_quantity}</td>
                <td>${item.available_quantity}</td>
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
      </div>`;

    function openItemModal(item = null) {
      const isEdit = Boolean(item);
      const val    = (f, fb = '') => item ? h(item[f] || fb) : fb;
      const close  = openModal(isEdit ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่', `
        <div id="modal-error"></div>
        <form id="item-form" class="form">
          <div class="form-group">
            <label class="form-label">ชื่อ <span class="form-required">*</span></label>
            <input class="form-input" name="name" required value="${val('name')}">
          </div>
          <div class="form-group">
            <label class="form-label">หมวดหมู่</label>
            <input class="form-input" name="category" value="${val('category')}">
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
      document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd  = new FormData(e.target);
        const btn = document.getElementById('modal-submit-btn');
        btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
        const data = {
          name:           fd.get('name'),
          category:       fd.get('category') || undefined,
          description:    fd.get('description') || undefined,
          total_quantity: parseInt(fd.get('total_quantity')),
        };
        try {
          if (isEdit) await updateItem(item.id, data);
          else await createItem(data);
          close();
          await renderPage();
        } catch (err) {
          document.getElementById('modal-error').innerHTML = `<div class="alert alert-error">${h(err.message)}</div>`;
          btn.disabled = false; btn.textContent = 'บันทึก';
        }
      });
    }

    document.getElementById('btn-create').addEventListener('click', () => openItemModal());
    document.querySelectorAll('.do-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(i => i.id === btn.dataset.id);
        openItemModal(item);
      });
    });
    document.querySelectorAll('.do-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`ลบ "${btn.dataset.name}"?`)) return;
        try { await deleteItem(btn.dataset.id); await renderPage(); }
        catch (err) { alert(err.message); }
      });
    });
  }

  await renderPage();
}

init();
