// ==========================================
// CADERNO DE ANOTAÇÕES & CONTROLE DE FIADOS
// ==========================================

import { state, FALLBACK_USERS_LIST } from './state.js';
import { formatMoney, formatDateBr, setQuickDueDate, setQuickDueDateNextDay, setQuickDueDayOfMonth, setQuickDueFifthBusinessDay, formatPhoneInput } from './utils.js';

export function openNotesQuickView() {
    if (!state.currentUser || !state.adminToken) {
        window._openTabAfterLogin = 'notes';
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }
    openAdminModal();
    const tabBtn = document.getElementById('tabBtnNotes');
    if (tabBtn && typeof switchAdminTab === 'function') switchAdminTab('notes', tabBtn);
}

export async function loadAdminNotes() {
    try {
        let url = `/api/admin/notes?_t=${Date.now()}`;
        const select = document.getElementById('adminSellerSelect');
        const sellerId = select ? select.value : 'all';
        if (sellerId && sellerId !== 'all') {
            url += `&sellerId=${sellerId}`;
        }

        const res = await fetch(url, {
            headers: { 'authorization': state.adminToken }
        });
        const notes = await res.json();
        if (Array.isArray(notes)) {
            state.allNotes = notes;
            renderNotesList(notes);
        }
    } catch (e) {
        console.error('Erro ao carregar anotações:', e);
    }
}

