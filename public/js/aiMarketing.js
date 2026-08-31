// ==========================================
// IA CRIADORA DE SABORES & MARKETING DE ANÚNCIOS
// ==========================================

import { state } from './state.js';
import { loadAdminProducts } from './products.js';

export function setAiPromptText(text) {
    const input = document.getElementById('aiPromptInput');
    if (input) {
        input.value = text;
        input.focus();
    }
}

export async function generateAiFlavorAndAds() {
    const input = document.getElementById('aiPromptInput');
    const prompt = input ? input.value.trim() : '';

    if (!prompt) {
        Swal.fire({ icon: 'warning', title: 'Digite uma ideia', text: 'Informe ingredientes ou inspirações para a IA.', background: '#150e0a', color: '#fff' });
        return;
    }

    try {
        Swal.fire({
            title: 'Criando com Inteligência Artificial...',
            text: 'Gerando receita gourmet, cálculos de custo e copy para WhatsApp.',
            allowOutsideClick: false,
            background: '#150e0a',
            color: '#fff',
            didOpen: () => Swal.showLoading()
        });

        const res = await fetch('/api/admin/ai-generate-flavor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify({ prompt })
        });

        const data = await res.json();
        Swal.close();

        if (data.success && data.result) {
            state.lastGeneratedAiProduct = data.result;
            renderAiResultBox(data.result);
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao gerar sabor com IA.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro na IA:', e);
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível comunicar com o serviço de IA.', background: '#150e0a', color: '#fff' });
    }
}

export function renderAiResultBox(res) {
    const box = document.getElementById('aiGeneratedResultBox');
    if (!box) return;

    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth' });

    const titleEl = document.getElementById('aiGeneratedFlavorTitle');
    const descEl = document.getElementById('aiGeneratedDescription');
    const priceEl = document.getElementById('aiGeneratedPrice');
    const costEl = document.getElementById('aiGeneratedCost');
    const adTextEl = document.getElementById('aiWhatsappAdText');

    if (titleEl) titleEl.innerText = `${res.icon || '🍫'} Trufa de ${res.flavor}`;
    if (descEl) descEl.innerText = res.description;
    if (priceEl) priceEl.innerText = `R$ ${(res.price || 4.00).toFixed(2)}`;
    if (costEl) costEl.innerText = `R$ ${(res.cost || 1.50).toFixed(2)}`;
    if (adTextEl) adTextEl.value = res.whatsappAd || '';
}

export async function addAiGeneratedProductToCatalog() {
    if (!state.lastGeneratedAiProduct) return;
    const p = state.lastGeneratedAiProduct;

    const payload = {
        flavor: p.flavor,
        price: p.price || 4.00,
        cost: p.cost || 1.50,
        stock: 20,
        category: p.category || 'Gourmet',
        icon: p.icon || '🍫',
        weight: '45g',
        description: p.description || '',
        sellerId: state.currentUser?.id || 'user-fernando',
        sellerName: state.currentUser?.name || 'Fernando'
    };

    try {
        const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            loadAdminProducts();
            Swal.fire({
                icon: 'success',
                title: 'Adicionado ao Catálogo! 🎉',
                text: `A Trufa de ${p.flavor} já está visível para os clientes!`,
                background: '#150e0a',
                color: '#fff',
                confirmButtonColor: '#10b981'
            });
        }
    } catch (e) {
        console.error('Erro ao adicionar produto da IA:', e);
    }
}

export function copyAiWhatsappAd() {
    const text = document.getElementById('aiWhatsappAdText')?.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({ icon: 'success', title: 'Anúncio Copiado! 📱', text: 'Cole no WhatsApp ou Stories do Instagram.', timer: 1500, showConfirmButton: false, background: '#150e0a', color: '#fff' });
    });
}

export function shareAiAdOnWhatsapp() {
    const text = document.getElementById('aiWhatsappAdText')?.value;
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
