// ==========================================
// GESTÃO DE AGENDAMENTOS & ENCOMENDAS
// ==========================================

import { state, FALLBACK_USERS_LIST } from './state.js';
import { formatMoney, formatDateBr, setQuickDueDate, formatPhoneInput } from './utils.js';

export async function loadAdminSchedules() {
    try {
        let url = `/api/admin/schedules?_t=${Date.now()}`;
        const sellerSelect = document.getElementById('adminSellerSelect');
        const sellerId = sellerSelect ? sellerSelect.value : 'all';
        if (sellerId && sellerId !== 'all') {
            url += `&sellerId=${sellerId}`;
        }

        const res = await fetch(url, {
            headers: { 'authorization': state.adminToken }
        });
        const schedules = await res.json();
        if (Array.isArray(schedules)) {
            state.allSchedules = schedules;
            renderSchedulesList(schedules);
            renderFlavorProductionSummary(schedules);
        }
    } catch (e) {
        console.error('Erro ao carregar agendamentos:', e);
    }
}

export function renderSchedulesList(schedules) {
    const list = document.getElementById('adminSchedulesList');
    if (!list) return;

    let filtered = schedules || state.allSchedules;

    // Filtro por Status
    if (state.currentSchedulesStatusFilter !== 'all') {
        filtered = filtered.filter(s => s.status === state.currentSchedulesStatusFilter);
    }

    // Filtro por Vendedor
    if (state.currentSchedulesSellerFilter !== 'all') {
        filtered = filtered.filter(s => s.sellerId === state.currentSchedulesSellerFilter);
    }

    // Filtro por Data
    if (state.currentSchedulesDateFilter !== 'all') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (state.currentSchedulesDateFilter === 'today') {
            filtered = filtered.filter(s => s.scheduleDate === todayStr);
        } else if (state.currentSchedulesDateFilter === 'upcoming') {
            filtered = filtered.filter(s => s.scheduleDate >= todayStr);
        }
    }

    // Busca
    if (state.schedulesSearchQuery) {
        filtered = filtered.filter(s =>
            (s.customerName && s.customerName.toLowerCase().includes(state.schedulesSearchQuery)) ||
            (s.deliveryAddress && s.deliveryAddress.toLowerCase().includes(state.schedulesSearchQuery)) ||
            (s.notes && s.notes.toLowerCase().includes(state.schedulesSearchQuery))
        );
    }

    // Totais de Resumo
    let totalEncomendas = filtered.length;
    let totalTrufas = 0;
    let valorTotal = 0;
    filtered.forEach(s => {
        totalTrufas += (s.totalItems || 0);
        valorTotal += (s.totalAmount || 0);
    });

    const countEl = document.getElementById('schedulesCountDisplay');
    const truffTotalEl = document.getElementById('schedulesTrufflesTotalDisplay');
    const valTotalEl = document.getElementById('schedulesAmountTotalDisplay');

    if (countEl) countEl.innerText = totalEncomendas;
    if (truffTotalEl) truffTotalEl.innerText = `${totalTrufas} un.`;
    if (valTotalEl) valTotalEl.innerText = `R$ ${formatMoney(valorTotal)}`;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding: 30px 10px;">
                <div class="empty-icon">📅</div>
                <h4 style="color:#cbd5e1;">Nenhum agendamento encontrado</h4>
                <p style="color:#94a3b8; font-size:0.9rem;">Clique em "+ Novo Agendamento" para registrar uma encomenda.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(s => {
        const itemsList = s.items?.map(i => `• ${i.quantity}x Trufa ${i.flavor}`).join('<br>') || 'Itens não detalhados';
        const isDelivery = s.deliveryType === 'delivery';

        return `
            <div class="schedule-card schedule-status-${s.status || 'pending'}">
                <div class="schedule-card-header">
                    <div>
                        <strong class="schedule-customer-name">👤 ${s.customerName}</strong>
                        ${s.customerPhone ? `<a href="https://wa.me/55${s.customerPhone.replace(/\D/g, '')}" target="_blank" class="btn-wa-link" title="Abrir WhatsApp">📱 ${s.customerPhone}</a>` : ''}
                    </div>
                    <span class="seller-pill">${s.sellerName || 'Fernando'}</span>
                </div>

                <div class="schedule-date-badge">
                    <span>📅 ${formatDateBr(s.scheduleDate)} ${s.scheduleTime ? `às ${s.scheduleTime}` : ''}</span>
                    <span class="delivery-badge">${isDelivery ? '🛵 Entrega' : '🏪 Retirada'}</span>
                </div>

                ${isDelivery && s.deliveryAddress ? `<div class="schedule-address">📍 ${s.deliveryAddress}</div>` : ''}

                <div class="schedule-items-box">
                    ${itemsList}
                </div>

                ${s.notes ? `<div class="schedule-notes-text">📝 ${s.notes}</div>` : ''}

                <div class="schedule-card-footer">
                    <div>
                        <span class="schedule-amount-tag">💰 R$ ${formatMoney(s.totalAmount)} (${s.totalItems || 0} un.)</span>
                        <span class="status-badge status-${s.paymentStatus || 'pending'}">${s.paymentStatus === 'paid' ? 'Pago' : (s.paymentStatus === 'deposit' ? 'Sinal Pago' : 'Pagar na Entrega')}</span>
                    </div>

                    <div class="schedule-actions-row">
                        <select class="schedule-status-select" onchange="quickUpdateScheduleStatus('${s.id}', this.value)">
                            <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>⏳ Pendente</option>
                            <option value="confirmed" ${s.status === 'confirmed' ? 'selected' : ''}>✅ Confirmado</option>
                            <option value="ready" ${s.status === 'ready' ? 'selected' : ''}>📦 Pronto</option>
                            <option value="delivered" ${s.status === 'delivered' ? 'selected' : ''}>🛵 Entregue</option>
                            <option value="cancelled" ${s.status === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
                        </select>
                        <button class="btn-action-sm btn-whatsapp" onclick="sendScheduleWhatsApp('${s.id}')" title="Enviar Confirmação no WhatsApp">💬</button>
                        <button class="btn-action-sm btn-edit" onclick="openScheduleForm('${s.id}')" title="Editar">✏️</button>
                        <button class="btn-action-sm btn-delete" onclick="deleteSchedule('${s.id}')" title="Excluir">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function filterSchedulesStatus(status, el) {
    state.currentSchedulesStatusFilter = status;
    document.querySelectorAll('.schedule-filter-status-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderSchedulesList();
}

export function filterSchedulesSeller(sellerId, el) {
    state.currentSchedulesSellerFilter = sellerId;
    document.querySelectorAll('.schedule-filter-seller-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderSchedulesList();
}

export function filterSchedulesDate(dateFilter, el) {
    state.currentSchedulesDateFilter = dateFilter;
    document.querySelectorAll('.schedule-filter-date-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderSchedulesList();
}

export function handleSchedulesSearch(e) {
    state.schedulesSearchQuery = e.target.value.toLowerCase().trim();
    renderSchedulesList();
}

export function toggleProductionSummaryBox() {
    state.isProductionSummaryOpen = !state.isProductionSummaryOpen;
    const body = document.getElementById('productionSummaryBody');
    const icon = document.getElementById('productionSummaryToggleIcon');
    if (body) body.style.display = state.isProductionSummaryOpen ? 'block' : 'none';
    if (icon) icon.innerText = state.isProductionSummaryOpen ? '▼' : '►';
}

export function renderFlavorProductionSummary(schedules) {
    const container = document.getElementById('productionSummaryBody');
    if (!container) return;

    const listToSum = schedules || state.allSchedules;
    const flavorTotals = {};
    let totalAll = 0;

    listToSum.forEach(s => {
        if (s.status !== 'cancelled') {
            s.items?.forEach(item => {
                const flv = item.flavor || 'Diversos';
                flavorTotals[flv] = (flavorTotals[flv] || 0) + (item.quantity || 0);
                totalAll += (item.quantity || 0);
            });
        }
    });

    if (totalAll === 0) {
        container.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem; text-align:center;">Nenhuma trufa para produzir no momento.</p>';
        return;
    }

    container.innerHTML = Object.entries(flavorTotals).map(([flv, qty]) => `
        <div class="summary-flavor-chip">
            <span class="chip-flavor-name">🍫 ${flv}</span>
            <strong class="chip-flavor-qty">${qty} un.</strong>
        </div>
    `).join('') + `
        <div class="summary-total-chip">
            <span>👉 Total a Produzir:</span>
            <strong>${totalAll} trufas</strong>
        </div>
    `;
}

export function initScheduleFlavorsList() {
    state.currentScheduleItemsMap = {};
    renderModalFlavorPicker();
}

export function renderModalFlavorPicker() {
    const container = document.getElementById('modalFlavorPickerList');
    if (!container) return;

    const flavors = state.allProducts.map(p => p.flavor);
    const uniqueFlavors = [...new Set(flavors)];

    container.innerHTML = uniqueFlavors.map(flavor => {
        const qty = state.currentScheduleItemsMap[flavor] || 0;
        return `
            <div class="modal-flavor-row">
                <span class="modal-flavor-name">🍫 ${flavor}</span>
                <div class="modal-flavor-qty-control">
                    <button type="button" class="flavor-qty-btn" onclick="changeScheduleFlavorQty('${flavor}', -1)">-</button>
                    <span class="flavor-qty-num" id="scheduleFlavorQty_${flavor}">${qty}</span>
                    <button type="button" class="flavor-qty-btn" onclick="changeScheduleFlavorQty('${flavor}', 1)">+</button>
                </div>
            </div>
        `;
    }).join('');
}

export function changeScheduleFlavorQty(flavor, delta) {
    let cur = state.currentScheduleItemsMap[flavor] || 0;
    cur += delta;
    if (cur < 0) cur = 0;
    state.currentScheduleItemsMap[flavor] = cur;
    const el = document.getElementById(`scheduleFlavorQty_${flavor}`);
    if (el) el.innerText = cur;
    calcScheduleTotals();
}

export function setScheduleFlavorQty(flavor, qty) {
    state.currentScheduleItemsMap[flavor] = Math.max(0, parseInt(qty) || 0);
    const el = document.getElementById(`scheduleFlavorQty_${flavor}`);
    if (el) el.innerText = state.currentScheduleItemsMap[flavor];
    calcScheduleTotals();
}

export function promptAddCustomFlavorToSchedule() {
    Swal.fire({
        title: 'Adicionar Sabor Personalizado',
        input: 'text',
        inputPlaceholder: 'Nome do sabor (ex: Pistache Cremoso)',
        showCancelButton: true,
        confirmButtonText: 'Adicionar',
        cancelButtonText: 'Cancelar',
        background: '#150e0a',
        color: '#fff',
        confirmButtonColor: '#f59e0b'
    }).then(res => {
        if (res.isConfirmed && res.value?.trim()) {
            const newFlv = res.value.trim();
            state.currentScheduleItemsMap[newFlv] = 1;
            renderModalFlavorPicker();
            calcScheduleTotals();
        }
    });
}

export function calcScheduleTotals() {
    let totalItems = 0;
    let totalAmount = 0;

    Object.entries(state.currentScheduleItemsMap).forEach(([flavor, qty]) => {
        if (qty > 0) {
            totalItems += qty;
            const prod = state.allProducts.find(p => p.flavor.toLowerCase() === flavor.toLowerCase());
            const price = prod ? (prod.price || 4.00) : 4.00;
            totalAmount += (qty * price);
        }
    });

    const itemsEl = document.getElementById('scheduleModalTotalItems');
    const amountEl = document.getElementById('scheduleModalTotalAmount');
    if (itemsEl) itemsEl.innerText = `${totalItems} un.`;
    if (amountEl) amountEl.innerText = `R$ ${formatMoney(totalAmount)}`;
}

export function selectScheduleDeliveryType(type) {
    state.currentScheduleDeliveryType = type;
    document.querySelectorAll('.schedule-delivery-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const addrGroup = document.getElementById('scheduleAddressGroup');
    if (addrGroup) {
        addrGroup.style.display = (type === 'delivery') ? 'block' : 'none';
    }
}

export function selectSchedulePaymentStatus(status) {
    state.currentSchedulePaymentStatus = status;
    document.querySelectorAll('.schedule-payment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
}

export function selectScheduleSeller(sellerId) {
    state.currentScheduleSellerId = sellerId;
    document.querySelectorAll('.schedule-seller-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.seller === sellerId);
    });
}

export function setScheduleQuickDate(days) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const input = document.getElementById('scheduleDateInput');
    if (input) input.value = `${y}-${m}-${d}`;
}

export function setScheduleQuickDayOfWeek(targetDayOfWeek) {
    const today = new Date();
    const curDow = today.getDay();
    const diff = (targetDayOfWeek - curDow + 7) % 7 || 7;
    setScheduleQuickDate(diff);
}

export function recalcPaymentConditionStatus() {
    // Compatibilidade
}

export function openScheduleForm(scheduleId) {
    initScheduleFlavorsList();
    document.getElementById('scheduleFormModal').classList.add('active');

    if (scheduleId) {
        const s = state.allSchedules.find(item => item.id === scheduleId);
        if (!s) return;

        document.getElementById('scheduleFormTitle').innerText = '✏️ Editar Agendamento';
        document.getElementById('scheduleId').value = s.id;
        document.getElementById('scheduleCustomerName').value = s.customerName || '';
        document.getElementById('scheduleCustomerPhone').value = s.customerPhone || '';
        document.getElementById('scheduleDateInput').value = s.scheduleDate || '';
        document.getElementById('scheduleTimeInput').value = s.scheduleTime || '14:00';
        document.getElementById('scheduleDeliveryAddress').value = s.deliveryAddress || '';
        document.getElementById('scheduleNotesInput').value = s.notes || '';
        document.getElementById('scheduleDepositAmount').value = s.depositAmount || '';

        selectScheduleDeliveryType(s.deliveryType || 'pickup');
        selectSchedulePaymentStatus(s.paymentStatus || 'pending');
        selectScheduleSeller(s.sellerId || 'user-fernando');

        // Preencher itens
        state.currentScheduleItemsMap = {};
        s.items?.forEach(i => {
            state.currentScheduleItemsMap[i.flavor] = i.quantity;
        });
        renderModalFlavorPicker();
        calcScheduleTotals();
    } else {
        document.getElementById('scheduleFormTitle').innerText = '📅 Novo Agendamento de Pedido';
        document.getElementById('scheduleId').value = '';
        document.getElementById('scheduleCustomerName').value = '';
        document.getElementById('scheduleCustomerPhone').value = '';
        document.getElementById('scheduleDateInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('scheduleTimeInput').value = '14:00';
        document.getElementById('scheduleDeliveryAddress').value = '';
        document.getElementById('scheduleNotesInput').value = '';
        document.getElementById('scheduleDepositAmount').value = '';

        selectScheduleDeliveryType('pickup');
        selectSchedulePaymentStatus('pending');
        selectScheduleSeller(state.currentUser?.id || 'user-fernando');
        calcScheduleTotals();
    }
}

export function closeScheduleForm() {
    document.getElementById('scheduleFormModal').classList.remove('active');
}

export async function submitScheduleForm(e) {
    if (e) e.preventDefault();

    const id = document.getElementById('scheduleId').value.trim();
    const customerName = document.getElementById('scheduleCustomerName').value.trim();
    const customerPhone = document.getElementById('scheduleCustomerPhone').value.trim();
    const scheduleDate = document.getElementById('scheduleDateInput').value;
    const scheduleTime = document.getElementById('scheduleTimeInput').value || '14:00';
    const deliveryAddress = document.getElementById('scheduleDeliveryAddress').value.trim();
    const notes = document.getElementById('scheduleNotesInput').value.trim();
    const depositAmount = parseFloat(document.getElementById('scheduleDepositAmount').value.replace(',', '.')) || 0;

    if (!customerName) {
        Swal.fire({ icon: 'warning', title: 'Nome Obrigatório', text: 'Informe o nome do cliente.', background: '#150e0a', color: '#fff' });
        return;
    }

    if (!scheduleDate) {
        Swal.fire({ icon: 'warning', title: 'Data Obrigatória', text: 'Selecione a data da encomenda.', background: '#150e0a', color: '#fff' });
        return;
    }

    const items = [];
    let totalItems = 0;
    let totalAmount = 0;

    Object.entries(state.currentScheduleItemsMap).forEach(([flavor, qty]) => {
        if (qty > 0) {
            const prod = state.allProducts.find(p => p.flavor.toLowerCase() === flavor.toLowerCase());
            const unitPrice = prod ? (prod.price || 4.00) : 4.00;
            items.push({ flavor, quantity: qty, unitPrice });
            totalItems += qty;
            totalAmount += (qty * unitPrice);
        }
    });

    if (items.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Selecione as Trufas', text: 'Escolha pelo menos 1 trufa para a encomenda.', background: '#150e0a', color: '#fff' });
        return;
    }

    const sellerName = state.currentScheduleSellerId === 'user-luana' ? 'Luana Menato' : 'Fernando';

    const payload = {
        customerName,
        customerPhone,
        scheduleDate,
        scheduleTime,
        deliveryType: state.currentScheduleDeliveryType,
        deliveryAddress: state.currentScheduleDeliveryType === 'delivery' ? deliveryAddress : '',
        paymentStatus: state.currentSchedulePaymentStatus,
        depositAmount,
        notes,
        sellerId: state.currentScheduleSellerId,
        sellerName,
        items,
        totalItems,
        totalAmount
    };

    try {
        let res;
        if (id) {
            res = await fetch(`/api/admin/schedules/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/admin/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (data.success) {
            closeScheduleForm();
            loadAdminSchedules();
            Swal.fire({
                icon: 'success',
                title: id ? 'Agendamento Atualizado!' : 'Agendamento Registrado!',
                timer: 1200,
                showConfirmButton: false,
                background: '#150e0a',
                color: '#fff'
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao salvar agendamento.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao submeter agendamento:', e);
    }
}

export async function quickUpdateScheduleStatus(scheduleId, status) {
    try {
        const res = await fetch(`/api/admin/schedules/${scheduleId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            loadAdminSchedules();
        }
    } catch (e) {
        console.error('Erro ao alterar status da encomenda:', e);
    }
}

export async function deleteSchedule(scheduleId) {
    const confirm = await Swal.fire({
        title: 'Excluir Encomenda?',
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
        const res = await fetch(`/api/admin/schedules/${scheduleId}`, {
            method: 'DELETE',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadAdminSchedules();
            Swal.fire({ icon: 'success', title: 'Excluído!', timer: 1000, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao excluir agendamento:', e);
    }
}

export function sendScheduleWhatsApp(scheduleId) {
    const s = state.allSchedules.find(item => item.id === scheduleId);
    if (!s) return;

    const phone = (s.customerPhone || '').replace(/\D/g, '');
    if (!phone) {
        Swal.fire({ icon: 'warning', title: 'Sem WhatsApp', text: 'Esta encomenda não possui número cadastrado.', background: '#150e0a', color: '#fff' });
        return;
    }

    const itemsDesc = s.items?.map(i => `• ${i.quantity}x Trufa ${i.flavor} (R$ ${formatMoney(i.quantity * i.unitPrice)})`).join('\n') || '';
    let msg = `🍫 *CONFIRMAÇÃO DE ENCOMENDA - TRUFAS GOURMET* 🍫\n\n`;
    msg += `Olá ${s.customerName}! Sua encomenda está confirmada com a gente:\n\n`;
    msg += `📅 *Data:* ${formatDateBr(s.scheduleDate)} às ${s.scheduleTime || '14:00'}\n`;
    msg += `🛵 *Tipo:* ${s.deliveryType === 'delivery' ? 'Entrega em ' + s.deliveryAddress : 'Retirada no Local'}\n\n`;
    msg += `📦 *ITENS DO PEDIDO:*\n${itemsDesc}\n\n`;
    msg += `👉 *Total:* ${s.totalItems} trufas\n`;
    msg += `💰 *Valor Total:* R$ ${formatMoney(s.totalAmount)}\n`;
    if (s.depositAmount > 0) {
        msg += `💳 *Sinal Pago:* R$ ${formatMoney(s.depositAmount)}\n`;
    }
    msg += `\nQualquer dúvida estamos à disposição! Muito obrigado! ✨`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/55${phone}?text=${encoded}`, '_blank');
}
