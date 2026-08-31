// ==========================================
// TRANSFERÊNCIAS & REPASSE DE ESTOQUE
// ==========================================

import { state, FALLBACK_USERS_LIST } from './state.js';
import { formatDateBr } from './utils.js';
import { loadAdminProducts } from './products.js';

export function openTransferStockModal(prodId) {
    const prod = state.allProducts.find(p => p.id === prodId);
    if (!prod) return;

    document.getElementById('modalTransferProductId').value = prod.id;
    document.getElementById('modalTransferFlavorDisplay').value = `${prod.icon || '🍫'} Trufa de ${prod.flavor}`;
    document.getElementById('modalTransferQtyInput').value = 5;

    const fromSelect = document.getElementById('modalTransferFromSelect');
    const toSelect = document.getElementById('modalTransferToSelect');

    const users = (Array.isArray(state.allUsers) && state.allUsers.length > 0) ? state.allUsers : FALLBACK_USERS_LIST;

    if (fromSelect && toSelect) {
        fromSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        toSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

        if (prod.sellerId) fromSelect.value = prod.sellerId;
        const otherUser = users.find(u => u.id !== fromSelect.value);
        if (otherUser) toSelect.value = otherUser.id;
    }

    syncModalTransferStockInfo();
    document.getElementById('stockTransferModal').classList.add('active');
}

export function closeTransferStockModal() {
    document.getElementById('stockTransferModal').classList.remove('active');
}

export function syncModalTransferStockInfo() {
    const prodId = document.getElementById('modalTransferProductId')?.value;
    const prod = state.allProducts.find(p => p.id === prodId);
    const stockEl = document.getElementById('modalTransferAvailableStock');
    if (stockEl) {
        stockEl.innerText = `${prod?.stock || 0} un.`;
    }
}

export async function submitStockTransferModal() {
    const productId = document.getElementById('modalTransferProductId').value;
    const fromSellerId = document.getElementById('modalTransferFromSelect').value;
    const toSellerId = document.getElementById('modalTransferToSelect').value;
    const quantity = parseInt(document.getElementById('modalTransferQtyInput').value) || 0;

    if (fromSellerId === toSellerId) {
        Swal.fire({ icon: 'warning', title: 'Vendedores iguais', text: 'Selecione vendedores diferentes para a transferência.', background: '#150e0a', color: '#fff' });
        return;
    }

    if (quantity <= 0) {
        Swal.fire({ icon: 'warning', title: 'Quantidade inválida', text: 'Informe uma quantidade maior que zero.', background: '#150e0a', color: '#fff' });
        return;
    }

    try {
        const res = await fetch('/api/admin/stock/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify({ productId, fromSellerId, toSellerId, quantity })
        });
        const data = await res.json();
        if (data.success) {
            closeTransferStockModal();
            loadAdminProducts();
            loadAdminTransfers();
            Swal.fire({ icon: 'success', title: 'Transferência Concluída! 🔄', text: `${quantity} un. transferidas com sucesso!`, background: '#150e0a', color: '#fff' });
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha na transferência.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro na transferência:', e);
    }
}

export function initTransferTabDropdowns() {
    updateTransferFlavorOptions();
}

export function updateTransferFlavorOptions() {
    const select = document.getElementById('tabTransferProductSelect');
    if (!select) return;
    select.innerHTML = state.allProducts.map(p => `<option value="${p.id}">${p.flavor} (${p.stock || 0} em estoque)</option>`).join('');
}

export async function submitTabStockTransfer() {
    const productId = document.getElementById('tabTransferProductSelect')?.value;
    const fromSellerId = document.getElementById('tabTransferFromSelect')?.value;
    const toSellerId = document.getElementById('tabTransferToSelect')?.value;
    const quantity = parseInt(document.getElementById('tabTransferQtyInput')?.value) || 0;

    if (!productId || quantity <= 0) return;

    try {
        const res = await fetch('/api/admin/stock/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify({ productId, fromSellerId, toSellerId, quantity })
        });
        const data = await res.json();
        if (data.success) {
            loadAdminProducts();
            loadAdminTransfers();
            Swal.fire({ icon: 'success', title: 'Transferência Realizada!', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro no submitTabStockTransfer:', e);
    }
}

export async function loadAdminTransfers() {
    try {
        const res = await fetch(`/api/admin/stock/transfers?_t=${Date.now()}`, {
            headers: { 'authorization': state.adminToken }
        });
        const transfers = await res.json();
        const tbody = document.getElementById('adminTransfersTableBody');
        if (!tbody) return;

        if (!Array.isArray(transfers) || transfers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Nenhuma transferência registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = transfers.map(t => `
            <tr>
                <td>${formatDateBr(t.date || t.createdAt)}</td>
                <td><strong>${t.flavor || 'Trufa'}</strong></td>
                <td><span class="seller-pill">${t.fromSellerName || t.fromSellerId}</span></td>
                <td><span class="seller-pill">${t.toSellerName || t.toSellerId}</span></td>
                <td><strong style="color:var(--amber-gold);">${t.quantity} un.</strong></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Erro ao carregar transferências:', e);
    }
}
