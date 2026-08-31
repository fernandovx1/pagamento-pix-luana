// ==========================================
// VENDA PRESENCIAL / BALCÃO / A PRAZO
// ==========================================

import { state } from './state.js';
import { formatMoney, setQuickDueDate, setQuickDueDateNextDay, setQuickDueDayOfMonth, setQuickDueFifthBusinessDay, formatPhoneInput } from './utils.js';

export function openDirectOrderModal(flavor, price) {
    document.getElementById('directOrderFlavor').value = flavor || 'Tradicional';
    document.getElementById('directOrderUnitPrice').value = price !== undefined ? price : 4.00;
    document.getElementById('directOrderQty').value = 1;
    document.getElementById('directOrderCustomerName').value = '';
    document.getElementById('directOrderCustomerPhone').value = '';
    document.getElementById('directOrderNotes').value = '';

    recalcDirectOrderTotal();
    selectPaymentCondition('paid_now');

    document.getElementById('directOrderModal').classList.add('active');
    setTimeout(() => {
        const nameInput = document.getElementById('directOrderCustomerName');
        if (nameInput) nameInput.focus();
    }, 200);
}

export function closeDirectOrderModal() {
    document.getElementById('directOrderModal').classList.remove('active');
}

export function selectPaymentCondition(condition) {
    state.currentDirectPaymentCondition = condition;
    document.querySelectorAll('.condition-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.condition === condition);
    });

    const dueDateGroup = document.getElementById('directOrderDueDateGroup');
    if (dueDateGroup) {
        dueDateGroup.style.display = (condition === 'pay_later') ? 'block' : 'none';
        if (condition === 'pay_later') {
            setQuickDueFifthBusinessDay();
        }
    }
}

export function recalcDirectOrderTotal() {
    const qty = parseInt(document.getElementById('directOrderQty')?.value) || 1;
    const unitPrice = parseFloat(document.getElementById('directOrderUnitPrice')?.value) || 4.00;
    const total = qty * unitPrice;
    const totalEl = document.getElementById('directOrderTotalDisplay');
    if (totalEl) totalEl.innerText = `R$ ${formatMoney(total)}`;
}

export async function processDirectOrderSubmit() {
    const flavor = document.getElementById('directOrderFlavor').value;
    const qty = parseInt(document.getElementById('directOrderQty').value) || 1;
    const unitPrice = parseFloat(document.getElementById('directOrderUnitPrice').value) || 4.00;
    const total = qty * unitPrice;

    const customerName = document.getElementById('directOrderCustomerName').value.trim();
    const customerPhone = document.getElementById('directOrderCustomerPhone').value.trim();
    const notes = document.getElementById('directOrderNotes').value.trim();
    const dueDate = document.getElementById('directOrderDueDate')?.value || '';

    if (!customerName) {
        Swal.fire({ icon: 'warning', title: 'Nome Obrigatório', text: 'Informe o nome do cliente no balcão.', background: '#150e0a', color: '#fff' });
        document.getElementById('directOrderCustomerName').focus();
        return;
    }

    const payload = {
        flavor,
        quantity: qty,
        unitPrice,
        totalAmount: total,
        customerName,
        customerPhone,
        paymentCondition: state.currentDirectPaymentCondition,
        dueDate: state.currentDirectPaymentCondition === 'pay_later' ? dueDate : null,
        notes,
        sellerId: state.currentUser ? state.currentUser.id : 'user-fernando',
        sellerName: state.currentUser ? state.currentUser.name : 'Fernando'
    };

    try {
        const res = await fetch('/api/create-direct-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            closeDirectOrderModal();
            
            if (window.confetti) {
                window.confetti({ particleCount: 70, spread: 50, origin: { y: 0.7 } });
            }

            Swal.fire({
                icon: 'success',
                title: 'Venda Concluída! 🍫',
                text: state.currentDirectPaymentCondition === 'pay_later' ? 'Registrado no Caderno de Fiados com sucesso!' : 'Pagamento confirmado!',
                timer: 1500,
                showConfirmButton: false,
                background: '#150e0a',
                color: '#fff'
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao processar venda.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro na venda direta:', e);
    }
}

export function submitDirectCashOrder() {
    processDirectOrderSubmit();
}
