// ==========================================
// CARRINHO DE COMPRAS & CHECKOUT
// ==========================================

import { state } from './state.js';
import { formatMoney, getUpcomingFridays } from './utils.js';
import { showPixPaymentModal } from './pix.js';

export function addToCart(prodId) {
    const prod = state.allProducts.find(p => p.id === prodId);
    if (!prod) return;

    const qtyEl = document.getElementById(`cardQty_${prodId}`);
    const qty = qtyEl ? (parseInt(qtyEl.innerText) || 1) : 1;

    if (!state.cart[prodId]) {
        state.cart[prodId] = {
            product: prod,
            quantity: 0
        };
    }

    state.cart[prodId].quantity += qty;
    updateCartDisplay();

    // Reset card qty to 1
    if (qtyEl) qtyEl.innerText = '1';

    // Micro feedback visual
    const floatBtn = document.getElementById('floatingCartBtn');
    if (floatBtn) {
        floatBtn.classList.add('pulse-glow');
        setTimeout(() => floatBtn.classList.remove('pulse-glow'), 500);
    }
}

export function updateCartQty(prodId, delta) {
    if (!state.cart[prodId]) return;
    state.cart[prodId].quantity += delta;
    if (state.cart[prodId].quantity <= 0) {
        delete state.cart[prodId];
    }
    updateCartDisplay();
    renderCartModalItems();
}

export function removeFromCart(prodId) {
    if (state.cart[prodId]) {
        delete state.cart[prodId];
        updateCartDisplay();
        renderCartModalItems();
    }
}

export function calculateCartTotal() {
    let total = 0;
    let itemsCount = 0;
    Object.values(state.cart).forEach(item => {
        total += (item.product.price || 0) * item.quantity;
        itemsCount += item.quantity;
    });
    return { total, itemsCount };
}

export function updateCartDisplay() {
    const { total, itemsCount } = calculateCartTotal();
    const countBadge = document.getElementById('floatingCartCount');
    const floatBtn = document.getElementById('floatingCartBtn');

    if (countBadge) {
        countBadge.innerText = itemsCount;
    }

    if (floatBtn) {
        if (itemsCount > 0) {
            floatBtn.style.display = 'flex';
        } else {
            floatBtn.style.display = 'none';
        }
    }
}

export function openCartModal() {
    renderCartModalItems();
    initCartFridayPicker();
    initCartPaymentMethods();
    document.getElementById('cartModal').classList.add('active');
}

export function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
}

export function clearCartPrompt() {
    Swal.fire({
        title: 'Limpar carrinho?',
        text: 'Todos os itens selecionados serão removidos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Sim, limpar',
        cancelButtonText: 'Cancelar',
        background: '#150e0a',
        color: '#fff'
    }).then(res => {
        if (res.isConfirmed) {
            state.cart = {};
            updateCartDisplay();
            renderCartModalItems();
            closeCartModal();
        }
    });
}

