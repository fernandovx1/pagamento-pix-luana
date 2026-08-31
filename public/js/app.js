// ==========================================
// ENTRY POINT PRINCIPAL & INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================

import { state, CURRENT_APP_VERSION, FALLBACK_USERS_LIST } from './state.js';
import * as utils from './utils.js';
import * as api from './api.js';
import * as auth from './auth.js';
import * as products from './products.js';
import * as cart from './cart.js';
import * as directOrder from './directOrder.js';
import * as pix from './pix.js';
import * as dashboard from './dashboard.js';
import * as notes from './notes.js';
import * as schedules from './schedules.js';
import * as confectionery from './confectionery.js';
import * as aiMarketing from './aiMarketing.js';
import * as stats from './stats.js';
import * as stockTransfers from './stockTransfers.js';
import * as users from './users.js';
import * as clientBooking from './clientBooking.js';

// Auto-Cache Buster e Sincronização de Versão
async function checkAppVersionSync() {
    try {
        const res = await fetch(`/api/version?_t=${Date.now()}`);
        const data = await res.json();
        if (data.version && data.version !== CURRENT_APP_VERSION) {
            console.log(`[SYNC] Nova versão detectada: ${data.version}.`);
        }
    } catch (e) {
        // Silencioso
    }
}

// Inicialização Principal da Aplicação
export async function initApp() {
    checkAppVersionSync();
    utils.startButterflySystem();
    await users.loadUsersList();
    await products.loadProducts();

    if (state.currentUser && state.adminToken) {
        dashboard.updateAdminUserDisplay();
    }
}

// ==========================================
// EXPORTAÇÃO GLOBAL PARA RETROCOMPATIBILIDADE TOTAL COM EVENTOS INLINE DO HTML
// (onclick, onchange, onsubmit, oninput, etc.)
// ==========================================
const exportedFunctions = {
    ...utils,
    ...auth,
    ...products,
    ...cart,
    ...directOrder,
    ...pix,
    ...dashboard,
    ...notes,
    ...schedules,
    ...confectionery,
    ...aiMarketing,
    ...stats,
    ...stockTransfers,
    ...users,
    ...clientBooking,
    initApp
};

Object.assign(window, exportedFunctions);

// Sincronização periódica do estoque, anotações e agendamentos a cada 8s
setInterval(() => {
    products.loadProducts();
    if (state.currentUser && state.adminToken) {
        notes.loadAdminNotes();
        schedules.loadAdminSchedules();
    }
}, 8000);

// Listener de inicialização no DOM
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
