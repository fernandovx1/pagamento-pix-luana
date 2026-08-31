// ==========================================
// PAINEL ADMINISTRATIVO, ABAS & MONITOR DE PEDIDOS
// ==========================================

import { state } from './state.js';
import { formatMoney, playSaleNotificationSound } from './utils.js';
import { loadAdminProducts } from './products.js';
import { loadAdminNotes } from './notes.js';
import { loadAdminSchedules } from './schedules.js';
import { loadAdminConfectionery } from './confectionery.js';
import { loadAdminTransfers } from './stockTransfers.js';
import { loadAdminStats } from './stats.js';
import { loadAdminUsers } from './users.js';

export function toggleAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

export function closeAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.remove('active');
}

export function updateAdminSectionHeader(tabKey) {
    const titles = {
        'ai-creator': '🤖 IA Criadora de Sabores & Marketing',
        'notes': '📝 Caderno de Anotações & Fiados',
        'schedules': '📅 Agendamentos & Encomendas',
        'confectionery': '🧪 Confeitaria & Custos de Produção',
        'truffles': '🍫 Catálogo de Trufas & Estoques',
        'transfers': '🔄 Histórico de Transferências',
        'stats': '📊 Dashboard Executivo & BI',
        'orders': '📦 Pedidos em Tempo Real',
        'users': '👥 Usuários & Vendedores'
    };

    const titleEl = document.getElementById('adminSectionTitle');
    if (titleEl) {
        titleEl.innerText = titles[tabKey] || 'Painel de Gestão';
    }
}

export function openAdminModal() {
    if (!state.currentUser || !state.adminToken) {
        if (typeof openLoginModal === 'function') {
            openLoginModal(true);
        }
        return;
    }

    renderAdminSellerSelect();
    updateAdminUserDisplay();

    document.getElementById('adminModal').classList.add('active');
    startAdminLiveOrderMonitor();
    loadAdminData();
}

export function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
    closeAdminSidebar();
}

export function updateAdminUserDisplay() {
    const nameEl = document.getElementById('adminLoggedUserName');
    const roleEl = document.getElementById('adminLoggedUserRole');
    const avatarEl = document.getElementById('adminLoggedUserAvatar');

    if (nameEl) nameEl.innerText = state.currentUser?.name || 'Administrador';
    if (roleEl) roleEl.innerText = state.currentUser?.role === 'admin' ? 'Administrador' : 'Vendedor';
    if (avatarEl) avatarEl.innerText = state.currentUser?.avatar || '👑';
}

export function renderAdminSellerSelect() {
    const select = document.getElementById('adminSellerSelect');
    if (!select) return;

    select.innerHTML = `
        <option value="all">🌟 Todos os Vendedores</option>
        <option value="user-fernando">👑 Fernando</option>
        <option value="user-luana">🍫 Luana Menato</option>
    `;
}

export function switchAdminTab(tabKey, el) {
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(`tab-${tabKey}`);
    if (target) target.classList.add('active');

    updateAdminSectionHeader(tabKey);
    closeAdminSidebar();

    // Carregamento sob demanda
    if (tabKey === 'notes') loadAdminNotes();
    else if (tabKey === 'schedules') loadAdminSchedules();
    else if (tabKey === 'confectionery') loadAdminConfectionery();
    else if (tabKey === 'truffles') loadAdminProducts();
    else if (tabKey === 'transfers') loadAdminTransfers();
    else if (tabKey === 'stats') loadAdminStats();
    else if (tabKey === 'orders') loadAdminOrders();
    else if (tabKey === 'users') loadAdminUsers();
}

export function loadAdminData() {
    loadAdminProducts();
    loadAdminNotes();
    loadAdminSchedules();
}