export function renderCartModalItems() {
    const container = document.getElementById('cartModalItemsList');
    if (!container) return;

    const items = Object.values(state.cart);
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px 10px;">
                <div class="empty-icon">🛒</div>
                <h4 style="color: #cbd5e1; margin-bottom: 6px;">Seu carrinho está vazio</h4>
                <p style="color: #94a3b8; font-size: 0.9rem;">Escolha seus sabores favoritos de trufa na vitrine!</p>
            </div>
        `;
        const submitBtn = document.getElementById('cartSubmitBtn');
        if (submitBtn) submitBtn.disabled = true;
        const totalEl = document.getElementById('cartModalTotalValue');
        if (totalEl) totalEl.innerText = 'R$ 0,00';
        return;
    }

    const { total } = calculateCartTotal();
    const totalEl = document.getElementById('cartModalTotalValue');
    if (totalEl) totalEl.innerText = `R$ ${formatMoney(total)}`;

    const submitBtn = document.getElementById('cartSubmitBtn');
    if (submitBtn) submitBtn.disabled = false;

    container.innerHTML = items.map(item => {
        const p = item.product;
        const subtotal = (p.price || 0) * item.quantity;

        return `
            <div class="cart-item-row">
                <div class="cart-item-info">
                    <span class="cart-item-icon">${p.icon || '🍫'}</span>
                    <div>
                        <div class="cart-item-name">${p.flavor}</div>
                        <div class="cart-item-unit-price">R$ ${formatMoney(p.price)} un.</div>
                    </div>
                </div>
                
                <div class="cart-item-actions">
                    <div class="cart-qty-control">
                        <button class="cart-qty-btn" onclick="updateCartQty('${p.id}', -1)">-</button>
                        <span class="cart-qty-val">${item.quantity}</span>
                        <button class="cart-qty-btn" onclick="updateCartQty('${p.id}', 1)">+</button>
                    </div>
                    <span class="cart-item-subtotal">R$ ${formatMoney(subtotal)}</span>
                    <button class="btn-remove-item" onclick="removeFromCart('${p.id}')" title="Remover">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

export function initCartFridayPicker() {
    const fridays = getUpcomingFridays();
    const container = document.getElementById('cartFridayChips');
    if (!container) return;

    if (!state.selectedCartFriday) {
        state.selectedCartFriday = fridays[0]?.iso;
    }

    container.innerHTML = fridays.map((f, i) => `
        <div class="friday-chip ${state.selectedCartFriday === f.iso ? 'selected' : ''}" onclick="selectCartFriday('${f.iso}', this)">
            <span class="friday-badge">${f.badge}</span>
            <span class="friday-date">${f.label}</span>
        </div>
    `).join('');
}

export function selectCartFriday(iso, el) {
    state.selectedCartFriday = iso;
    document.querySelectorAll('#cartFridayChips .friday-chip').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
}

export function setCartDeliveryType(type) {
    state.selectedCartDeliveryType = type;
    document.querySelectorAll('.delivery-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const addrBox = document.getElementById('cartDeliveryAddressBox');
    if (addrBox) {
        addrBox.style.display = (type === 'Entrega') ? 'block' : 'none';
    }
}

export function initCartPaymentMethods() {
    const radios = document.querySelectorAll('input[name="cartPaymentMethod"]');
    radios.forEach(r => {
        r.addEventListener('change', () => handleCartPaymentMethodChange(r.value));
    });
}

export function handleCartPaymentMethodChange(method) {
    const pixNotice = document.getElementById('cartPixNotice');
    const cashNotice = document.getElementById('cartCashNotice');
    if (pixNotice) pixNotice.style.display = (method === 'pix') ? 'block' : 'none';
    if (cashNotice) cashNotice.style.display = (method === 'cash') ? 'block' : 'none';
}

export async function submitCartOrder() {
    const { total, itemsCount } = calculateCartTotal();
    if (itemsCount === 0) return;

    const nameInput = document.getElementById('cartCustomerName');
    const phoneInput = document.getElementById('cartCustomerPhone');
    const notesInput = document.getElementById('cartCustomerNotes');
    const addressInput = document.getElementById('cartDeliveryAddress');

    const customerName = nameInput ? nameInput.value.trim() : '';
    const customerPhone = phoneInput ? phoneInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';

    if (!customerName) {
        Swal.fire({ icon: 'warning', title: 'Nome obrigatório', text: 'Por favor, informe seu nome.', background: '#150e0a', color: '#fff' });
        if (nameInput) nameInput.focus();
        return;
    }

    if (!customerPhone) {
        Swal.fire({ icon: 'warning', title: 'WhatsApp obrigatório', text: 'Informe seu WhatsApp para combinarmos a entrega.', background: '#150e0a', color: '#fff' });
        if (phoneInput) phoneInput.focus();
        return;
    }

    const items = Object.values(state.cart).map(item => ({
        id: item.product.id,
        flavor: item.product.flavor,
        unitPrice: item.product.price,
        quantity: item.quantity,
        sellerId: item.product.sellerId,
        sellerName: item.product.sellerName
    }));

    const methodRadio = document.querySelector('input[name="cartPaymentMethod"]:checked');
    const paymentMethod = methodRadio ? methodRadio.value : 'pix';

    const orderPayload = {
        customerName,
        customerPhone,
        items,
        totalAmount: total,
        totalItems: itemsCount,
        deliveryType: state.selectedCartDeliveryType,
        deliveryAddress: state.selectedCartDeliveryType === 'Entrega' ? address : '',
        scheduleDate: state.selectedCartFriday,
        notes,
        paymentMethod
    };

    try {
        Swal.fire({
            title: 'Processando pedido...',
            text: 'Aguarde um instante.',
            allowOutsideClick: false,
            background: '#150e0a',
            color: '#fff',
            didOpen: () => Swal.showLoading()
        });

        if (paymentMethod === 'pix') {
            const res = await fetch('/api/create-pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            const data = await res.json();
            Swal.close();

            if (data.success && data.payment) {
                closeCartModal();
                state.cart = {};
                updateCartDisplay();
                showPixPaymentModal(data.payment);
            } else {
                Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao gerar Pix.', background: '#150e0a', color: '#fff' });
            }
        } else {
            // Dinheiro / Na Entrega
            const res = await fetch('/api/create-direct-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            const data = await res.json();
            Swal.close();

            if (data.success) {
                closeCartModal();
                state.cart = {};
                updateCartDisplay();
                
                if (window.confetti) {
                    window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Pedido Confirmado! 🎉',
                    text: 'Seu pedido foi registrado com sucesso. Entraremos em contato via WhatsApp!',
                    background: '#150e0a',
                    color: '#fff',
                    confirmButtonColor: '#10b981'
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao registrar pedido.', background: '#150e0a', color: '#fff' });
            }
        }
    } catch (e) {
        console.error('Erro ao submeter pedido do carrinho:', e);
        Swal.fire({ icon: 'error', title: 'Erro de Conexão', text: 'Não foi possível enviar o pedido.', background: '#150e0a', color: '#fff' });
    }
}

export function submitPixOrder() {
    submitCartOrder();
}
