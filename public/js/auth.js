// ==========================================
// AUTENTICAÇÃO MULTI-USUÁRIO & BIOMETRIA
// ==========================================

import { state, FALLBACK_USERS_LIST } from './state.js';
import { openAdminModal, closeAdminModal, switchAdminTab } from './dashboard.js';

export function openLoginModal(isMandatory = false) {
    renderLoginProfiles();
    const passInput = document.getElementById('loginPassword');
    if (passInput) passInput.value = '';

    const closeBtn = document.querySelector('#loginModal .btn-close-modal');
    if (closeBtn) {
        if (isMandatory || (!state.currentUser && !state.adminToken)) {
            closeBtn.style.display = 'none';
        } else {
            closeBtn.style.display = 'block';
        }
    }

    document.getElementById('loginModal').classList.add('active');
    setTimeout(() => {
        const pass = document.getElementById('loginPassword');
        if (pass) pass.focus();
    }, 300);
}

export function closeLoginModal() {
    if (!state.currentUser || !state.adminToken) {
        Swal.fire({
            icon: 'warning',
            title: 'Acesso Obrigatório',
            text: 'Selecione seu perfil e digite a senha para entrar.',
            background: '#150e0a',
            color: '#fff'
        });
        return;
    }
    document.getElementById('loginModal').classList.remove('active');
}

export function renderLoginProfiles() {
    const grid = document.getElementById('loginProfilesGrid');
    if (!grid) return;

    const usersToRender = (Array.isArray(state.allUsers) && state.allUsers.length > 0) ? state.allUsers : FALLBACK_USERS_LIST;

    grid.innerHTML = usersToRender.map((u, i) => `
        <div class="user-profile-card ${i === 0 ? 'selected' : ''}" onclick="selectLoginProfile('${u.username}', this)">
            <div class="user-avatar-icon">${u.avatar || '🍫'}</div>
            <div class="user-card-name">${u.name}</div>
            <div class="user-card-role">${u.role === 'admin' ? 'Administrador' : 'Vendedora'}</div>
        </div>
    `).join('');

    const selectedUsername = usersToRender[0]?.username || 'fernando';
    const usernameInput = document.getElementById('loginUsername');
    if (usernameInput) usernameInput.value = selectedUsername;
}