export function startAdminLiveOrderMonitor() {
    if (state.isLiveOrderMonitorActive) return;
    state.isLiveOrderMonitorActive = true;

    if (state.lastOrderMonitorInterval) clearInterval(state.lastOrderMonitorInterval);
    state.lastOrderMonitorInterval = setInterval(async () => {
        if (!state.adminToken) return;
        try {
            const res = await fetch(`/api/admin/orders?_t=${Date.now()}`, {
                headers: { 'authorization': state.adminToken }
            });
            const orders = await res.json();
            if (Array.isArray(orders)) {
                let hasNewApproved = false;
                orders.forEach(o => {
                    if (!state.knownOrderIdsSet.has(o.id)) {
                        state.knownOrderIdsSet.add(o.id);
                        if (o.status === 'approved') hasNewApproved = true;
                    }
                });
                if (hasNewApproved) {
                    playSaleNotificationSound();
                }
            }
        } catch (e) {
            // Silencioso
        }
    }, 4000);
}

export async function loadAdminOrders() {
    try {
        const res = await fetch(`/api/admin/orders?_t=${Date.now()}`, {
            headers: { 'authorization': state.adminToken }
        });
        const orders = await res.json();
        const tbody = document.getElementById('adminOrdersTableBody');
        if (!tbody) return;

        if (!Array.isArray(orders) || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">Nenhum pedido recente.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td><strong>#${o.id.slice(-6)}</strong></td>
                <td>${o.customerName || 'Cliente'}</td>
                <td>${o.items?.map(i => `${i.quantity}x ${i.flavor}`).join(', ') || '-'}</td>
                <td><strong style="color:var(--amber-gold);">R$ ${formatMoney(o.totalAmount)}</strong></td>
                <td>
                    <span class="status-badge status-${o.status}">${o.status === 'approved' ? 'Aprovado' : 'Pendente'}</span>
                </td>
                <td>
                    ${o.status !== 'approved' ? `
                        <button class="btn-action-sm" onclick="manualApproveOrder('${o.id}')" title="Aprovar Manualmente">✅ Aprovar</button>
                    ` : '<span style="color:#10b981;">✓ Concluído</span>'}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Erro ao carregar pedidos admin:', e);
    }
}

export async function manualApproveOrder(orderId) {
    try {
        const res = await fetch(`/api/admin/orders/${orderId}/approve-manual`, {
            method: 'POST',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadAdminOrders();
            playSaleNotificationSound();
            Swal.fire({ icon: 'success', title: 'Pedido Aprovado!', timer: 1200, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao aprovar pedido:', e);
    }
}

export function promptResetSystemData() {
    Swal.fire({
        title: '⚠️ ZERAR DADOS DO SISTEMA',
        text: 'Atenção! Esta ação pode apagar produtos, pedidos, notas ou agendamentos.',
        icon: 'warning',
        input: 'select',
        inputOptions: {
            'notes': 'Apenas Caderno de Anotações / Fiados',
            'schedules': 'Apenas Agendamentos',
            'orders': 'Apenas Histórico de Pedidos',
            'transfers': 'Apenas Transferências',
            'products': 'Apenas Catálogo de Produtos',
            'all': '🚨 ZERAR TUDO (Todos os dados)'
        },
        inputPlaceholder: 'Selecione o que deseja zerar',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Confirmar Exclusão',
        cancelButtonText: 'Cancelar',
        background: '#150e0a',
        color: '#fff'
    }).then(async res => {
        if (res.isConfirmed && res.value) {
            const target = res.value;
            const confirm2 = await Swal.fire({
                title: 'Confirmação Final',
                text: `Tem certeza absoluta que deseja limpar ${target}? Digite 'CONFIRMAR' para prosseguir.`,
                input: 'text',
                icon: 'error',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                background: '#150e0a',
                color: '#fff'
            });

            if (confirm2.isConfirmed && confirm2.value === 'CONFIRMAR') {
                const apiRes = await fetch('/api/admin/reset-all-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                    body: JSON.stringify({ target })
                });
                const data = await apiRes.json();
                if (data.success) {
                    loadAdminData();
                    Swal.fire({ icon: 'success', title: 'Dados Zerados!', text: data.message, background: '#150e0a', color: '#fff' });
                }
            }
        }
    });
}
