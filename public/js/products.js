// ==========================================
// PRODUTOS, CATÁLOGO, VITRINE E GESTÃO DE ESTOQUE
// ==========================================

import { state } from './state.js';
import { formatMoney } from './utils.js';

export async function loadProducts() {
    try {
        const res = await fetch(`/api/products?_t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
            state.allProducts = data;
            renderProductsGrid();
            
            // Atualiza opções nos seletores se existirem
            if (typeof updateTransferFlavorOptions === 'function') {
                updateTransferFlavorOptions();
            }
        }
    } catch (e) {
        console.error('Erro ao carregar produtos:', e);
    }
}

export function filterCategory(category) {
    state.currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    renderProductsGrid();
}

export function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderProductsGrid();
}

export function changeCardQty(prodId, delta) {
    const qtyEl = document.getElementById(`cardQty_${prodId}`);
    if (!qtyEl) return;
    let current = parseInt(qtyEl.innerText) || 1;
    current += delta;
    if (current < 1) current = 1;
    if (current > 99) current = 99;
    qtyEl.innerText = current;
}

export function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    let filtered = state.allProducts.filter(p => p.active !== false);

    // Filtro por Vendedor / Loja
    if (state.currentStoreSeller && state.currentStoreSeller !== 'all') {
        filtered = filtered.filter(p => p.sellerId === state.currentStoreSeller || !p.sellerId);
    }

    // Filtro por Categoria
    if (state.currentFilter !== 'all') {
        filtered = filtered.filter(p => (p.category || 'Gourmet') === state.currentFilter);
    }

    // Busca por Texto
    if (state.searchQuery) {
        filtered = filtered.filter(p => 
            p.flavor.toLowerCase().includes(state.searchQuery) || 
            (p.description && p.description.toLowerCase().includes(state.searchQuery))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Nenhuma trufa encontrada</h3>
                <p>Tente buscar por outro sabor ou selecione outra categoria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(prod => {
        const stock = prod.stock !== undefined ? prod.stock : 0;
        const isOutOfStock = stock <= 0;
        const isLowStock = stock > 0 && stock <= 5;
        const sellerBadge = prod.sellerName ? `<span class="seller-pill">${prod.sellerName}</span>` : '';

        return `
            <div class="truffle-card ${isOutOfStock ? 'out-of-stock' : ''}" id="card_${prod.id}">
                ${prod.category ? `<div class="card-badge">${prod.category}</div>` : ''}
                <div class="card-icon-wrapper">
                    <span class="card-icon">${prod.icon || '🍫'}</span>
                </div>
                
                <div class="card-content">
                    <div class="card-header-row">
                        <h3 class="card-title">Trufa de ${prod.flavor}</h3>
                        ${sellerBadge}
                    </div>
                    
                    <p class="card-description">${prod.description || 'Trufa artesanal gourmet recheada com ingredientes nobres e selecionados.'}</p>
                    
                    <div class="card-meta">
                        <span class="card-weight">⚖️ ${prod.weight || '45g'}</span>
                        <span class="stock-status ${isOutOfStock ? 'stock-out' : (isLowStock ? 'stock-low' : 'stock-ok')}">
                            ${isOutOfStock ? '🔴 Esgotado' : (isLowStock ? `🟡 Restam ${stock} un.` : `🟢 ${stock} em estoque`)}
                        </span>
                    </div>

                    <div class="card-footer">
                        <div class="card-price-box">
                            <span class="price-currency">R$</span>
                            <span class="price-value">${formatMoney(prod.price)}</span>
                        </div>

                        <div class="card-actions">
                            ${!isOutOfStock ? `
                                <div class="card-qty-control">
                                    <button class="qty-btn" onclick="changeCardQty('${prod.id}', -1)">-</button>
                                    <span class="card-qty-num" id="cardQty_${prod.id}">1</span>
                                    <button class="qty-btn" onclick="changeCardQty('${prod.id}', 1)">+</button>
                                </div>
                                <button class="btn-add-cart" onclick="addToCart('${prod.id}')" title="Adicionar ao Carrinho">
                                    🛒 Adicionar
                                </button>
                                <button class="btn-direct-order" onclick="openDirectOrderModal('${prod.flavor}', ${prod.price})" title="Venda no Balcão">
                                    ⚡ Balcão
                                </button>
                            ` : `
                                <button class="btn-out-of-stock" disabled>Indisponível</button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// -------------------------------------------------------------
// CRUD ADMIN DE PRODUTOS & AJUSTE RÁPIDO DE ESTOQUE
// -------------------------------------------------------------

export async function loadAdminProducts() {
    try {
        let url = `/api/admin/products?_t=${Date.now()}`;
        const select = document.getElementById('adminSellerSelect');
        const sellerId = select ? select.value : 'all';
        if (sellerId && sellerId !== 'all') {
            url += `&sellerId=${sellerId}`;
        }

        const res = await fetch(url, {
            headers: { 'authorization': state.adminToken }
        });
        const prods = await res.json();
        
        if (Array.isArray(prods)) {
            state.allProducts = prods;
            renderAdminProductsTable(prods);
            renderProductsGrid();
        }
    } catch (e) {
        console.error('Erro ao carregar produtos no admin:', e);
    }
}

export function renderAdminProductsTable(products) {
    const tbody = document.getElementById('adminProductsTableBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const cost = p.cost || 0;
        const price = p.price || 0;
        const profit = price - cost;
        const margin = price > 0 ? ((profit / price) * 100).toFixed(0) : 0;
        const stock = p.stock || 0;

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.3rem;">${p.icon || '🍫'}</span>
                        <strong>${p.flavor}</strong>
                    </div>
                </td>
                <td><span class="seller-pill">${p.sellerName || 'Todos'}</span></td>
                <td>R$ ${formatMoney(cost)}</td>
                <td><strong style="color: var(--amber-gold);">R$ ${formatMoney(price)}</strong></td>
                <td>
                    <span style="color: #34d399; font-weight: 600;">+R$ ${formatMoney(profit)} (${margin}%)</span>
                </td>
                <td>
                    <div class="admin-stock-control">
                        <button class="btn-stock-quick" onclick="quickStock('${p.id}', -1)">-</button>
                        <span class="admin-stock-num ${stock <= 0 ? 'text-danger' : (stock <= 5 ? 'text-warning' : '')}">${stock}</span>
                        <button class="btn-stock-quick" onclick="quickStock('${p.id}', 1)">+</button>
                        <button class="btn-stock-quick" onclick="quickStock('${p.id}', 5)" title="+5">+5</button>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn-action-sm btn-edit" onclick="editProduct('${p.id}')" title="Editar Produto">✏️</button>
                        <button class="btn-action-sm btn-transfer" onclick="openTransferStockModal('${p.id}')" title="Transferir Estoque">🔄</button>
                        <button class="btn-action-sm btn-delete" onclick="deleteProduct('${p.id}')" title="Excluir Produto">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

export async function quickStock(productId, delta) {
    try {
        const res = await fetch(`/api/admin/products/${productId}/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify({ delta })
        });
        const data = await res.json();
        if (data.success) {
            loadAdminProducts();
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao alterar estoque.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro no quickStock:', e);
    }
}

export function updateProductModalProfitPreview() {
    const cost = parseFloat(document.getElementById('productCost')?.value) || 0;
    const price = parseFloat(document.getElementById('productPrice')?.value) || 0;
    const profit = price - cost;
    const margin = price > 0 ? ((profit / price) * 100).toFixed(0) : 0;
    const el = document.getElementById('productProfitPreview');
    if (el) {
        el.innerText = `+R$ ${formatMoney(profit)} (Margem: ${margin}%)`;
    }
}

export function openProductForm() {
    document.getElementById('productFormModal').classList.add('active');
    document.getElementById('productFormTitle').innerText = '🍫 Cadastrar Nova Trufa';
    document.getElementById('productId').value = '';
    document.getElementById('productFlavor').value = '';
    document.getElementById('productPrice').value = '4.00';
    document.getElementById('productCost').value = '1.50';
    document.getElementById('productStock').value = '20';
    document.getElementById('productCategory').value = 'Gourmet';
    document.getElementById('productIcon').value = '🍫';
    document.getElementById('productWeight').value = '45g';
    document.getElementById('productDescription').value = '';

    // Preencher select de vendedor
    const sellerSelect = document.getElementById('productSellerId');
    if (sellerSelect) {
        const users = (Array.isArray(state.allUsers) && state.allUsers.length > 0) ? state.allUsers : FALLBACK_USERS_LIST;
        sellerSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        if (state.currentUser) sellerSelect.value = state.currentUser.id;
    }

    updateProductModalProfitPreview();
}

export function editProduct(prodId) {
    const prod = state.allProducts.find(p => p.id === prodId);
    if (!prod) return;

    document.getElementById('productFormModal').classList.add('active');
    document.getElementById('productFormTitle').innerText = `✏️ Editar Trufa de ${prod.flavor}`;
    document.getElementById('productId').value = prod.id;
    document.getElementById('productFlavor').value = prod.flavor || '';
    document.getElementById('productPrice').value = prod.price !== undefined ? prod.price : 4.00;
    document.getElementById('productCost').value = prod.cost !== undefined ? prod.cost : 1.50;
    document.getElementById('productStock').value = prod.stock !== undefined ? prod.stock : 0;
    document.getElementById('productCategory').value = prod.category || 'Gourmet';
    document.getElementById('productIcon').value = prod.icon || '🍫';
    document.getElementById('productWeight').value = prod.weight || '45g';
    document.getElementById('productDescription').value = prod.description || '';

    const sellerSelect = document.getElementById('productSellerId');
    if (sellerSelect) {
        const users = (Array.isArray(state.allUsers) && state.allUsers.length > 0) ? state.allUsers : FALLBACK_USERS_LIST;
        sellerSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        sellerSelect.value = prod.sellerId || (state.currentUser ? state.currentUser.id : 'user-fernando');
    }

    updateProductModalProfitPreview();
}

export function closeProductForm() {
    document.getElementById('productFormModal').classList.remove('active');
}

export async function saveProduct(e) {
    if (e) e.preventDefault();

    const id = document.getElementById('productId').value.trim();
    const flavor = document.getElementById('productFlavor').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const cost = parseFloat(document.getElementById('productCost').value) || 0;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const category = document.getElementById('productCategory').value;
    const icon = document.getElementById('productIcon').value.trim() || '🍫';
    const weight = document.getElementById('productWeight').value.trim() || '45g';
    const description = document.getElementById('productDescription').value.trim();
    const sellerSelect = document.getElementById('productSellerId');
    const sellerId = sellerSelect ? sellerSelect.value : (state.currentUser ? state.currentUser.id : 'user-fernando');
    const sellerName = sellerSelect?.options[sellerSelect.selectedIndex]?.text || (state.currentUser ? state.currentUser.name : 'Fernando');

    if (!flavor) {
        Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Informe o sabor da trufa.', background: '#150e0a', color: '#fff' });
        return;
    }

    const payload = {
        flavor, price, cost, stock, category, icon, weight, description, sellerId, sellerName
    };

    try {
        let res;
        if (id) {
            res = await fetch(`/api/admin/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (data.success) {
            closeProductForm();
            loadAdminProducts();
            Swal.fire({
                icon: 'success',
                title: id ? 'Trufa Atualizada!' : 'Trufa Cadastrada!',
                timer: 1200,
                showConfirmButton: false,
                background: '#150e0a',
                color: '#fff'
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao salvar produto.', background: '#150e0a', color: '#fff' });
        }
    } catch (err) {
        console.error('Erro ao salvar produto:', err);
    }
}

export async function deleteProduct(prodId) {
    const prod = state.allProducts.find(p => p.id === prodId);
    const confirm = await Swal.fire({
        title: `Excluir Trufa de ${prod?.flavor || ''}?`,
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
        const res = await fetch(`/api/admin/products/${prodId}`, {
            method: 'DELETE',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadAdminProducts();
            Swal.fire({ icon: 'success', title: 'Excluído!', timer: 1000, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao excluir produto:', e);
    }
}