export function renderNotesList(notes) {
    const list = document.getElementById('adminNotesList');
    if (!list) return;

    let filtered = notes || state.allNotes;

    // Filtro por Status
    if (state.currentNotesFilter === 'pending') {
        filtered = filtered.filter(n => n.status !== 'paid');
    } else if (state.currentNotesFilter === 'paid') {
        filtered = filtered.filter(n => n.status === 'paid');
    }

    // Busca
    if (state.notesSearchQuery) {
        filtered = filtered.filter(n => 
            (n.customerName && n.customerName.toLowerCase().includes(state.notesSearchQuery)) ||
            (n.notes && n.notes.toLowerCase().includes(state.notesSearchQuery)) ||
            (n.flavor && n.flavor.toLowerCase().includes(state.notesSearchQuery))
        );
    }

    // Totais de Resumo
    let pendingTotal = 0;
    let paidTotal = 0;
    state.allNotes.forEach(n => {
        if (n.status === 'paid') paidTotal += (n.amount || 0);
        else pendingTotal += (n.amount || 0);
    });

    const pendingEl = document.getElementById('notesPendingTotalDisplay');
    const paidEl = document.getElementById('notesPaidTotalDisplay');
    if (pendingEl) pendingEl.innerText = `R$ ${formatMoney(pendingTotal)}`;
    if (paidEl) paidEl.innerText = `R$ ${formatMoney(paidTotal)}`;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding: 30px 10px;">
                <div class="empty-icon">📝</div>
                <h4 style="color:#cbd5e1;">Nenhuma anotação encontrada</h4>
                <p style="color:#94a3b8; font-size:0.9rem;">Clique em "+ Nova Anotação" para registrar um fiado ou lembrete.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(note => {
        const isPaid = note.status === 'paid';
        const isOverdue = !isPaid && note.dueDate && (new Date(note.dueDate) < new Date().setHours(0,0,0,0));

        return `
            <div class="note-card ${isPaid ? 'note-paid' : (isOverdue ? 'note-overdue' : 'note-pending')}">
                <div class="note-card-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="note-status-dot ${isPaid ? 'dot-paid' : 'dot-pending'}"></span>
                        <strong class="note-customer-name">${note.customerName || 'Cliente'}</strong>
                        ${note.customerPhone ? `<a href="https://wa.me/55${note.customerPhone.replace(/\D/g, '')}" target="_blank" class="btn-wa-link" title="Abrir WhatsApp">📱 ${note.customerPhone}</a>` : ''}
                    </div>
                    <span class="seller-pill">${note.sellerName || 'Fernando'}</span>
                </div>

                <div class="note-card-body">
                    ${note.flavor ? `<div class="note-item-flavor">🍫 ${note.quantity ? `${note.quantity}x ` : ''}${note.flavor}</div>` : ''}
                    ${note.notes ? `<p class="note-text-content">${note.notes}</p>` : ''}
                </div>

                <div class="note-card-footer">
                    <div class="note-meta-info">
                        <span class="note-amount-val">R$ ${formatMoney(note.amount)}</span>
                        ${note.dueDate ? `<span class="note-due-date ${isOverdue ? 'text-danger' : ''}">📅 Venc: ${formatDateBr(note.dueDate)}</span>` : ''}
                    </div>

                    <div class="note-actions">
                        <button class="btn-note-toggle ${isPaid ? 'btn-mark-pending' : 'btn-mark-paid'}" onclick="toggleNoteStatus('${note.id}')">
                            ${isPaid ? '↩️ Reabrir' : '✅ Quitar'}
                        </button>
                        <button class="btn-action-sm btn-edit" onclick="openNoteForm('${note.id}')" title="Editar">✏️</button>
                        <button class="btn-action-sm btn-delete" onclick="deleteNote('${note.id}')" title="Excluir">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function filterNotesStatus(status, el) {
    state.currentNotesFilter = status;
    document.querySelectorAll('.note-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
    renderNotesList();
}

export function handleNotesSearch(e) {
    state.notesSearchQuery = e.target.value.toLowerCase().trim();
    renderNotesList();
}

export function selectNotePaymentStatus(status) {
    state.currentNotePaymentStatus = status;
    document.querySelectorAll('.note-status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
}

export function openNoteForm(noteId) {
    document.getElementById('noteFormModal').classList.add('active');
    
    // Select de vendedor
    const sellerSelect = document.getElementById('noteSellerId');
    if (sellerSelect) {
        const users = (Array.isArray(state.allUsers) && state.allUsers.length > 0) ? state.allUsers : FALLBACK_USERS_LIST;
        sellerSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }

    if (noteId) {
        const note = state.allNotes.find(n => n.id === noteId);
        if (!note) return;
        document.getElementById('noteFormTitle').innerText = '✏️ Editar Anotação';
        document.getElementById('noteId').value = note.id;
        document.getElementById('noteCustomerName').value = note.customerName || '';
        document.getElementById('noteCustomerPhone').value = note.customerPhone || '';
        document.getElementById('noteFlavor').value = note.flavor || '';
        document.getElementById('noteQuantity').value = note.quantity || 1;
        document.getElementById('noteAmount').value = note.amount !== undefined ? note.amount : '';
        document.getElementById('noteDueDate').value = note.dueDate || '';
        document.getElementById('noteDetails').value = note.notes || '';
        if (sellerSelect) sellerSelect.value = note.sellerId || (state.currentUser?.id || 'user-fernando');
        selectNotePaymentStatus(note.status || 'pending');
    } else {
        document.getElementById('noteFormTitle').innerText = '📝 Nova Anotação / Fiado';
        document.getElementById('noteId').value = '';
        document.getElementById('noteCustomerName').value = '';
        document.getElementById('noteCustomerPhone').value = '';
        document.getElementById('noteFlavor').value = '';
        document.getElementById('noteQuantity').value = 1;
        document.getElementById('noteAmount').value = '';
        document.getElementById('noteDueDate').value = '';
        document.getElementById('noteDetails').value = '';
        if (sellerSelect) sellerSelect.value = state.currentUser?.id || 'user-fernando';
        selectNotePaymentStatus('pending');
        setQuickDueFifthBusinessDay();
    }
}

export function closeNoteForm() {
    document.getElementById('noteFormModal').classList.remove('active');
}

export async function submitNoteForm(e) {
    if (e) e.preventDefault();

    const id = document.getElementById('noteId').value.trim();
    const customerName = document.getElementById('noteCustomerName').value.trim();
    const customerPhone = document.getElementById('noteCustomerPhone').value.trim();
    const flavor = document.getElementById('noteFlavor').value.trim();
    const quantity = parseInt(document.getElementById('noteQuantity').value) || 1;
    const amount = parseFloat(document.getElementById('noteAmount').value.replace(',', '.')) || 0;
    const dueDate = document.getElementById('noteDueDate').value || null;
    const notes = document.getElementById('noteDetails').value.trim();
    const sellerSelect = document.getElementById('noteSellerId');
    const sellerId = sellerSelect ? sellerSelect.value : (state.currentUser?.id || 'user-fernando');
    const sellerName = sellerSelect?.options[sellerSelect.selectedIndex]?.text || (state.currentUser?.name || 'Fernando');

    if (!customerName) {
        Swal.fire({ icon: 'warning', title: 'Nome Obrigatório', text: 'Informe o nome do cliente.', background: '#150e0a', color: '#fff' });
        return;
    }

    if (!amount || amount <= 0) {
        Swal.fire({ icon: 'warning', title: 'Valor Obrigatório', text: 'Informe o valor da anotação.', background: '#150e0a', color: '#fff' });
        return;
    }

    const payload = {
        customerName,
        customerPhone,
        flavor,
        quantity,
        amount,
        dueDate,
        notes,
        sellerId,
        sellerName,
        status: state.currentNotePaymentStatus
    };

    try {
        let res;
        if (id) {
            res = await fetch(`/api/admin/notes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/admin/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (data.success) {
            closeNoteForm();
            loadAdminNotes();
            Swal.fire({
                icon: 'success',
                title: id ? 'Anotação Atualizada!' : 'Anotação Registrada!',
                timer: 1200,
                showConfirmButton: false,
                background: '#150e0a',
                color: '#fff'
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao salvar anotação.', background: '#150e0a', color: '#fff' });
        }
    } catch (err) {
        console.error('Erro ao salvar anotação:', err);
    }
}

export async function toggleNoteStatus(noteId) {
    try {
        const res = await fetch(`/api/admin/notes/${noteId}/toggle-status`, {
            method: 'POST',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadAdminNotes();
        }
    } catch (e) {
        console.error('Erro ao alternar status da nota:', e);
    }
}

export async function deleteNote(noteId) {
    const confirm = await Swal.fire({
        title: 'Excluir anotação?',
        text: 'Esta ação não poderá ser desfeita!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        background: '#150e0a',
        color: '#fff'
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/api/admin/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadAdminNotes();
            Swal.fire({ icon: 'success', title: 'Excluído!', timer: 1000, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao excluir anotação:', e);
    }
}

export function chargeNoteViaPix(noteId) {
    const note = state.allNotes.find(n => n.id === noteId);
    if (!note) return;
    if (typeof openCustomPixModal === 'function') {
        openCustomPixModal();
        const amtInput = document.getElementById('customPixAmount');
        const descInput = document.getElementById('customPixDescription');
        const nameInput = document.getElementById('customPixCustomerName');
        if (amtInput) amtInput.value = note.amount;
        if (descInput) descInput.value = `Acerto Trufas - ${note.customerName}`;
        if (nameInput) nameInput.value = note.customerName;
    }
}
