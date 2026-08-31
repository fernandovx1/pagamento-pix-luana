// ==========================================
// PORTAL DE ENCOMENDAS ONLINE DO CLIENTE
// ==========================================

import { state } from './state.js';
import { formatMoney, formatDateBr, getUpcomingFridays } from './utils.js';

export function openClientBookingModal() {
    state.clientBookingCart = {};
    renderClientFridayChips();
    renderClientBookingFlavors();
    updateClientBookingSummary();
    document.getElementById('clientBookingModal').classList.add('active');
}

export function closeClientBookingModal() {
    document.getElementById('clientBookingModal').classList.remove('active');
}

export function getClientUpcomingFridays() {
    return getUpcomingFridays();
}

export function renderClientFridayChips() {
    const fridays = getUpcomingFridays();
    const container = document.getElementById('clientBookingFridayChips');
    if (!container) return;

    const defaultFriday = fridays[0]?.iso;
    const dateInput = document.getElementById('clientBookingDateInput');
    if (dateInput && defaultFriday) dateInput.value = defaultFriday;

    container.innerHTML = fridays.map((f, i) => `
        <div class="friday-chip ${i === 0 ? 'selected' : ''}" onclick="selectClientFridayDate('${f.iso}', this)">
            <span class="friday-badge">${f.badge}</span>
            <span class="friday-date">${f.label}</span>
        </div>
    `).join('');
}

export function selectClientFridayDate(iso, el) {
    const dateInput = document.getElementById('clientBookingDateInput');
    if (dateInput) dateInput.value = iso;
    document.querySelectorAll('#clientBookingFridayChips .friday-chip').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
}

export function handleClientDateChange(e) {
    const val = e.target.value;
    document.querySelectorAll('#clientBookingFridayChips .friday-chip').forEach(c => c.classList.remove('selected'));
}

export function toggleClientAddressField(type) {
    const addrGroup = document.getElementById('clientBookingAddressGroup');
    if (addrGroup) {
        addrGroup.style.display = (type === 'delivery') ? 'block' : 'none';
    }
}

export function checkReturningClient() {}

export function renderClientBookingFlavors() {
    const container = document.getElementById('clientBookingFlavorsList');
    if (!container) return;

    container.innerHTML = state.allProducts.filter(p => p.active !== false).map(p => {
        const qty = state.clientBookingCart[p.flavor] || 0;
        return `
            <div class="modal-flavor-row">
                <div>
                    <strong style="color:#fff;">${p.icon || '🍫'} ${p.flavor}</strong>
                    <div style="font-size:0.8rem; color:#94a3b8;">R$ ${formatMoney(p.price)} un.</div>
                </div>
                <div class="modal-flavor-qty-control">
                    <button type="button" class="flavor-qty-btn" onclick="updateClientFlavorQty('${p.flavor}', -1)">-</button>
                    <span class="flavor-qty-num" id="clientFlavorQty_${p.flavor}">${qty}</span>
                    <button type="button" class="flavor-qty-btn" onclick="updateClientFlavorQty('${p.flavor}', 1)">+</button>
                </div>
            </div>
        `;
    }).join('');
}

export function updateClientFlavorQty(flavor, delta) {
    let cur = state.clientBookingCart[flavor] || 0;
    cur += delta;
    if (cur < 0) cur = 0;
    state.clientBookingCart[flavor] = cur;
    const el = document.getElementById(`clientFlavorQty_${flavor}`);
    if (el) el.innerText = cur;
    updateClientBookingSummary();
}

export function setClientFlavorQty(flavor, val) {
    state.clientBookingCart[flavor] = Math.max(0, parseInt(val) || 0);
    const el = document.getElementById(`clientFlavorQty_${flavor}`);
    if (el) el.innerText = state.clientBookingCart[flavor];
    updateClientBookingSummary();
}

export function updateClientBookingSummary() {
    let totalItems = 0;
    let totalAmount = 0;

    Object.entries(state.clientBookingCart).forEach(([flavor, qty]) => {
        if (qty > 0) {
            totalItems += qty;
            const prod = state.allProducts.find(p => p.flavor === flavor);
            const price = prod ? (prod.price || 4.00) : 4.00;
            totalAmount += (qty * price);
        }
    });

    const itemsEl = document.getElementById('clientBookingTotalItems');
    const amountEl = document.getElementById('clientBookingTotalAmount');
    if (itemsEl) itemsEl.innerText = `${totalItems} un.`;
    if (amountEl) amountEl.innerText = `R$ ${formatMoney(totalAmount)}`;
}