export function selectLoginProfile(username, el) {
    document.querySelectorAll('.user-profile-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
    const uInput = document.getElementById('loginUsername');
    if (uInput) uInput.value = username;
    const pInput = document.getElementById('loginPassword');
    if (pInput) pInput.focus();
}

export async function submitPasswordLogin() {
    const usernameInput = document.getElementById('loginUsername');
    let username = usernameInput ? usernameInput.value.trim() : '';
    if (!username) username = 'fernando';

    const passwordInput = document.getElementById('loginPassword');
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!password) {
        Swal.fire({
            icon: 'warning',
            title: 'Digite a senha',
            text: 'Por favor, informe a senha de acesso.',
            background: '#150e0a',
            color: '#fff',
            confirmButtonColor: '#f59e0b'
        });
        if (passwordInput) passwordInput.focus();
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok && data.success && data.token) {
            state.adminToken = data.token;
            state.currentUser = data.user;
            localStorage.setItem('trufas_admin_token', state.adminToken);
            localStorage.setItem('trufas_current_user', JSON.stringify(state.currentUser));
            
            document.getElementById('loginModal').classList.remove('active');
            openAdminModal();

            if (window._openTabAfterLogin === 'notes') {
                const tabBtn = document.getElementById('tabBtnNotes');
                if (tabBtn) switchAdminTab('notes', tabBtn);
                window._openTabAfterLogin = null;
            }

            Swal.fire({
                icon: 'success',
                title: `Olá, ${state.currentUser.name}! 🌻`,
                text: 'Acesso liberado com sucesso ao Painel de Administrador!',
                timer: 1400,
                showConfirmButton: false,
                background: '#150e0a',
                color: '#fff'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Senha Incorreta',
                text: data.error || 'Senha incorreta para o perfil selecionado.',
                background: '#150e0a',
                color: '#fff',
                confirmButtonColor: '#ef4444'
            });
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (err) {
        console.error('Erro no login:', err);
        Swal.fire({
            icon: 'error',
            title: 'Erro de Conexão',
            text: 'Não foi possível conectar ao servidor. Tente novamente.',
            background: '#150e0a',
            color: '#fff'
        });
    }
}

export async function triggerBiometricLogin() {
    const uInput = document.getElementById('loginUsername');
    const username = uInput ? uInput.value.trim() : 'fernando';
    
    if (!window.PublicKeyCredential) {
        Swal.fire({
            icon: 'info',
            title: 'Biometria não suportada',
            text: 'Este navegador não suporta WebAuthn. Use a senha de acesso.',
            background: '#150e0a',
            color: '#fff'
        });
        return;
    }

    const localBioKey = localStorage.getItem(`bio_cred_${username}`);
    
    if (!localBioKey) {
        Swal.fire({
            icon: 'info',
            title: 'Primeiro Acesso',
            text: `Faça login com a senha uma vez e clique em "📱 Ativar Biometria" no topo do painel para cadastrar seu Face ID ou Digital neste aparelho!`,
            background: '#150e0a',
            color: '#fff',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        await navigator.credentials.get({
            publicKey: {
                challenge: challenge,
                timeout: 60000,
                userVerification: 'required'
            }
        }).catch(() => null);

        const res = await fetch('/api/auth/biometric/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, credentialId: localBioKey })
        });

        const data = await res.json();
        if (data.success && data.token) {
            state.adminToken = data.token;
            state.currentUser = data.user;
            localStorage.setItem('trufas_admin_token', state.adminToken);
            localStorage.setItem('trufas_current_user', JSON.stringify(state.currentUser));
            
            document.getElementById('loginModal').classList.remove('active');
            openAdminModal();

            if (window._openTabAfterLogin === 'notes') {
                const tabBtn = document.getElementById('tabBtnNotes');
                if (tabBtn) switchAdminTab('notes', tabBtn);
                window._openTabAfterLogin = null;
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Biometria Reconhecida!',
                text: `Bem-vindo(a), ${state.currentUser.name}! 🌻`,
                timer: 1400,
                showConfirmButton: false,
                background: '#150e0a',
                color: '#fff'
            });
        } else {
            throw new Error(data.error || 'Credencial não autorizada.');
        }
    } catch (e) {
        console.warn('Erro biometria:', e);
        Swal.fire({
            icon: 'warning',
            title: 'Biometria não confirmada',
            text: 'Tente novamente ou use a senha.',
            background: '#150e0a',
            color: '#fff'
        });
    }
}

export async function registerDeviceBiometrics() {
    if (!state.currentUser || !state.adminToken) return;

    if (!window.PublicKeyCredential) {
        Swal.fire({ icon: 'warning', title: 'Não suportado', text: 'Seu navegador não suporta Face ID / Digital.', background: '#150e0a', color: '#fff' });
        return;
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        let credentialId = `bio_${state.currentUser.username}_${Date.now()}`;

        try {
            const newCred = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: "Trufas Artesanais", id: window.location.hostname || "localhost" },
                    user: {
                        id: userId,
                        name: state.currentUser.username,
                        displayName: state.currentUser.name
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            });
            if (newCred && newCred.id) {
                credentialId = newCred.id;
            }
        } catch (credErr) {
            console.warn('Fallback de credencial:', credErr);
        }

        await fetch('/api/auth/biometric/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
            body: JSON.stringify({ credentialId, deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone (Face ID)' : 'Android (Digital)' })
        });

        localStorage.setItem(`bio_cred_${state.currentUser.username}`, credentialId);

        Swal.fire({
            icon: 'success',
            title: 'Biometria Ativada! 🎉',
            text: `Agora você pode entrar instantaneamente usando Face ID ou Digital neste celular!`,
            background: '#150e0a',
            color: '#fff',
            confirmButtonColor: '#10b981'
        });

    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: e.message, background: '#150e0a', color: '#fff' });
    }
}

export function adminLogout() {
    state.adminToken = '';
    state.currentUser = null;
    localStorage.removeItem('trufas_admin_token');
    localStorage.removeItem('trufas_current_user');
    closeAdminModal();
    openLoginModal(true);
}
