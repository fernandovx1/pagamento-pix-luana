// ==========================================
// PIX, QR CODE, COUNTDOWN & POLLING
// ==========================================

import { state } from './state.js';
import { playSaleNotificationSound } from './utils.js';

export function openCustomPixModal() {
    document.getElementById('customPixAmount').value = '';
    document.getElementById('customPixDescription').value = 'Trufas Gourmet';
    document.getElementById('customPixCustomerName').value = '';
    document.getElementById('customPixModal').classList.add('active');
}

export function closeCustomPixModal() {
    document.getElementById('customPixModal').classList.remove('active');
}

export async function submitCustomPixOrder() {
    const amount = parseFloat(document.getElementById('customPixAmount').value.replace(',', '.'));
    const description = document.getElementById('customPixDescription').value.trim() || 'Trufas Artesanais';
    const customerName = document.getElementById('customPixCustomerName').value.trim() || 'Cliente Balcão';

    if (!amount || amount <= 0) {
        Swal.fire({ icon: 'warning', title: 'Valor inválido', text: 'Informe um valor válido.', background: '#150e0a', color: '#fff' });
        return;
    }

    try {
        const res = await fetch('/api/create-custom-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, description, customerName })
        });
        const data = await res.json();
        if (data.success && data.payment) {
            closeCustomPixModal();
            showPixPaymentModal(data.payment);
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao gerar Pix.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao gerar Pix avulso:', e);
    }
}

export function showPixPaymentModal(paymentData) {
    const modal = document.getElementById('pixPaymentModal');
    if (!modal) return;

    state.currentPixKey = paymentData.qrCode || paymentData.qrCodeText || '';
    const img = document.getElementById('pixQrCodeImage');
    if (img && paymentData.qrCodeBase64) {
        img.src = `data:image/png;base64,${paymentData.qrCodeBase64}`;
    }

    const codeBox = document.getElementById('pixCopyPasteCode');
    if (codeBox) codeBox.value = state.currentPixKey;

    startPixCountdown(600); // 10 minutos
    startPaymentPolling(paymentData.id);

    modal.classList.add('active');
}

export function closePixModal() {
    if (state.pixCountdownInterval) clearInterval(state.pixCountdownInterval);
    if (state.pixStatusInterval) clearInterval(state.pixStatusInterval);
    document.getElementById('pixPaymentModal').classList.remove('active');
}

export function startPixCountdown(durationSeconds) {
    if (state.pixCountdownInterval) clearInterval(state.pixCountdownInterval);
    let timer = durationSeconds;
    const display = document.getElementById('pixCountdownTimer');

    state.pixCountdownInterval = setInterval(() => {
        const mins = parseInt(timer / 60, 10);
        const secs = parseInt(timer % 60, 10);
        if (display) {
            display.innerText = `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
        }

        if (--timer < 0) {
            clearInterval(state.pixCountdownInterval);
            if (display) display.innerText = 'Expirado';
        }
    }, 1000);
}

export function startPaymentPolling(paymentId) {
    if (state.pixStatusInterval) clearInterval(state.pixStatusInterval);
    if (!paymentId) return;

    state.pixStatusInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/check-payment/${paymentId}`);
            const data = await res.json();
            if (data.status === 'approved') {
                clearInterval(state.pixStatusInterval);
                closePixModal();
                playSaleNotificationSound();

                if (window.confetti) {
                    window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Pagamento Pix Aprovado! 🎉',
                    text: 'Obrigado pela preferência! Seu pedido está confirmado.',
                    background: '#150e0a',
                    color: '#fff',
                    confirmButtonColor: '#10b981'
                });
            }
        } catch (e) {
            console.error('Polling status Pix error:', e);
        }
    }, 3000);
}

export function copyPixCode(btn) {
    const input = document.getElementById('pixCopyPasteCode');
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
        const originalText = btn.innerText;
        btn.innerText = '✅ Código Pix Copiado!';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = '';
        }, 3000);
    });
}