export async function submitClientBookingOrder(e) {
    if (e) e.preventDefault();

    const name = document.getElementById('clientBookingName').value.trim();
    const phone = document.getElementById('clientBookingPhone').value.trim();
    const date = document.getElementById('clientBookingDateInput').value;
    const time = document.getElementById('clientBookingTimeInput').value || '14:00';
    const deliveryRadio = document.querySelector('input[name="clientDeliveryType"]:checked');
    const deliveryType = deliveryRadio ? deliveryRadio.value : 'pickup';
    const address = document.getElementById('clientBookingAddress').value.trim();
    const notes = document.getElementById('clientBookingNotes').value.trim();

    if (!name || !phone) {
        Swal.fire({ icon: 'warning', title: 'Dados Obrigatórios', text: 'Informe seu nome e WhatsApp para contato.', background: '#150e0a', color: '#fff' });
        return;
    }

    const items = [];
    let totalItems = 0;
    let totalAmount = 0;

    Object.entries(state.clientBookingCart).forEach(([flavor, qty]) => {
        if (qty > 0) {
            const prod = state.allProducts.find(p => p.flavor === flavor);
            const unitPrice = prod ? (prod.price || 4.00) : 4.00;
            items.push({ flavor, quantity: qty, unitPrice });
            totalItems += qty;
            totalAmount += (qty * unitPrice);
        }
    });

    if (items.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Selecione suas trufas', text: 'Escolha pelo menos 1 trufa para encomendar.', background: '#150e0a', color: '#fff' });
        return;
    }

    const payload = {
        customerName: name,
        customerPhone: phone,
        scheduleDate: date,
        scheduleTime: time,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? address : '',
        notes,
        items,
        totalItems,
        totalAmount
    };

    try {
        Swal.fire({ title: 'Enviando encomenda...', background: '#150e0a', color: '#fff', didOpen: () => Swal.showLoading() });
        const res = await fetch('/api/client/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        Swal.close();

        if (data.success) {
            closeClientBookingModal();
            if (data.whatsappMessageText) {
                const encoded = encodeURIComponent(data.whatsappMessageText);
                window.open(`https://wa.me/5511999999999?text=${encoded}`, '_blank');
            }

            Swal.fire({
                icon: 'success',
                title: 'Encomenda Realizada! 🎉',
                text: 'Sua encomenda foi enviada com sucesso! Entraremos em contato para confirmar.',
                background: '#150e0a',
                color: '#fff',
                confirmButtonColor: '#10b981'
            });
        }
    } catch (e) {
        console.error('Erro na encomenda do cliente:', e);
    }
}

export function openClientMyOrdersModal() {
    document.getElementById('clientMyOrdersModal').classList.add('active');
}

export function closeClientMyOrdersModal() {
    document.getElementById('clientMyOrdersModal').classList.remove('active');
}

export async function searchClientOrders() {
    const phoneInput = document.getElementById('clientLookupPhone');
    const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';

    if (!phone || phone.length < 8) {
        Swal.fire({ icon: 'warning', title: 'WhatsApp Inválido', text: 'Digite seu número de WhatsApp completo.', background: '#150e0a', color: '#fff' });
        return;
    }

    try {
        const res = await fetch(`/api/client/orders/${phone}`);
        const data = await res.json();
        const list = document.getElementById('clientOrdersResultList');
        if (!list) return;

        if (!data.orders || data.orders.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">Nenhuma encomenda encontrada para este número.</p>';
            return;
        }

        list.innerHTML = data.orders.map(o => `
            <div class="client-order-history-card">
                <div><strong>📅 Data: ${formatDateBr(o.scheduleDate)}</strong></div>
                <div>Status: <span class="status-badge status-${o.status}">${o.status}</span></div>
                <div style="font-size:0.85rem; color:#cbd5e1; margin-top:4px;">
                    ${o.items?.map(i => `${i.quantity}x ${i.flavor}`).join(', ')}
                </div>
                <div style="margin-top:4px; font-weight:bold; color:var(--amber-gold);">Total: R$ ${formatMoney(o.totalAmount)}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Erro ao buscar encomendas do cliente:', e);
    }
}
