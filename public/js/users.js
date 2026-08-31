// ==========================================
// GESTÃO DE USUÁRIOS E VENDEDORES
// ==========================================

import { state, FALLBACK_USERS_LIST } from './state.js';

export async function loadUsersList() {
    try {
        const res = await fetch(`/api/auth/users-list?_t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            state.allUsers = data;
        } else {
            state.allUsers = FALLBACK_USERS_LIST;
        }
    } catch (e) {
        state.allUsers = FALLBACK_USERS_LIST;
    }
}

export async function loadAdminUsers() {
    try {
        const res = await fetch(`/api/admin/users?_t=${Date.now()}`, {
            headers: { 'authorization': state.adminToken }
        });
        const users = await res.json();
        const tbody = document.getElementById('adminUsersTableBody');
        if (!tbody) return;

        if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Nenhum usuário cadastrado.</td></tr>';
            return;
        }

        state.allUsers = users;

        tbody.innerHTML = users.map(u => `
            <tr>
                <td><span style="font-size:1.3rem;">${u.avatar || '👤'}</span> <strong>${u.name}</strong></td>
                <td><code>@${u.username}</code></td>
                <td><span class="seller-pill">${u.role === 'admin' ? 'Administrador' : 'Vendedor'}</span></td>
                <td>${u.biometricCredentials?.length > 0 ? '🟢 Ativa' : '⚪ Não cadastrada'}</td>
                <td>
                    <div style="display:flex; gap:6px; justify-content:flex-end;">
                        <button class="btn-action-sm btn-edit" onclick="openEditUserModal('${u.id}')" title="Editar">✏️</button>
                        <button class="btn-action-sm btn-delete" onclick="deleteUser('${u.id}')" title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Erro ao carregar usuários:', e);
    }
}

export function openCreateUserModal() {
    document.getElementById('userFormModal').classList.add('active');
    document.getElementById('userFormTitle').innerText = '👥 Novo Usuário / Vendedor';
    document.getElementById('userId').value = '';
    document.getElementById('userName').value = '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = 'seller';
    document.getElementById('userAvatar').value = '🍫';
}

export function openEditUserModal(userId) {
    const u = state.allUsers.find(user => user.id === userId);
    if (!u) return;

    document.getElementById('userFormModal').classList.add('active');
    document.getElementById('userFormTitle').innerText = `✏️ Editar ${u.name}`;
    document.getElementById('userId').value = u.id;
    document.getElementById('userName').value = u.name || '';
    document.getElementById('userUsername').value = u.username || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = u.role || 'seller';
    document.getElementById('userAvatar').value = u.avatar || '🍫';
}

export function closeCreateUserModal() {
    document.getElementById('userFormModal').classList.remove('active');
}

export async function submitUserForm(e) {
    if (e) e.preventDefault();

    const id = document.getElementById('userId').value.trim();
    const name = document.getElementById('userName').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    const role = document.getElementById('userRole').value;
    const avatar = document.getElementById('userAvatar').value.trim() || '🍫';

    if (!name || !username) {
        Swal.fire({ icon: 'warning', title: 'Campos Obrigatórios', text: 'Informe nome e usuário de login.', background: '#150e0a', color: '#fff' });
        return;
    }

    const payload = { name, username, role, avatar };
    if (password) payload.password = password;

    try {
        let res;
        if (id) {
            res = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'authorization': state.adminToken },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (data.success) {
            closeCreateUserModal();
            loadAdminUsers();
            Swal.fire({ icon: 'success', title: 'Usuário Salvo!', timer: 1200, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        } else {
            Swal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao salvar usuário.', background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao submeter usuário:', e);
    }
}

export async function deleteUser(userId) {
    const confirm = await Swal.fire({
        title: 'Excluir Usuário?',
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
        const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'authorization': state.adminToken }
        });
        const data = await res.json();
        if (data.success) {
            loadAdminUsers();
            Swal.fire({ icon: 'success', title: 'Excluído!', timer: 1000, showConfirmButton: false, background: '#150e0a', color: '#fff' });
        }
    } catch (e) {
        console.error('Erro ao excluir usuário:', e);
    }
}
