// ==========================================
// CONFEITARIA: LÓGICA POR KG & CASQUINHAS
// ==========================================

import { state } from './state.js';
import { formatMoney } from './utils.js';
import { loadAdminProducts } from './products.js';

export async function loadAdminConfectionery() {
    await loadIngredientsList();
    await loadRecipesList();
    initConfectioneryBaseInputs();
    loadProductionShoppingList();
}

export async function loadIngredientsList() {
    try {
        const res = await fetch(`/api/admin/ingredients?_t=${Date.now()}`, {
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
            state.allIngredients = data;
            renderFillingsTable(data);
        }
    } catch (e) {
        console.error('Erro ao carregar insumos:', e);
    }
}

export function initConfectioneryBaseInputs() {
    const chocoIng = state.allIngredients.find(i => i.id === 'base-chocolate-casquinha' || i.name.toLowerCase().includes('chocolate'));
    const packIng = state.allIngredients.find(i => i.id === 'base-embalagem-adesivo' || i.name.toLowerCase().includes('embalagem'));

    const chocoInput = document.getElementById('baseChocolatePriceInput');
    const packInput = document.getElementById('basePackagingPriceInput');

    if (chocoInput && chocoIng) chocoInput.value = chocoIng.packagePrice;
    if (packInput && packIng) packInput.value = packIng.packagePrice;

    recalcBaseConfectioneryCosts();
}

export function getBaseShellUnitCost() {
    const chocoPrice = parseFloat(document.getElementById('baseChocolatePriceInput')?.value) || 60.00;
    return chocoPrice / 80;
}

export function getBasePackagingUnitCost() {
    const packPrice = parseFloat(document.getElementById('basePackagingPriceInput')?.value) || 15.00;
    return packPrice / 100;
}

export function recalcBaseConfectioneryCosts() {
    const shellCost = getBaseShellUnitCost();
    const packCost = getBasePackagingUnitCost();
    const totalBase = shellCost + packCost;

    const baseEl = document.getElementById('baseUnitCostPreview');
    if (baseEl) {
        baseEl.innerText = `R$ ${formatMoney(totalBase)} (Casquinha R$ ${formatMoney(shellCost)} + Emb R$ ${formatMoney(packCost)})`;
    }
    renderFillingsTable();
}

export function renderFillingsTable(ingredients) {
    const tbody = document.getElementById('fillingsTableBody');
    if (!tbody) return;

    const list = ingredients || state.allIngredients;
    const fillings = list.filter(i => i.type === 'filling' || i.type === 'custom' || !i.type);

    if (fillings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px;">Nenhum recheio cadastrado.</td></tr>';
        return;
    }

    const shellUnitCost = getBaseShellUnitCost() + getBasePackagingUnitCost();

    tbody.innerHTML = fillings.map(f => {
        const yieldTrufas = f.yieldUnits || 50;
        const packagePrice = f.packagePrice || 0;
        const fillingUnitCost = yieldTrufas > 0 ? (packagePrice / yieldTrufas) : 0;
        const totalTrufaCost = fillingUnitCost + shellUnitCost;
        const sellPrice = f.sellingPrice || 4.00;
        const profit = sellPrice - totalTrufaCost;
        const margin = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(0) : 0;

        return `
            <tr>
                <td><strong>${f.name}</strong></td>
                <td>R$ ${formatMoney(packagePrice)} / ${f.packageWeight || '1kg'}</td>
                <td>${yieldTrufas} trufas</td>
                <td>R$ ${formatMoney(fillingUnitCost)}</td>
                <td><strong>R$ ${formatMoney(totalTrufaCost)}</strong></td>
                <td><strong style="color:var(--amber-gold);">R$ ${formatMoney(sellPrice)}</strong></td>
                <td><span style="color:#34d399; font-weight:600;">+R$ ${formatMoney(profit)} (${margin}%)</span></td>
                <td>
                    <button class="btn-action-sm btn-delete" onclick="deleteIngredient('${f.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

export function openAddFillingModal() {
    document.getElementById('fillingFormModal').classList.add('active');
    document.getElementById('fillingNameInput').value = '';
    document.getElementById('fillingPriceInput').value = '';
    document.getElementById('fillingWeightInput').value = '1kg (1000g)';
    document.getElementById('fillingYieldInput').value = '50';
    document.getElementById('fillingSellPriceInput').value = '4.00';
    calcFillingModalPreview();
}

export function closeFillingFormModal() {
    document.getElementById('fillingFormModal').classList.remove('active');
}

export function calcFillingModalPreview() {
    const price = parseFloat(document.getElementById('fillingPriceInput')?.value) || 0;
    const yieldTrufas = parseInt(document.getElementById('fillingYieldInput')?.value) || 50;
    const sellPrice = parseFloat(document.getElementById('fillingSellPriceInput')?.value) || 4.00;

    const fillingCostPerTrufa = yieldTrufas > 0 ? (price / yieldTrufas) : 0;
    const shellCost = getBaseShellUnitCost() + getBasePackagingUnitCost();
    const totalCost = fillingCostPerTrufa + shellCost;
    const profit = sellPrice - totalCost;
    const margin = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(0) : 0;

    const fillPreview = document.getElementById('modalFillingCostPreview');
    const totalPreview = document.getElementById('modalTotalCostPreview');
    const profitPreview = document.getElementById('modalProfitPreview');

    if (fillPreview) fillPreview.innerText = `R$ ${formatMoney(fillingCostPerTrufa)}`;
    if (totalPreview) totalPreview.innerText = `R$ ${formatMoney(totalCost)}`;
    if (profitPreview) profitPreview.innerText = `+R$ ${formatMoney(profit)} (${margin}%)`;
}

export async function saveFillingFromModal(e) {
    if (e) e.preventDefault();

    const name = document.getElementById('fillingNameInput').value.trim();
    const packagePrice = parseFloat(document.getElementById('fillingPriceInput').value) || 0;
    const packageWeight = document.getElementById('fillingWeightInput').value.trim() || '1kg';
    const yieldUnits = parseInt(document.getElementById('fillingYieldInput').value) || 50;
    const sellingPrice = parseFloat(document.getElementById('fillingSellPriceInput').value) || 4.00;

    if (!name || packagePrice <= 0) {
        Swal.fire({ icon: 'warning', title: 'Campos Obrigatórios', text: 'Informe o nome e o preço do pote de recheio.', background: '#150e0a', color: '#fff' });
        return;
    }

    const payload = {
        name,
        type: 'filling',
        packagePrice,
        packageWeight,
        yieldUnits,
        sellingPrice
    };

    try {
        const res = await fetch('/api/admin/ingredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            closeFillingFormModal();
            loadIngredientsList();
            Swal.fire({ icon: 'success', title: 'Recheio Cadastrado!', timer: 1200, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao salvar recheio:', e);
    }
}

export async function deleteIngredient(id) {
    const confirm = await Swal.fire({
        title: 'Excluir Recheio/Insumo?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Sim, excluir',
        background: '#150e0a',
        color: '#fff'
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`/api/admin/ingredients/${id}`, {
            method: 'DELETE',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadIngredientsList();
        }
    } catch (e) {
        console.error('Erro ao excluir insumo:', e);
    }
}

export async function syncCostsToProductsCatalog() {
    Swal.fire({
        title: 'Sincronizar Custos com Produtos?',
        text: 'Os custos calculados nesta ficha técnica atualizarão o catálogo de trufas automaticamente.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sincronizar',
        confirmButtonColor: '#10b981',
        cancelButtonText: 'Cancelar',
        background: '#150e0a',
        color: '#fff'
    }).then(async res => {
        if (res.isConfirmed) {
            loadAdminProducts();
            Swal.fire({ icon: 'success', title: 'Sincronizado!', timer: 1200, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    });
}

export async function loadRecipesList() {
    try {
        const res = await fetch(`/api/admin/recipes?_t=${Date.now()}`, {
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
            state.allRecipes = data;
            renderRecipesGrid(data);
        }
    } catch (e) {
        console.error('Erro ao carregar receitas:', e);
    }
}

export function renderRecipesGrid(recipes) {
    const grid = document.getElementById('recipesCardsGrid');
    if (!grid) return;

    if (!recipes || recipes.length === 0) {
        grid.innerHTML = '<p style="color:#94a3b8; grid-column:1/-1; text-align:center;">Nenhuma receita base cadastrada.</p>';
        return;
    }

    grid.innerHTML = recipes.map(r => `
        <div class="recipe-card">
            <h4>🍰 ${r.name}</h4>
            <p style="color:#cbd5e1; font-size:0.85rem; margin-top:4px;">Rendimento Padrão: <strong>${r.standardYield || 50} un.</strong></p>
            <div class="recipe-items-list" style="margin-top:8px; font-size:0.85rem; color:#94a3b8;">
                ${r.ingredients?.map(i => `<div>• ${i.name}: ${i.quantity}</div>`).join('') || ''}
            </div>
        </div>
    `).join('');
}

export function loadProductionShoppingList() {
    renderProductionShoppingList();
}

export function renderProductionShoppingList() {
    const container = document.getElementById('productionShoppingListContainer');
    if (!container) return;

    let totalTrufas = 0;
    state.allSchedules.forEach(s => {
        if (s.status !== 'cancelled') totalTrufas += (s.totalItems || 0);
    });

    if (totalTrufas === 0) {
        container.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem; text-align:center;">Nenhum ingrediente pendente para comprar no momento.</p>';
        return;
    }

    const barrasChoco = Math.ceil(totalTrufas / 40);
    const potesRecheio = Math.ceil(totalTrufas / 50);
    const embalagens = Math.ceil(totalTrufas / 100) * 100;

    container.innerHTML = `
        <div class="shopping-item">
            <span>🍫 Chocolate Barra Nobre (Cobertura Blend / Ao Leite):</span>
            <strong>${barrasChoco} kg (~ ${barrasChoco} barras)</strong>
        </div>
        <div class="shopping-item">
            <span>🍯 Recheios Diversos Gourmet (Potes de 1kg):</span>
            <strong>${potesRecheio} potes</strong>
        </div>
        <div class="shopping-item">
            <span>📦 Embalagens Chumbo / Alumínio + Adesivos:</span>
            <strong>${embalagens} un.</strong>
        </div>
    `;
}

export function copyShoppingListToWhatsApp() {
    let totalTrufas = 0;
    state.allSchedules.forEach(s => {
        if (s.status !== 'cancelled') totalTrufas += (s.totalItems || 0);
    });

    const barrasChoco = Math.ceil(totalTrufas / 40);
    const potesRecheio = Math.ceil(totalTrufas / 50);

    let text = `🛒 *LISTA DE COMPRAS - CONFEITARIA TRUFAS* 🛒\n\n`;
    text += `👉 *Meta de Produção:* ${totalTrufas} trufas\n\n`;
    text += `• ${barrasChoco}kg de Chocolate Barra para Casquinhas\n`;
    text += `• ${potesRecheio} Potes de Recheio de 1kg\n`;
    text += `• Embalagens e Adesivos\n\n`;
    text += `Comprar no atacado/confeitaria ✨`;

    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({ icon: 'success', title: 'Lista Copiada!', text: 'Cole no WhatsApp para fazer as compras.', timer: 1500, showConfirmButton: false, background: '#150e0a', color: '#fff' });
    });
}

export function openCustomBatchModal() {
    document.getElementById('customBatchModal').classList.add('active');
}

export function closeCustomBatchModal() {
    document.getElementById('customBatchModal').classList.remove('active');
}

export function submitCustomBatchCalculation() {
    const qty = parseInt(document.getElementById('customBatchQtyInput')?.value) || 100;
    const chocoNeeded = (qty * 0.025).toFixed(2);
    const fillingNeeded = (qty * 0.020).toFixed(2);

    const resBox = document.getElementById('customBatchResultBox');
    if (resBox) {
        resBox.innerHTML = `
            <div style="background:rgba(0,0,0,0.3); padding:12px; border-radius:8px; margin-top:10px;">
                <p>🍫 Chocolate para Casquinhas: <strong>${chocoNeeded} kg</strong></p>
                <p>🍯 Recheio Total: <strong>${fillingNeeded} kg</strong></p>
                <p>📦 Embalagens: <strong>${qty} unidades</strong></p>
            </div>
        `;
    }
}

export function openIngredientFormModal() {
    document.getElementById('ingredientFormModal')?.classList.add('active');
}

export function closeIngredientFormModal() {
    document.getElementById('ingredientFormModal')?.classList.remove('active');
}

export function updateIngredientUnitHint() {}
export function calcIngredientUnitCostPreview() {}
export function submitIngredientForm() {}
