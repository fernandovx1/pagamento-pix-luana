// ==========================================
// DASHBOARD EXECUTIVO & BI COM CHART.JS
// ==========================================

import { state } from './state.js';
import { formatMoney } from './utils.js';

export function setStatsPeriod(period, el) {
    state.currentStatsPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
    loadAdminStats();
}

export async function loadAdminStats() {
    try {
        const sellerSelect = document.getElementById('adminSellerSelect');
        const sellerId = sellerSelect ? sellerSelect.value : 'all';

        const res = await fetch(`/api/admin/stats?sellerId=${sellerId}&period=${state.currentStatsPeriod}&_t=${Date.now()}`, {
            headers: { 'authorization': state.adminToken }
        });
        const stats = await res.json();
        if (stats.success) {
            renderStatsDashboard(stats);
            renderBiCharts(stats);
        }
    } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
    }
}

export function renderStatsDashboard(stats) {
    const grossEl = document.getElementById('statGrossRevenue');
    const netEl = document.getElementById('statNetProfit');
    const countEl = document.getElementById('statTotalSalesCount');
    const truffEl = document.getElementById('statTotalTrufflesSold');

    if (grossEl) grossEl.innerText = `R$ ${formatMoney(stats.grossRevenue || 0)}`;
    if (netEl) netEl.innerText = `R$ ${formatMoney(stats.netProfit || 0)}`;
    if (countEl) countEl.innerText = stats.totalOrders || 0;
    if (truffEl) truffEl.innerText = `${stats.totalUnits || 0} un.`;

    const rankList = document.getElementById('statsFlavorsRankingList');
    if (rankList && stats.flavorRanking) {
        const maxUnits = stats.flavorRanking[0]?.units || 1;
        rankList.innerHTML = stats.flavorRanking.slice(0, 5).map((item, idx) => {
            const pct = ((item.units / maxUnits) * 100).toFixed(0);
            return `
                <div class="flavor-rank-row">
                    <div class="flavor-rank-label">
                        <span>#${idx + 1} ${item.flavor}</span>
                        <strong>${item.units} un. (R$ ${formatMoney(item.revenue)})</strong>
                    </div>
                    <div class="flavor-progress-bar">
                        <div class="flavor-progress-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

export function renderBiCharts(stats) {
    if (!window.Chart) return;

    const revCtx = document.getElementById('revenueChartCanvas')?.getContext('2d');
    if (revCtx) {
        if (window._revenueChartInstance) window._revenueChartInstance.destroy();
        window._revenueChartInstance = new Chart(revCtx, {
            type: 'line',
            data: {
                labels: stats.chartLabels || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: stats.chartRevenueData || [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    fill: true,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}
