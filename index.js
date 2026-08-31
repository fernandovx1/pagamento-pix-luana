const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MercadoPagoConfig, Payment } = require('mercadopago');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Constantes e Paths do Banco de Dados JSON
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const TRANSFERS_FILE = path.join(DATA_DIR, 'transfers.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const INGREDIENTS_FILE = path.join(DATA_DIR, 'ingredients.json');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');

// Garantir diretório e arquivos de dados
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers de Banco de Dados JSON
function getIngredients() {
    try {
        if (!fs.existsSync(INGREDIENTS_FILE)) return [];
        const raw = fs.readFileSync(INGREDIENTS_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler ingredients.json:', e);
        return [];
    }
}

function saveIngredients(ingredients) {
    try {
        fs.writeFileSync(INGREDIENTS_FILE, JSON.stringify(ingredients, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar ingredients.json:', e);
        return false;
    }
}

function getRecipes() {
    try {
        if (!fs.existsSync(RECIPES_FILE)) return [];
        const raw = fs.readFileSync(RECIPES_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler recipes.json:', e);
        return [];
    }
}

function saveRecipes(recipes) {
    try {
        fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar recipes.json:', e);
        return false;
    }
}

function getSchedules() {
    try {
        if (!fs.existsSync(SCHEDULES_FILE)) return [];
        const raw = fs.readFileSync(SCHEDULES_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler schedules.json:', e);
        return [];
    }
}

function saveSchedules(schedules) {
    try {
        fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar schedules.json:', e);
        return false;
    }
}

function getNotes() {
    try {
        if (!fs.existsSync(NOTES_FILE)) return [];
        const raw = fs.readFileSync(NOTES_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler notes.json:', e);
        return [];
    }
}

function saveNotes(notes) {
    try {
        fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar notes.json:', e);
        return false;
    }
}
function getUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler users.json:', e);
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar users.json:', e);
        return false;
    }
}

const PRODUCTS_BACKUP_FILE = path.join(DATA_DIR, 'products_backup.json');

function getDefaultProductsList() {
    return [
        {
            id: "trufa-nutella",
            sellerId: "user-fernando",
            sellerName: "Fernando",
            flavor: "Nutella",
            price: 4.00,
            cost: 1.50,
            weight: "45g",
            size: "Médio",
            stock: 20,
            category: "Gourmet",
            description: "Deliciosa trufa artesanal recheada com Nutella cremosa e nobre.",
            icon: "🍫",
            active: true
        },
        {
            id: "trufa-ninho",
            sellerId: "user-fernando",
            sellerName: "Fernando",
            flavor: "Ninho",
            price: 4.00,
            cost: 1.50,
            weight: "45g",
            size: "Médio",
            stock: 20,
            category: "Gourmet",
            description: "Trufa artesanal com recheio cremoso e aveludado de Leite Ninho.",
            icon: "🍫",
            active: true
        },
        {
            id: "trufa-doce-leite",
            sellerId: "user-fernando",
            sellerName: "Fernando",
            flavor: "Doce de leite",
            price: 4.00,
            cost: 1.50,
            weight: "45g",
            size: "Médio",
            stock: 20,
            category: "Gourmet",
            description: "Deliciosa trufa artesanal recheada com doce de leite artesanal nobre.",
            icon: "🍯",
            active: true
        },
        {
            id: "trufa-kit-kat",
            sellerId: "user-fernando",
            sellerName: "Fernando",
            flavor: "Kit Kat",
            price: 4.00,
            cost: 1.50,
            weight: "45g",
            size: "Médio",
            stock: 20,
            category: "Gourmet",
            description: "Deliciosa trufa artesanal recheada com pedaços crocantes de Kit Kat.",
            icon: "🍫",
            active: true
        },
        {
            id: "trufa-morango",
            sellerId: "user-fernando",
            sellerName: "Fernando",
            flavor: "Morango",
            price: 4.00,
            cost: 1.50,
            weight: "45g",
            size: "Médio",
            stock: 20,
            category: "Frutas",
            description: "Deliciosa trufa artesanal recheada com morango e chocolate nobre.",
            icon: "🍓",
            active: true
        },
        {
            id: "trufa-ovomaltine",
            sellerId: "user-fernando",
            sellerName: "Fernando",
            flavor: "OvoMaltine",
            price: 4.00,
            cost: 1.50,
            weight: "45g",
            size: "Médio",
            stock: 20,
            category: "Gourmet",
            description: "Deliciosa trufa artesanal recheada com Ovomaltine crocante.",
            icon: "🍫",
            active: true
        }
    ];
}

function getProducts() {
    try {
        if (!fs.existsSync(PRODUCTS_FILE)) {
            if (fs.existsSync(PRODUCTS_BACKUP_FILE)) {
                const backup = fs.readFileSync(PRODUCTS_BACKUP_FILE, 'utf-8');
                const parsed = JSON.parse(backup || '[]');
                if (Array.isArray(parsed) && parsed.length > 0) {
                    fs.writeFileSync(PRODUCTS_FILE, backup, 'utf-8');
                    return parsed;
                }
            }
            const defaults = getDefaultProductsList();
            saveProducts(defaults);
            return defaults;
        }
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
        // Se estiver vazio, restaura do backup ou dados padrão
        if (fs.existsSync(PRODUCTS_BACKUP_FILE)) {
            const backup = fs.readFileSync(PRODUCTS_BACKUP_FILE, 'utf-8');
            const parsedBackup = JSON.parse(backup || '[]');
            if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
                fs.writeFileSync(PRODUCTS_FILE, backup, 'utf-8');
                return parsedBackup;
            }
        }
        const defaults = getDefaultProductsList();
        saveProducts(defaults);
        return defaults;
    } catch (e) {
        console.error('Erro ao ler products.json:', e);
        return getDefaultProductsList();
    }
}

function saveProducts(products) {
    try {
        const jsonStr = JSON.stringify(products, null, 2);
        fs.writeFileSync(PRODUCTS_FILE, jsonStr, 'utf-8');
        if (Array.isArray(products) && products.length > 0) {
            fs.writeFileSync(PRODUCTS_BACKUP_FILE, jsonStr, 'utf-8');
        }
        return true;
    } catch (e) {
        console.error('Erro ao salvar products.json:', e);
        return false;
    }
}

function getOrders() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) return [];
        const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler orders.json:', e);
        return [];
    }
}

function saveOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar orders.json:', e);
        return false;
    }
}

function getTransfers() {
    try {
        if (!fs.existsSync(TRANSFERS_FILE)) return [];
        const raw = fs.readFileSync(TRANSFERS_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler transfers.json:', e);
        return [];
    }
}

function saveTransfers(transfers) {
    try {
        fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(transfers, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar transfers.json:', e);
        return false;
    }
}

// Inicialização Automática de Dados Padrão (Garante que nunca fique vazio no cloud)
function initDefaultData() {
    // 1. Usuários Padrão
    const users = getUsers();
    if (!users || users.length === 0) {
        const defaultUsers = [
            {
                id: "user-fernando",
                name: "Fernando",
                username: "fernando",
                password: "romeuejulieta",
                role: "admin",
                avatar: "👑",
                biometricCredentials: [],
                createdAt: new Date().toISOString()
            },
            {
                id: "user-luana",
                name: "Luana",
                username: "luana",
                password: "luana123",
                role: "seller",
                avatar: "🍫",
                biometricCredentials: [],
                createdAt: new Date().toISOString()
            }
        ];
        saveUsers(defaultUsers);
        console.log('[INIT] Usuários padrão (Fernando e Luana) criados automaticamente.');
    }

    // 2. Garantir catálogo permanente de trufas (nunca perde produtos ao atualizar ou reiniciar)
    const prods = getProducts();
    if (!prods || prods.length === 0) {
        const defaults = getDefaultProductsList();
        saveProducts(defaults);
        console.log('[INIT] Catálogo permanente de trufas inicializado com sucesso.');
    }
}
initDefaultData();

// Configuração Mercado Pago
let paymentClient = null;
if (process.env.MP_ACCESS_TOKEN) {
    try {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        paymentClient = new Payment(client);
    } catch (err) {
        console.warn('[MP] Erro ao inicializar SDK do Mercado Pago:', err.message);
    }
}

// Configuração Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Middleware Anti-Cache Global Rigoroso (Força o navegador e celular a baixar a versão mais recente sempre)
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// ==========================================
// 🌐 ROTAS DE PÁGINAS SEPARADAS (CLIENTES vs GESTORES)
// ==========================================

// 1. Rota Principal e Vitrine dos Clientes (Design Oficial dos Clientes)
app.get(['/', '/cardapio', '/loja', '/cliente', '/pedir', '/encomendas', '/pedidos.html'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'pedidos.html'));
});

// 2. Painel Administrativo / Vendedor / Gestão
app.get(['/admin', '/login', '/painel', '/gestao', '/adm', '/index.html'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public', {
    index: false,
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Rota de versão para garantir sincronização
app.get('/api/version', (req, res) => {
    res.json({ version: '2026.08.31-v3.4-fridays-delivery', time: Date.now() });
});

// Gerenciamento de Sessão / Tokens
const activeSessions = new Map(); // token -> userObject

function generateUserToken(user) {
    const token = `tok_${user.id}_${crypto.randomBytes(16).toString('hex')}`;
    const sessionData = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role || 'seller',
        avatar: user.avatar || '🍫',
        createdAt: Date.now()
    };
    activeSessions.set(token, sessionData);
    return token;
}

// Middleware de Autenticação Robusto (Sobrevive a reinicializações de servidor no cloud)
function authenticateUser(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
    
    // Suporte ao token legado mestre
    if (authHeader === 'token_trufas_secret_admin_2026') {
        req.user = { id: 'user-fernando', name: 'Fernando', username: 'fernando', role: 'admin', avatar: '👑' };
        return next();
    }

    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
    if (!token) {
        return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    }

    // 1. Verificar em memória
    if (activeSessions.has(token)) {
        req.user = activeSessions.get(token);
        return next();
    }

    // 2. Se o servidor reiniciou (Square Cloud / Hospedagem), validar token tok_<userId>_<random>
    if (token.startsWith('tok_')) {
        const parts = token.split('_');
        const userId = parts[1];
        const users = getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            const sessionData = {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role || 'seller',
                avatar: user.avatar || '🍫',
                createdAt: Date.now()
            };
            activeSessions.set(token, sessionData);
            req.user = sessionData;
            return next();
        }
    }

    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
}

function requireAdmin(req, res, next) {
    authenticateUser(req, res, () => {
        if (req.user.role === 'admin') {
            return next();
        }
        return res.status(403).json({ error: 'Acesso restrito ao administrador mestre.' });
    });
}

// Função de Baixa de Estoque Atômica
function deductStockForOrder(order) {
    if (order.stockDeducted) return true;

    const products = getProducts();
    let updated = false;

    for (const item of order.items) {
        const product = products.find(p => p.id === item.productId || p.flavor === item.flavor);
        if (product) {
            const qty = Number(item.quantity) || 1;
            product.stock = Math.max(0, (Number(product.stock) || 0) - qty);
            updated = true;
            console.log(`[ESTOQUE] Baixa: "${product.flavor}" (${product.sellerName || 'Geral'}) -${qty} un. (Estoque restante: ${product.stock})`);
        }
    }

    if (updated) {
        saveProducts(products);
    }

    order.stockDeducted = true;
    return true;
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO & BIOMETRIA (WEBAUTHN)
// ==========================================

// Lista pública de vendedores para o seletor de perfil
app.get('/api/auth/users-list', (req, res) => {
    const users = getUsers();
    const publicList = users.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        avatar: u.avatar || '🍫',
        hasBiometrics: Array.isArray(u.biometricCredentials) && u.biometricCredentials.length > 0
    }));
    res.json(publicList);
});

// Login com Usuário e Senha
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();

    // Suporte à senha mestra "romeuejulieta"
    if (password === 'romeuejulieta' && (!username || username === 'fernando' || username === 'admin')) {
        const adminUser = users.find(u => u.role === 'admin') || users[0];
        const token = generateUserToken(adminUser);
        return res.json({
            success: true,
            token,
            user: { id: adminUser.id, name: adminUser.name, username: adminUser.username, role: adminUser.role, avatar: adminUser.avatar }
        });
    }

    const user = users.find(u => u.username.toLowerCase() === (username || '').trim().toLowerCase());
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: 'Usuário ou senha incorretos.' });
    }

    const token = generateUserToken(user);
    res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, username: user.username, role: user.role, avatar: user.avatar }
    });
});

// Verificar Sessão Ativa / Validação de Token no Admin
app.get('/api/auth/me', authenticateUser, (req, res) => {
    res.json({ success: true, user: req.user });
});

// Rota de Compatibilidade do Admin Antigo
app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    const users = getUsers();
    const adminUser = users.find(u => u.role === 'admin') || users[0];

    if (password === 'romeuejulieta' || (adminUser && password === adminUser.password)) {
        const token = generateUserToken(adminUser);
        return res.json({
            success: true,
            token,
            user: { id: adminUser.id, name: adminUser.name, username: adminUser.username, role: adminUser.role, avatar: adminUser.avatar },
            message: 'Acesso concedido.'
        });
    }
    return res.status(401).json({ success: false, error: 'Senha incorreta.' });
});

// Registrar Biometria (Face ID / Digital) para o Usuário Logado
app.post('/api/auth/biometric/register', authenticateUser, (req, res) => {
    const { credentialId, publicKey, deviceName } = req.body;
    if (!credentialId) {
        return res.status(400).json({ error: 'Identificador biométrico inválido.' });
    }

    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!Array.isArray(user.biometricCredentials)) {
        user.biometricCredentials = [];
    }

    user.biometricCredentials.push({
        id: credentialId,
        publicKey: publicKey || '',
        deviceName: deviceName || 'Celular',
        registeredAt: new Date().toISOString()
    });

    saveUsers(users);
    console.log(`[BIOMETRIA] Face ID / Digital registrado para ${user.name} (${user.username})`);
    res.json({ success: true, message: 'Biometria registrada com sucesso neste aparelho!' });
});

// Login via Biometria
app.post('/api/auth/biometric/login', (req, res) => {
    const { username, credentialId } = req.body;
    const users = getUsers();

    let user = null;
    if (username) {
        user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    } else if (credentialId) {
        user = users.find(u => u.biometricCredentials?.some(c => c.id === credentialId));
    }

    if (!user) {
        return res.status(401).json({ error: 'Credencial biométrica não reconhecida.' });
    }

    const token = generateUserToken(user);
    console.log(`[BIOMETRIA] Login por Face ID / Digital aprovado para ${user.name}`);
    res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, username: user.username, role: user.role, avatar: user.avatar }
    });
});

// ==========================================
// GESTÃO DE USUÁRIOS (ADMIN MESTRE)
// ==========================================

// Listar todos os usuários/vendedores
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = getUsers().map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        avatar: u.avatar || '🍫',
        biometricsCount: u.biometricCredentials?.length || 0,
        createdAt: u.createdAt
    }));
    res.json(users);
});

// Cadastrar novo vendedor (ex: Esposa Luana)
app.post('/api/admin/users', requireAdmin, (req, res) => {
    const { name, username, password, role, avatar } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ error: 'Nome, login e senha são obrigatórios.' });
    }

    const users = getUsers();
    const existing = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existing) {
        return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    const newUser = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        role: role === 'admin' ? 'admin' : 'seller',
        avatar: avatar || (role === 'admin' ? '👑' : '🍫'),
        biometricCredentials: [],
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    console.log(`[USUÁRIOS] Novo vendedor criado: ${newUser.name} (@${newUser.username})`);
    res.status(201).json({ success: true, user: newUser });
});

// Editar vendedor / usuário (incluindo senha)
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, username, password, role, avatar } = req.body;

    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (username) {
        const checkConflict = users.find(u => u.id !== id && u.username.toLowerCase() === username.trim().toLowerCase());
        if (checkConflict) {
            return res.status(400).json({ error: 'Este nome de usuário já está sendo usado por outra conta.' });
        }
        users[userIndex].username = username.trim().toLowerCase();
    }

    if (name) users[userIndex].name = name.trim();
    if (password && password.trim()) users[userIndex].password = password.trim();
    if (role) users[userIndex].role = role === 'admin' ? 'admin' : 'seller';
    if (avatar) users[userIndex].avatar = avatar;

    saveUsers(users);
    console.log(`[USUÁRIOS] Usuário atualizado: ${users[userIndex].name} (@${users[userIndex].username})`);
    res.json({ success: true, user: users[userIndex] });
});

// Excluir usuário
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    let users = getUsers();

    if (id === req.user.id) {
        return res.status(400).json({ error: 'Você não pode excluir sua própria conta de administrador.' });
    }

    users = users.filter(u => u.id !== id);
    saveUsers(users);
    res.json({ success: true, message: 'Usuário removido com sucesso.' });
});

// ==========================================
// CATÁLOGO DE TRUFAS & ESTOQUES
// ==========================================

// Listar produtos (Frente de Loja / Cliente)
app.get('/api/products', (req, res) => {
    const { sellerId } = req.query;
    let products = getProducts().filter(p => p.active !== false);

    if (sellerId && sellerId !== 'all') {
        products = products.filter(p => p.sellerId === sellerId);
    }

    res.json(products);
});

// Listar produtos para o painel de quem está logado (Estoque estritamente individual ou geral se admin)
app.get('/api/admin/products', authenticateUser, (req, res) => {
    let products = getProducts();
    const { sellerId } = req.query;

    if (sellerId && sellerId !== 'all') {
        products = products.filter(p => p.sellerId === sellerId);
    } else if (sellerId === 'all' && req.user.role === 'admin') {
        // Admin pode visualizar todos os produtos de todos os vendedores
    } else {
        // Por padrão, lista os produtos do usuário logado (ou todos se admin sem filtro específico)
        if (req.user.role === 'admin') {
            products = products.filter(p => !p.sellerId || p.sellerId === req.user.id || p.sellerId === 'user-fernando');
            if (products.length === 0) products = getProducts(); // fallback para exibir produtos cadastrados
        } else {
            products = products.filter(p => p.sellerId === req.user.id);
        }
    }

    res.json(products);
});

// Cadastrar nova trufa vinculada ao vendedor logado
app.post('/api/admin/products', authenticateUser, (req, res) => {
    const { flavor, price, cost, weight, size, stock, category, description, icon, sellerId } = req.body;

    if (!flavor || price === undefined) {
        return res.status(400).json({ error: 'Sabor e preço são obrigatórios.' });
    }

    const users = getUsers();
    let assignedSellerId = req.user.id;
    let assignedSellerName = req.user.name;

    // Se for admin, pode cadastrar no estoque de outro vendedor
    if (req.user.role === 'admin' && sellerId) {
        const targetUser = users.find(u => u.id === sellerId);
        if (targetUser) {
            assignedSellerId = targetUser.id;
            assignedSellerName = targetUser.name;
        }
    }

    const products = getProducts();
    const newProduct = {
        id: `trufa-${Date.now()}`,
        sellerId: assignedSellerId,
        sellerName: assignedSellerName,
        flavor: flavor.trim(),
        price: Number(price),
        cost: cost !== undefined && !isNaN(parseFloat(cost)) ? Number(parseFloat(cost).toFixed(2)) : 1.50,
        weight: weight ? weight.trim() : '45g',
        size: size ? size.trim() : 'Médio',
        stock: parseInt(stock, 10) >= 0 ? parseInt(stock, 10) : 0,
        category: category ? category.trim() : 'Gourmet',
        description: description ? description.trim() : '',
        icon: icon || '🍫',
        active: true
    };

    products.push(newProduct);
    saveProducts(products);

    console.log(`[PRODUTOS] Nova trufa: "${newProduct.flavor}" (Custo R$ ${newProduct.cost}, Venda R$ ${newProduct.price}) adicionada ao estoque de ${assignedSellerName}`);
    res.status(201).json({ success: true, product: newProduct });
});

// Editar trufa
app.put('/api/admin/products/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { flavor, price, cost, weight, size, stock, category, description, icon, active, sellerId } = req.body;

    const products = getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Trufa não encontrada.' });
    }

    // Verificar permissão
    if (req.user.role !== 'admin' && products[index].sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode editar trufas do seu próprio estoque.' });
    }

    const users = getUsers();
    let updatedSellerId = products[index].sellerId;
    let updatedSellerName = products[index].sellerName;

    if (req.user.role === 'admin' && sellerId) {
        const targetUser = users.find(u => u.id === sellerId);
        if (targetUser) {
            updatedSellerId = targetUser.id;
            updatedSellerName = targetUser.name;
        }
    }

    products[index] = {
        ...products[index],
        sellerId: updatedSellerId,
        sellerName: updatedSellerName,
        flavor: flavor !== undefined ? flavor.trim() : products[index].flavor,
        price: price !== undefined ? Number(price) : products[index].price,
        cost: cost !== undefined && !isNaN(parseFloat(cost)) ? Number(parseFloat(cost).toFixed(2)) : (products[index].cost !== undefined ? products[index].cost : 1.50),
        weight: weight !== undefined ? weight.trim() : products[index].weight,
        size: size !== undefined ? size.trim() : products[index].size,
        stock: stock !== undefined ? parseInt(stock, 10) : products[index].stock,
        category: category !== undefined ? category.trim() : products[index].category,
        description: description !== undefined ? description.trim() : products[index].description,
        icon: icon !== undefined ? icon : products[index].icon,
        active: active !== undefined ? Boolean(active) : products[index].active
    };

    saveProducts(products);
    res.json({ success: true, product: products[index] });
});

// Ajuste rápido de estoque
app.patch('/api/admin/products/:id/stock', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { change, setStock } = req.body;

    const products = getProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
        return res.status(404).json({ error: 'Trufa não encontrada.' });
    }

    if (req.user.role !== 'admin' && product.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode alterar estoque das suas próprias trufas.' });
    }

    if (setStock !== undefined) {
        product.stock = Math.max(0, parseInt(setStock, 10) || 0);
    } else if (change !== undefined) {
        product.stock = Math.max(0, (Number(product.stock) || 0) + (parseInt(change, 10) || 0));
    }

    saveProducts(products);
    res.json({ success: true, product });
});

// Excluir trufa
app.delete('/api/admin/products/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    let products = getProducts();
    const product = products.find(p => p.id === id);

    if (!product) {
        return res.status(404).json({ error: 'Trufa não encontrada.' });
    }

    if (req.user.role !== 'admin' && product.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode excluir trufas do seu próprio estoque.' });
    }

    products = products.filter(p => p.id !== id);
    saveProducts(products);
    res.json({ success: true, message: 'Trufa excluída.' });
});

// ==========================================
// 🤖 IA CRIADORA DE SABORES & ANÚNCIOS DE TRUFAS
// ==========================================
function generateInternalFlavorAI(rawPrompt, sellerName = 'Luana & Fernando') {
    const promptLower = rawPrompt.toLowerCase();

    // 1. Extração do Preço (se digitado no prompt, ex: "por 5 reais", "R$ 6", "valor 4.50")
    let customPrice = null;
    const priceMatch = rawPrompt.match(/(?:r\$|\$|por|valor|pre[çc]o)\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (priceMatch) {
        customPrice = parseFloat(priceMatch[1].replace(',', '.'));
    }

    // 2. Base de Conhecimento Gastronômico de Sabores
    const flavorDB = [
        {
            keys: ['pistache', 'pistachio'],
            name: 'Trufa Gourmet de Pistache Belga',
            category: 'Gourmet',
            icon: '🌰',
            defaultPrice: 6.00,
            cost: 2.20,
            desc: 'Casquinha nobre de chocolate artesanal recheada com ganache aveludada de puro pistache com pedacinhos crocantes.',
            obs: 'Sabor premium mais pedido para presentes e momentos especiais.',
            headline: '💚 NOVIDADE IRRESISTÍVEL: Trufa de Pistache Artesanal!'
        },
        {
            keys: ['maracuja', 'maracujá', 'mousse de maracuja'],
            name: 'Trufa Gourmet de Mousse de Maracujá',
            category: 'Frutas',
            icon: '🍋',
            defaultPrice: 4.50,
            cost: 1.40,
            desc: 'Equilíbrio perfeito entre o chocolate nobre e o recheio cremoso azedinho do puro maracujá da fruta.',
            obs: 'Super refrescante e cremosa. Campeã de elogios!',
            headline: '💛 A QUERIDINHA VOLTOU: Trufa de Mousse de Maracujá!'
        },
        {
            keys: ['morango', 'sensacao', 'sensação'],
            name: 'Trufa Gourmet Sensação (Morango com Chocolate)',
            category: 'Frutas',
            icon: '🍓',
            defaultPrice: 4.50,
            cost: 1.50,
            desc: 'Combinação clássica irresistível: recheio suave e cremoso de morango envolto em chocolate meio amargo nobre.',
            obs: 'Feita artesanalmente com sabor marcante de fruta fresca.',
            headline: '🍓 EXPERIMENTE A PURA SENSAÇÃO: Trufa de Morango Nobre!'
        },
        {
            keys: ['nutella', 'avela', 'avelã', 'ferrero'],
            name: 'Trufa Gourmet Nutella com Avelã Crocante',
            category: 'Gourmet',
            icon: '🍫',
            defaultPrice: 5.00,
            cost: 1.80,
            desc: 'Recheio farto e cremoso de autêntica Nutella com toque crocante de avelãs selecionadas.',
            obs: 'Puro requinte e sabor intenso para os apaixonados por chocolate.',
            headline: '🍫 PARA OS APAIXONADOS POR NUTELLA: Trufa Artesanal Especial!'
        },
        {
            keys: ['ninho', 'leite ninho', 'ninho com nutella'],
            name: 'Trufa Gourmet de Leite Ninho Cremoso',
            category: 'Gourmet',
            icon: '🥛',
            defaultPrice: 4.50,
            cost: 1.50,
            desc: 'Recheio aveludado e suave de puro Leite Ninho com cobertura de chocolate nobre.',
            obs: 'Textura que derrete na boca a cada mordida.',
            headline: '🥛 DERRETE NA BOCA: Trufa Gourmet de Leite Ninho!'
        },
        {
            keys: ['doce de leite', 'churros', 'caramelo'],
            name: 'Trufa Gourmet de Doce de Leite com Canela',
            category: 'Gourmet',
            icon: '🍯',
            defaultPrice: 4.50,
            cost: 1.40,
            desc: 'Doce de leite artesanal cozido lentamente, com textura cremosa e toque aromático suave de canela.',
            obs: 'Sabor aconchegante que lembra doces tradicionais de infância.',
            headline: '🍯 CREMOSIDADE INIGUALÁVEL: Trufa de Doce de Leite Artesanal!'
        },
        {
            keys: ['kit kat', 'kitkat'],
            name: 'Trufa Gourmet Crocante de Kit Kat',
            category: 'Gourmet',
            icon: '🍫',
            defaultPrice: 5.00,
            cost: 1.70,
            desc: 'Recheio cremoso de chocolate com generosos pedaços crocantes do autêntico Kit Kat.',
            obs: 'Crocância e cremosidade em perfeita harmonia.',
            headline: '🍫 CROCÂNCIA PURA: Nova Trufa Gourmet Kit Kat!'
        },
        {
            keys: ['ovomaltine'],
            name: 'Trufa Gourmet Ovomaltine Crocante',
            category: 'Gourmet',
            icon: '🍫',
            defaultPrice: 4.50,
            cost: 1.50,
            desc: 'Ganache de chocolate com flocos crocantes inconfundíveis de Ovomaltine.',
            obs: 'Ideal para um lanche da tarde ou momento de doce pausa.',
            headline: '🍫 MEGA CROCANTE: Trufa Artesanal de Ovomaltine!'
        },
        {
            keys: ['cafe', 'café', 'cappuccino', 'espresso'],
            name: 'Trufa Especial de Cappuccino com Toque de Canela',
            category: 'Especial',
            icon: '☕',
            defaultPrice: 5.00,
            cost: 1.60,
            desc: 'Harmonia refinada entre café arábica aromático, chocolate nobre e leve toque de canela.',
            obs: 'Combina perfeitamente com um bom café espresso.',
            headline: '☕ O PAR PERFEITO DO SEU CAFÉ: Trufa Especial de Cappuccino!'
        },
        {
            keys: ['limao', 'limão', 'torta de limao'],
            name: 'Trufa Gourmet Torta de Limão Siciliano',
            category: 'Frutas',
            icon: '🍋',
            defaultPrice: 4.50,
            cost: 1.30,
            desc: 'Creme de limão siciliano azedinho e refrescante com casquinha de chocolate branco nobre.',
            obs: 'Uma explosão cítrica e equilibrada de sabor.',
            headline: '🍋 CÍTRICA & PERFEITA: Trufa de Limão Siciliano Artesanal!'
        },
        {
            keys: ['coco', 'beijinho', 'prestigio', 'prestígio'],
            name: 'Trufa Tradicional Prestígio com Coco Fresco',
            category: 'Tradicional',
            icon: '🥥',
            defaultPrice: 4.00,
            cost: 1.30,
            desc: 'Recheio artesanal de coco ralado úmido envolvido em casca generosa de chocolate ao leite.',
            obs: 'O clássico brasileiro que agrada a todos os paladares.',
            headline: '🥥 O CLÁSSICO IRRESISTÍVEL: Trufa de Prestígio Artesanal!'
        },
        {
            keys: ['oreo', 'cookies', 'cookies & cream', 'cookies and cream'],
            name: 'Trufa Gourmet Cookies & Cream (Oreo)',
            category: 'Gourmet',
            icon: '🍪',
            defaultPrice: 5.00,
            cost: 1.70,
            desc: 'Creme de baunilha suave com pedaços de biscoito black crocante e chocolate nobre.',
            obs: 'Favorita absoluta de jovens e adultos.',
            headline: '🍪 EXPLOSÃO DE SABOR: Trufa Gourmet Cookies & Cream!'
        },
        {
            keys: ['cereja', 'licor', 'floresta negra'],
            name: 'Trufa Especial Floresta Negra com Cereja ao Licor',
            category: 'Especial',
            icon: '🍒',
            defaultPrice: 5.50,
            cost: 1.90,
            desc: 'Ganache de chocolate nobre com cereja inteira macerada em leve calda licorosa.',
            obs: 'Toque sofisticado para presentear e comemorar.',
            headline: '🍒 REQUINTE & TRADIÇÃO: Trufa Floresta Negra com Cereja!'
        },
        {
            keys: ['brigadeiro', 'tradicional', 'cacau', 'chocolate'],
            name: 'Trufa Tradicional de Brigadeiro Gourmet',
            category: 'Tradicional',
            icon: '🍫',
            defaultPrice: 4.00,
            cost: 1.30,
            desc: 'Autêntico brigadeiro de panela feito com cacau nobre, macio e extremamente aveludado.',
            obs: 'Feita do jeitinho que todo brasileiro ama.',
            headline: '🍫 O PURO SABOR DO BRIGADEIRO: Trufa Artesanal Tradicional!'
        },
        {
            keys: ['amendoim', 'pacoquinha', 'paçoca', 'pacoquita'],
            name: 'Trufa Gourmet de Paçoca Artesanal',
            category: 'Gourmet',
            icon: '🥜',
            defaultPrice: 4.50,
            cost: 1.30,
            desc: 'Recheio aveludado de pasta de amendoim torrado e paçoca de verdade com chocolate nobre.',
            obs: 'Sabor marcante e autêntico que surpreende.',
            headline: '🥜 PURA GOSTOSURA: Trufa Artesanal de Paçoca!'
        }
    ];

    // Busca melhor match por palavra-chave no banco culinário
    let matched = flavorDB.find(f => f.keys.some(k => promptLower.includes(k)));

    let finalFlavorName = '';
    let finalCategory = 'Gourmet';
    let finalIcon = '🍫';
    let finalPrice = customPrice || 4.50;
    let finalCost = 1.50;
    let finalDesc = '';
    let finalObs = 'Produzida artesanalmente com ingredientes frescos de altíssima qualidade.';
    let finalHeadline = '';

    if (matched) {
        finalFlavorName = matched.name;
        finalCategory = matched.category;
        finalIcon = matched.icon;
        finalPrice = customPrice || matched.defaultPrice;
        finalCost = matched.cost;
        finalDesc = matched.desc;
        finalObs = matched.obs;
        finalHeadline = matched.headline;
    } else {
        let extractedFlavor = rawPrompt
            .replace(/cria(?:r)?/gi, '')
            .replace(/an[uú]ncio(?:s)?/gi, '')
            .replace(/trufa(?:s)?/gi, '')
            .replace(/de/gi, '')
            .replace(/sabor/gi, '')
            .replace(/por\s*\d+(?:[.,]\d+)?/gi, '')
            .replace(/reais/gi, '')
            .replace(/r\$/gi, '')
            .trim();

        if (!extractedFlavor || extractedFlavor.length < 3) {
            extractedFlavor = 'Especial da Casa';
        }

        extractedFlavor = extractedFlavor.charAt(0).toUpperCase() + extractedFlavor.slice(1);
        finalFlavorName = `Trufa Gourmet de ${extractedFlavor}`;
        finalPrice = customPrice || 5.00;
        finalCost = 1.60;
        finalCategory = 'Gourmet';
        finalIcon = '🍫';
        finalDesc = `Deliciosa trufa artesanal recheada com ganache nobre e cremosa de ${extractedFlavor}, coberta com chocolate selecionado.`;
        finalObs = `Receita exclusiva de ${sellerName}, preparada com amor e técnica artesanal.`;
        finalHeadline = `✨ NOVIDADE ESPECIAL: ${finalFlavorName}!`;
    }

    const priceFormatted = `R$ ${finalPrice.toFixed(2).replace('.', ',')}`;

    const whatsappAd = `${finalHeadline}

Olá pessoal! 🍫✨
Acabamos de preparar uma fornada fresquinha e irresistível:

👉 *${finalFlavorName}* (${finalIcon})
${finalDesc}

💰 *Apenas ${priceFormatted}* (45g de pura cremosidade!)
🛵 *Entregas e retiradas programadas para esta Sexta-Feira!*
📍 *Garanta as suas antes que esgote o lote fresquinho da semana.*

📲 *Faça sua encomenda online de forma rápida:*
Peça pelo link ou envie sua mensagem aqui no WhatsApp!
_Feito com amor por ${sellerName}_ ❤️`;

    const instagramAd = `${finalHeadline} 🤤🍫

${finalDesc}

✨ Feita artesanalmente com chocolate nobre e recheio farto que derrete na boca!
💰 Valor: ${priceFormatted} (45g)
📅 Fornadas fresquinhas para retirada e entrega toda Sexta-Feira!

👉 Clique no link da bio para encomendar a sua agora mesmo!

#trufasgourmet #trufasartesanais #chocolate #docesgourmet #${finalFlavorName.toLowerCase().replace(/[^a-z0-9]/g, '')} #chocolatelovers #confeitaria`;

    return {
        flavor: finalFlavorName,
        price: finalPrice,
        cost: finalCost,
        category: finalCategory,
        weight: '45g',
        size: 'Médio',
        icon: finalIcon,
        initialStock: 20,
        description: finalDesc,
        observation: finalObs,
        whatsappAd: whatsappAd,
        instagramAd: instagramAd,
        punchline: finalHeadline
    };
}

app.post('/api/admin/ai-generate-flavor', authenticateUser, async (req, res) => {
    try {
        const { prompt, sellerId } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ error: 'Por favor, informe o que deseja criar (ex: "cria anúncio trufa de pistache").' });
        }

        const userPrompt = prompt.trim();
        const users = getUsers();
        const seller = users.find(u => u.id === (sellerId || req.user.id)) || req.user;

        // Se houver chave do Gemini no .env, tenta consultar modelo
        if (process.env.GEMINI_API_KEY) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const sysPrompt = `Você é uma IA confeiteira e especialista em marketing para trufas gourmet artesanais de Luana Menato & Fernando.
Com base no pedido do usuário, crie os dados da trufa e anúncios persuasivos.
Responda ESTRITAMENTE em formato JSON com:
{
  "flavor": "Nome da trufa",
  "price": 5.0,
  "cost": 1.5,
  "category": "Gourmet",
  "weight": "45g",
  "size": "Médio",
  "icon": "🍫",
  "initialStock": 20,
  "description": "Descrição sensorial irresistível",
  "observation": "Dica de harmonização",
  "whatsappAd": "Texto de anúncio com emojis para WhatsApp destacando entregas de sexta",
  "instagramAd": "Texto para Instagram com hashtags",
  "punchline": "Frase de impacto"
}`;
                const geminiRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: sysPrompt },
                                { text: `Pedido: ${userPrompt}` }
                            ]
                        }]
                    })
                });

                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            return res.json({ success: true, aiResponse: parsed, source: 'gemini' });
                        }
                    }
                }
            } catch (geminiErr) {
                console.warn('Fallback para motor IA interno:', geminiErr.message);
            }
        }

        const generated = generateInternalFlavorAI(userPrompt, seller.name);
        return res.json({ success: true, aiResponse: generated, source: 'internal_ai' });

    } catch (e) {
        console.error('Erro na IA interna:', e);
        res.status(500).json({ error: 'Falha ao processar IA: ' + e.message });
    }
});

// ==========================================
// TRANSFERÊNCIA E SOLICITAÇÃO DE ESTOQUE (FERNANDO <-> LUANA)
// ==========================================

// Listar histórico de transferências de estoque
app.get('/api/admin/stock/transfers', authenticateUser, (req, res) => {
    const transfers = getTransfers();
    res.json(transfers);
});

// Realizar Transferência / Repasse de Estoque
app.post('/api/admin/stock/transfer', authenticateUser, (req, res) => {
    const { fromSellerId, toSellerId, productId, flavor, quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'A quantidade transferida deve ser maior que zero.' });
    }

    if (!fromSellerId || !toSellerId) {
        return res.status(400).json({ error: 'Informe o vendedor de origem e de destino.' });
    }

    if (fromSellerId === toSellerId) {
        return res.status(400).json({ error: 'A conta de origem e destino não podem ser a mesma.' });
    }

    const users = getUsers();
    const fromUser = users.find(u => u.id === fromSellerId);
    const toUser = users.find(u => u.id === toSellerId);

    if (!fromUser || !toUser) {
        return res.status(404).json({ error: 'Vendedor de origem ou destino não encontrado.' });
    }

    // Permissão: precisa ser admin OU o próprio usuário remetente/destinatário
    if (req.user.role !== 'admin' && req.user.id !== fromSellerId && req.user.id !== toSellerId) {
        return res.status(403).json({ error: 'Permissão negada para esta transferência.' });
    }

    const products = getProducts();
    let sourceProduct = products.find(p => p.id === productId && p.sellerId === fromSellerId);

    if (!sourceProduct && flavor) {
        sourceProduct = products.find(p => p.flavor.toLowerCase().trim() === flavor.toLowerCase().trim() && p.sellerId === fromSellerId);
    }

    if (!sourceProduct) {
        return res.status(404).json({ error: `Trufa não encontrada no estoque de ${fromUser.name}.` });
    }

    if (sourceProduct.stock < qty) {
        return res.status(400).json({
            error: `Estoque insuficiente em ${fromUser.name}. Disponível apenas ${sourceProduct.stock} un.`
        });
    }

    // 1. Subtrai da Origem
    sourceProduct.stock -= qty;

    // 2. Incrementa no Destino (se não existir no catálogo da pessoa, cria cópia)
    let destProduct = products.find(p => 
        p.sellerId === toSellerId && 
        p.flavor.toLowerCase().trim() === sourceProduct.flavor.toLowerCase().trim()
    );

    if (destProduct) {
        destProduct.stock = (Number(destProduct.stock) || 0) + qty;
        destProduct.active = true;
    } else {
        destProduct = {
            id: `trufa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            sellerId: toUser.id,
            sellerName: toUser.name,
            flavor: sourceProduct.flavor,
            price: sourceProduct.price,
            weight: sourceProduct.weight || '45g',
            size: sourceProduct.size || 'Médio',
            stock: qty,
            category: sourceProduct.category || 'Gourmet',
            description: sourceProduct.description || '',
            icon: sourceProduct.icon || '🍫',
            active: true
        };
        products.push(destProduct);
    }

    saveProducts(products);

    // 3. Registra no Histórico de Transferências
    const transferRecord = {
        id: `TRANSF-${Date.now()}`,
        fromSellerId: fromUser.id,
        fromSellerName: fromUser.name,
        toSellerId: toUser.id,
        toSellerName: toUser.name,
        flavor: sourceProduct.flavor,
        icon: sourceProduct.icon || '🍫',
        quantity: qty,
        unitPrice: sourceProduct.price,
        timestamp: new Date().toISOString(),
        author: req.user.name
    };

    const transfers = getTransfers();
    transfers.unshift(transferRecord);
    saveTransfers(transfers);

    console.log(`[TRANSFERÊNCIA DE ESTOQUE] ${qty}x "${sourceProduct.flavor}" (${fromUser.name} ➔ ${toUser.name})`);

    res.json({
        success: true,
        message: `${qty}x "${sourceProduct.flavor}" transferidas de ${fromUser.name} para ${toUser.name}!`,
        transfer: transferRecord,
        sourceStockRemaining: sourceProduct.stock,
        destStockNow: destProduct.stock
    });
});

// ==========================================
// CHECKOUT PIX & PEDIDOS
// ==========================================

// Criar Pedido Pix
app.post('/api/create-pix', async (req, res) => {
    const { items, customerName, customerEmail, customerPhone, cpf, deliveryDate, deliveryType, deliveryAddress, paymentMethod, paymentCondition, paymentDueDate, notes, pixFraction } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    const products = getProducts();
    const orderItems = [];
    let calculatedTotal = 0;
    let totalQty = 0;

    for (const cartItem of items) {
        const product = products.find(p => p.id === cartItem.id || p.id === cartItem.productId);
        if (!product) {
            return res.status(400).json({ error: `Trufa não encontrada: ${cartItem.flavor || cartItem.id}` });
        }

        const requestedQty = parseInt(cartItem.quantity, 10) || 1;
        if (requestedQty <= 0) continue;

        if (product.stock < requestedQty) {
            return res.status(400).json({
                error: `Estoque insuficiente para "${product.flavor}". Temos apenas ${product.stock} un. disponíveis.`
            });
        }

        const unitPrice = Number(product.price);
        const subtotal = unitPrice * requestedQty;
        calculatedTotal += subtotal;
        totalQty += requestedQty;

        orderItems.push({
            productId: product.id,
            sellerId: product.sellerId || 'user-fernando',
            sellerName: product.sellerName || 'Fernando',
            flavor: product.flavor,
            weight: product.weight || '45g',
            size: product.size || 'Médio',
            unitPrice: unitPrice,
            quantity: requestedQty,
            subtotal: subtotal
        });
    }

    if (orderItems.length === 0 || calculatedTotal <= 0) {
        return res.status(400).json({ error: 'Nenhum item válido no carrinho.' });
    }

    const fraction = Number(pixFraction) > 0 && Number(pixFraction) <= 1 ? Number(pixFraction) : 1.0;
    const pixAmountToCharge = Number((calculatedTotal * fraction).toFixed(2));

    const orderId = `TRUFA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const itemsDescription = orderItems.map(i => `${i.quantity}x ${i.flavor}`).join(', ');
    const description = fraction < 1 
        ? `Sinal 50% Trufas (${totalQty} un): ${itemsDescription}`.slice(0, 120)
        : `Trufas (${totalQty} un): ${itemsDescription}`.slice(0, 120);

    try {
        let qrCode = '';
        let qrCodeBase64 = '';
        let mpPaymentId = '';
        let status = 'pending';

        if (paymentClient) {
            const mpBody = {
                transaction_amount: pixAmountToCharge,
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: customerEmail || 'cliente@trufasdelicia.com.br',
                    first_name: customerName || 'Cliente Trufas',
                    identification: {
                        type: 'CPF',
                        number: cpf ? cpf.replace(/\D/g, '') : '43741961884'
                    }
                },
                metadata: {
                    order_id: orderId,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    delivery_date: deliveryDate || '',
                    delivery_type: deliveryType || 'Entrega',
                    delivery_address: deliveryAddress || '',
                    items_summary: itemsDescription
                }
            };

            const paymentResult = await paymentClient.create({ body: mpBody });
            mpPaymentId = String(paymentResult.id);
            qrCode = paymentResult.point_of_interaction?.transaction_data?.qr_code || '';
            qrCodeBase64 = paymentResult.point_of_interaction?.transaction_data?.qr_code_base64 || '';
            status = paymentResult.status || 'pending';
        } else {
            mpPaymentId = `SIM-${Date.now()}`;
            qrCode = `00020126580014br.gov.bcb.pix0136pix-trufas-${orderId}520400005303986540${pixAmountToCharge.toFixed(2)}5802BR5925TRUFAS GOURMET6009SAO PAULO62070503***6304`;
            status = 'pending';
        }

        const newOrder = {
            id: orderId,
            paymentId: mpPaymentId,
            customerName: customerName || 'Cliente Balcão',
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
            deliveryDate: deliveryDate || '',
            deliveryType: deliveryType || 'Entrega',
            deliveryAddress: deliveryAddress || '',
            paymentMethod: paymentMethod || (fraction < 1 ? '⚡ Sinal 50% Pix (Restante na Entrega)' : '⚡ Pix Instantâneo (100%)'),
            paymentCondition: paymentCondition || (fraction < 1 ? 'pay_later' : 'paid_now'),
            paymentDueDate: paymentDueDate || '',
            notes: notes ? notes.trim() : '',
            pixAmount: pixAmountToCharge,
            items: orderItems,
            totalAmount: Number(calculatedTotal.toFixed(2)),
            totalQuantity: totalQty,
            status: status,
            stockDeducted: false,
            createdAt: new Date().toISOString(),
            paidAt: null
        };

        const orders = getOrders();
        orders.unshift(newOrder);
        saveOrders(orders);

        res.json({
            orderId: orderId,
            paymentId: mpPaymentId,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            status: status,
            totalAmount: calculatedTotal,
            pixAmount: pixAmountToCharge,
            totalQuantity: totalQty,
            deliveryDate: newOrder.deliveryDate,
            deliveryType: newOrder.deliveryType,
            deliveryAddress: newOrder.deliveryAddress,
            paymentMethod: newOrder.paymentMethod,
            paymentDueDate: newOrder.paymentDueDate,
            notes: newOrder.notes,
            items: orderItems
        });

    } catch (error) {
        console.error('[PIX] Erro ao criar pagamento:', error);
        res.status(500).json({ error: 'Erro ao gerar Pix no Mercado Pago', details: error.message });
    }
});

// Venda Presencial / Dinheiro / Balcão / A Prazo / Pagar no Pagamento (Baixa Imediata no Estoque e Histórico)
app.post('/api/create-direct-order', (req, res) => {
    const { items, customerName, customerEmail, customerPhone, paymentMethod, paymentCondition, paymentDueDate, notes, deliveryDate, deliveryType, deliveryAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    const products = getProducts();
    const orderItems = [];
    let calculatedTotal = 0;
    let totalQty = 0;

    for (const cartItem of items) {
        const product = products.find(p => p.id === cartItem.id || p.id === cartItem.productId);
        if (!product) {
            return res.status(400).json({ error: `Trufa não encontrada: ${cartItem.flavor || cartItem.id}` });
        }

        const requestedQty = parseInt(cartItem.quantity, 10) || 1;
        if (requestedQty <= 0) continue;

        if (product.stock < requestedQty) {
            return res.status(400).json({
                error: `Estoque insuficiente para "${product.flavor}". Temos apenas ${product.stock} un. disponíveis.`
            });
        }

        const unitPrice = Number(product.price);
        const subtotal = unitPrice * requestedQty;
        calculatedTotal += subtotal;
        totalQty += requestedQty;

        orderItems.push({
            productId: product.id,
            sellerId: product.sellerId || 'user-fernando',
            sellerName: product.sellerName || 'Fernando',
            flavor: product.flavor,
            weight: product.weight || '45g',
            size: product.size || 'Médio',
            unitPrice: unitPrice,
            quantity: requestedQty,
            subtotal: subtotal
        });
    }

    if (orderItems.length === 0 || calculatedTotal <= 0) {
        return res.status(400).json({ error: 'Nenhum item válido no carrinho.' });
    }

    const isPayLater = paymentCondition === 'pay_later' || 
                       paymentMethod?.includes('Prazo') || 
                       paymentMethod?.includes('Pagamento') || 
                       paymentMethod?.includes('5º') || 
                       paymentMethod?.includes('Entrega') || 
                       paymentMethod === 'Pagar em Outro Dia';

    const isPaidNow = !isPayLater;
    const finalStatus = isPaidNow ? 'approved' : 'pending';
    const paidAt = isPaidNow ? new Date().toISOString() : null;

    const orderId = `BALCAO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newOrder = {
        id: orderId,
        paymentId: `DIR-${Date.now()}`,
        paymentMethod: paymentMethod || (isPayLater ? '📅 Pagar no Pagamento (5º Dia Útil)' : 'Dinheiro (Balcão)'),
        paymentCondition: isPayLater ? 'pay_later' : 'paid_now',
        paymentDueDate: paymentDueDate || (isPayLater ? '' : new Date().toISOString().split('T')[0]),
        deliveryDate: deliveryDate || '',
        deliveryType: deliveryType || 'Retirada',
        deliveryAddress: deliveryAddress || '',
        customerName: customerName ? customerName.trim() : 'Cliente Balcão',
        customerEmail: customerEmail ? customerEmail.trim() : '',
        customerPhone: customerPhone ? customerPhone.trim() : '',
        notes: notes ? notes.trim() : '',
        items: orderItems,
        totalAmount: Number(calculatedTotal.toFixed(2)),
        totalQuantity: totalQty,
        status: finalStatus,
        stockDeducted: false,
        createdAt: new Date().toISOString(),
        paidAt: paidAt
    };

    // Baixa imediata de estoque (como solicitado: "Baixar Estoque")
    deductStockForOrder(newOrder);

    const orders = getOrders();
    orders.unshift(newOrder);
    saveOrders(orders);

    console.log(`[VENDA PRESENCIAL/PAGAMENTO] Pedido ${orderId} registrado. Total: R$ ${newOrder.totalAmount.toFixed(2)} - Método: ${newOrder.paymentMethod} - Vencimento: ${newOrder.paymentDueDate || 'Hoje'}`);
    res.json({
        success: true,
        message: isPayLater 
            ? 'Pedido agendado com sucesso! Estoque garantido e baixado.'
            : 'Venda presencial registrada e paga com sucesso! Estoque baixado.',
        order: newOrder
    });
});

// Cobrança Pix Avulsa (Nome, Valor, Descrição Personalizada)
app.post('/api/create-custom-pix', async (req, res) => {
    const { customerName, customerEmail, customerPhone, amount, description, sellerId } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Informe um valor válido maior que zero.' });
    }

    const users = getUsers();
    let assignedSellerId = sellerId || 'user-fernando';
    let assignedSellerName = 'Fernando';
    const targetUser = users.find(u => u.id === assignedSellerId);
    if (targetUser) {
        assignedSellerId = targetUser.id;
        assignedSellerName = targetUser.name;
    }

    const orderId = `PIX-AVULSO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const descText = (description || 'Trufas Artesanais Gourmet').trim();

    try {
        let qrCode = '';
        let qrCodeBase64 = '';
        let mpPaymentId = '';
        let status = 'pending';

        if (paymentClient) {
            const mpBody = {
                transaction_amount: Number(numAmount.toFixed(2)),
                description: `Trufas: ${descText}`.slice(0, 120),
                payment_method_id: 'pix',
                payer: {
                    email: customerEmail || 'cliente@trufasdelicia.com.br',
                    first_name: customerName || 'Cliente Trufas',
                    identification: {
                        type: 'CPF',
                        number: '43741961884'
                    }
                },
                metadata: {
                    order_id: orderId,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    seller_id: assignedSellerId,
                    seller_name: assignedSellerName,
                    custom_pix: true
                }
            };

            const paymentResult = await paymentClient.create({ body: mpBody });
            mpPaymentId = String(paymentResult.id);
            qrCode = paymentResult.point_of_interaction?.transaction_data?.qr_code || '';
            qrCodeBase64 = paymentResult.point_of_interaction?.transaction_data?.qr_code_base64 || '';
            status = paymentResult.status || 'pending';
        } else {
            mpPaymentId = `SIM-${Date.now()}`;
            qrCode = `00020126580014br.gov.bcb.pix0136pix-trufas-${orderId}520400005303986540${numAmount.toFixed(2)}5802BR5925TRUFAS GOURMET6009SAO PAULO62070503***6304`;
            status = 'pending';
        }

        const newOrder = {
            id: orderId,
            paymentId: mpPaymentId,
            customerName: customerName || 'Cliente Pix Avulso',
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
            items: [{
                productId: 'custom-item',
                sellerId: assignedSellerId,
                sellerName: assignedSellerName,
                flavor: descText,
                weight: 'Avulso',
                size: 'Personalizado',
                unitPrice: numAmount,
                quantity: 1,
                subtotal: numAmount
            }],
            totalAmount: Number(numAmount.toFixed(2)),
            totalQuantity: 1,
            status: status,
            stockDeducted: true, // Item avulso não decrementa estoque físico específico
            isCustomPix: true,
            createdAt: new Date().toISOString(),
            paidAt: null
        };

        const orders = getOrders();
        orders.unshift(newOrder);
        saveOrders(orders);

        console.log(`[PIX AVULSO] Criado para ${newOrder.customerName} - R$ ${numAmount.toFixed(2)} (${assignedSellerName})`);
        res.json({
            orderId: orderId,
            paymentId: mpPaymentId,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            status: status,
            totalAmount: numAmount,
            customerName: newOrder.customerName,
            description: descText
        });

    } catch (error) {
        console.error('[PIX AVULSO] Erro ao criar cobrança:', error);
        res.status(500).json({ error: 'Erro ao gerar Pix avulso no Mercado Pago', details: error.message });
    }
});

// Consultar Status do Pagamento (Polling)
app.get('/api/check-payment/:id', async (req, res) => {
    const { id } = req.params;
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.paymentId === id || o.id === id);

    if (orderIndex === -1) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const order = orders[orderIndex];

    if (order.status === 'approved') {
        return res.json({ status: 'approved', order });
    }

    try {
        let currentStatus = order.status;

        if (paymentClient && order.paymentId && !order.paymentId.startsWith('SIM-')) {
            const paymentInfo = await paymentClient.get({ id: order.paymentId });
            currentStatus = paymentInfo.status;
        }

        if (currentStatus === 'approved') {
            order.status = 'approved';
            order.paidAt = new Date().toISOString();
            deductStockForOrder(order);
            orders[orderIndex] = order;
            saveOrders(orders);
        }

        res.json({ status: order.status, order });
    } catch (error) {
        console.error('[CHECK-PAYMENT] Erro:', error.message);
        res.json({ status: order.status, order });
    }
});

// Webhook
app.post('/webhook', async (req, res) => {
    const { action, data } = req.body;
    const paymentId = data?.id || req.query['data.id'];

    if (paymentClient && paymentId) {
        try {
            const paymentInfo = await paymentClient.get({ id: paymentId });
            if (paymentInfo.status === 'approved') {
                const orders = getOrders();
                const order = orders.find(o => o.paymentId === String(paymentId));
                if (order && order.status !== 'approved') {
                    order.status = 'approved';
                    order.paidAt = new Date().toISOString();
                    deductStockForOrder(order);
                    saveOrders(orders);
                }
            }
        } catch (err) {
            console.error('[WEBHOOK] Erro:', err.message);
        }
    }
    res.status(200).send('OK');
});

// Aprovação Manual / Baixa de Pagamento (Admin / Vendedor)
app.post('/api/admin/orders/:id/approve-manual', authenticateUser, (req, res) => {
    const { id } = req.params;
    const orders = getOrders();
    const order = orders.find(o => o.id === id || o.paymentId === id);

    if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    order.status = 'approved';
    order.paidAt = new Date().toISOString();
    order.paymentCondition = 'paid_now';
    deductStockForOrder(order);
    saveOrders(orders);

    res.json({ success: true, message: 'Pagamento confirmado e registrado com sucesso!', order });
});

// Estatísticas, Relatórios e BI Completo (Multi-Perfil, Custo, Lucro Real e Séries Temporais para Gráficos)
app.get('/api/admin/stats', authenticateUser, (req, res) => {
    const orders = getOrders();
    const products = getProducts();
    const users = getUsers();
    const { sellerId, period } = req.query;

    const targetSellerId = (req.user.role === 'admin' && sellerId && sellerId !== 'all') 
        ? sellerId 
        : (req.user.role !== 'admin' ? req.user.id : null);

    // Mapeamento de custo dos produtos por ID ou por sabor
    const productCostMap = {};
    for (const p of products) {
        if (p.id) productCostMap[p.id] = (p.cost !== undefined ? Number(p.cost) : 1.50);
        if (p.flavor) productCostMap[p.flavor.toLowerCase()] = (p.cost !== undefined ? Number(p.cost) : 1.50);
    }

    // Filtrar por período de tempo (hoje, 7 dias, mês, tudo)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    let dateFilteredOrders = orders;
    if (period === 'today') {
        dateFilteredOrders = orders.filter(o => (o.createdAt || '').startsWith(todayStr));
    } else if (period === '7days') {
        dateFilteredOrders = orders.filter(o => (o.createdAt || '') >= sevenDaysAgo);
    } else if (period === 'month') {
        dateFilteredOrders = orders.filter(o => (o.createdAt || '') >= startOfMonthStr);
    }

    const approvedOrders = dateFilteredOrders.filter(o => o.status === 'approved');
    const pendingOrders = dateFilteredOrders.filter(o => o.status === 'pending');
    const cancelledOrders = dateFilteredOrders.filter(o => o.status === 'cancelled');

    let totalRevenue = 0;
    let totalCost = 0;
    let totalTrufflesSold = 0;
    const flavorCounts = {};
    const flavorRevenues = {};

    for (const order of approvedOrders) {
        for (const item of order.items || []) {
            if (!targetSellerId || item.sellerId === targetSellerId) {
                const subtotal = (Number(item.subtotal) || (Number(item.unitPrice) * Number(item.quantity)));
                const qty = Number(item.quantity) || 0;
                const unitCost = productCostMap[item.id] || productCostMap[(item.flavor || '').toLowerCase()] || 1.50;
                const itemCost = unitCost * qty;

                totalRevenue += subtotal;
                totalCost += itemCost;
                totalTrufflesSold += qty;

                const flv = item.flavor || 'Outros';
                flavorCounts[flv] = (flavorCounts[flv] || 0) + qty;
                flavorRevenues[flv] = (flavorRevenues[flv] || 0) + subtotal;
            }
        }
    }

    const netProfit = Number((totalRevenue - totalCost).toFixed(2));
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const totalApprovedOrders = approvedOrders.length;
    const averageTicket = totalApprovedOrders > 0 ? Number((totalRevenue / totalApprovedOrders).toFixed(2)) : 0;

    // Sabores Mais Vendidos
    const topFlavors = Object.entries(flavorCounts)
        .map(([flavor, count]) => ({
            flavor,
            count,
            revenue: Number((flavorRevenues[flavor] || 0).toFixed(2)),
            percentage: totalTrufflesSold > 0 ? Number(((count / totalTrufflesSold) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.count - a.count);

    // Identificar produto menos vendido (entre os produtos ativos)
    const activeProducts = products.filter(p => p.active !== false && (!targetSellerId || p.sellerId === targetSellerId));
    let leastSoldFlavor = null;
    if (activeProducts.length > 0) {
        const sortedLeast = [...activeProducts].map(p => ({
            flavor: p.flavor,
            count: flavorCounts[p.flavor] || 0
        })).sort((a, b) => a.count - b.count);
        leastSoldFlavor = sortedLeast[0];
    }

    // 1. Série Diária de Vendas (Últimos 14 dias para o gráfico de Linha)
    const dailySalesSeries = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        const dateLabel = `${day}/${m}`;

        let dayRevenue = 0;
        let dayCost = 0;
        let dayTruffles = 0;

        for (const order of orders.filter(o => o.status === 'approved' && (o.createdAt || '').startsWith(dateKey))) {
            for (const item of order.items || []) {
                if (!targetSellerId || item.sellerId === targetSellerId) {
                    const subtotal = (Number(item.subtotal) || (Number(item.unitPrice) * Number(item.quantity)));
                    const qty = Number(item.quantity) || 0;
                    const unitCost = productCostMap[item.id] || productCostMap[(item.flavor || '').toLowerCase()] || 1.50;
                    dayRevenue += subtotal;
                    dayCost += unitCost * qty;
                    dayTruffles += qty;
                }
            }
        }

        dailySalesSeries.push({
            date: dateKey,
            dateLabel,
            revenue: Number(dayRevenue.toFixed(2)),
            profit: Number((dayRevenue - dayCost).toFixed(2)),
            truffles: dayTruffles
        });
    }

    // 2. Série de Vendas por Vendedor (Para o gráfico de Barras comparativo)
    const salesBySellerSeries = users.map(u => {
        let sellerRev = 0;
        let sellerCost = 0;
        let sellerTruffles = 0;

        for (const order of approvedOrders) {
            for (const item of order.items || []) {
                if (item.sellerId === u.id) {
                    const subtotal = (Number(item.subtotal) || (Number(item.unitPrice) * Number(item.quantity)));
                    const qty = Number(item.quantity) || 0;
                    const unitCost = productCostMap[item.id] || productCostMap[(item.flavor || '').toLowerCase()] || 1.50;
                    sellerRev += subtotal;
                    sellerCost += unitCost * qty;
                    sellerTruffles += qty;
                }
            }
        }

        return {
            sellerId: u.id,
            sellerName: u.name,
            avatar: u.avatar || '🍫',
            revenue: Number(sellerRev.toFixed(2)),
            profit: Number((sellerRev - sellerCost).toFixed(2)),
            truffles: sellerTruffles
        };
    });

    // 3. Série de Distribuição por Sabor (Para o gráfico de Rosca)
    const flavorDistributionSeries = topFlavors.slice(0, 6);

    // Estoques e Alertas
    const lowStockAlerts = activeProducts.filter(p => p.stock <= 5);
    const totalCurrentStock = activeProducts.reduce((sum, p) => sum + (p.stock || 0), 0);

    // Pedidos Pendentes e Conversão
    let pendingRevenue = 0;
    for (const order of pendingOrders) {
        for (const item of order.items || []) {
            if (!targetSellerId || item.sellerId === targetSellerId) {
                pendingRevenue += (Number(item.subtotal) || (Number(item.unitPrice) * Number(item.quantity)));
            }
        }
    }

    const totalOrdersCount = approvedOrders.length + pendingOrders.length + cancelledOrders.length;
    const conversionRate = totalOrdersCount > 0 ? Number(((approvedOrders.length / totalOrdersCount) * 100).toFixed(1)) : 100;

    res.json({
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        netProfit,
        profitMargin,
        totalTrufflesSold,
        totalApprovedOrders,
        averageTicket,
        topFlavors,
        leastSoldFlavor,
        dailySalesSeries,
        salesBySellerSeries,
        flavorDistributionSeries,
        totalCurrentStock,
        lowStockAlerts,
        productsCount: activeProducts.length,
        pendingOrdersCount: pendingOrders.length,
        pendingRevenue: Number(pendingRevenue.toFixed(2)),
        conversionRate,
        period: period || 'all',
        sellerFilter: targetSellerId || 'all'
    });
});

// Histórico de Pedidos
app.get('/api/admin/orders', authenticateUser, (req, res) => {
    const orders = getOrders();
    const { sellerId } = req.query;

    const targetSellerId = (req.user.role === 'admin' && sellerId && sellerId !== 'all') 
        ? sellerId 
        : (req.user.role !== 'admin' ? req.user.id : null);

    if (!targetSellerId) {
        return res.json(orders);
    }

    const filteredOrders = orders.filter(o => o.items?.some(i => i.sellerId === targetSellerId));
    res.json(filteredOrders);
});

// ==========================================
// CADERNO DE ANOTAÇÕES & CONTROLE DE QUEM PAGOU (FIADOS & ACERTOS)
// ==========================================

// Listar todas as anotações
app.get('/api/admin/notes', authenticateUser, (req, res) => {
    const notes = getNotes();
    const { sellerId, status } = req.query;

    const targetSellerId = (req.user.role === 'admin' && sellerId && sellerId !== 'all') 
        ? sellerId 
        : (req.user.role !== 'admin' ? req.user.id : null);

    let filteredNotes = notes;

    if (targetSellerId) {
        filteredNotes = filteredNotes.filter(n => n.sellerId === targetSellerId);
    }

    if (status && status !== 'all') {
        filteredNotes = filteredNotes.filter(n => n.status === status);
    }

    // Ordenar: primeiro os pendentes (mais urgentes), depois os pagos, por data mais recente
    filteredNotes.sort((a, b) => {
        if (a.status === 'pending' && b.status === 'paid') return -1;
        if (a.status === 'paid' && b.status === 'pending') return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    // Calcular resumo financeiro das anotações
    let totalPendingAmount = 0;
    let totalPaidAmount = 0;
    let countPending = 0;
    let countPaid = 0;

    const allForStats = targetSellerId ? notes.filter(n => n.sellerId === targetSellerId) : notes;
    for (const note of allForStats) {
        const val = Number(note.totalAmount) || 0;
        if (note.status === 'paid') {
            totalPaidAmount += val;
            countPaid++;
        } else {
            totalPendingAmount += val;
            countPending++;
        }
    }

    res.json({
        notes: filteredNotes,
        stats: {
            totalPendingAmount,
            totalPaidAmount,
            countPending,
            countPaid,
            totalNotes: allForStats.length
        }
    });
});

// Criar nova anotação de cobrança / fiado / quem pagou
app.post('/api/admin/notes', authenticateUser, (req, res) => {
    const { 
        customerName, 
        customerPhone, 
        description, 
        totalAmount, 
        status, 
        paymentMethod, 
        dueDate, 
        notes: extraNotes, 
        sellerId 
    } = req.body;

    if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: 'O nome da pessoa / cliente é obrigatório.' });
    }

    const numAmount = parseFloat(totalAmount);
    if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'Informe um valor válido.' });
    }

    const users = getUsers();
    let assignedSellerId = req.user.id;
    let assignedSellerName = req.user.name;

    if (req.user.role === 'admin' && sellerId) {
        const targetUser = users.find(u => u.id === sellerId);
        if (targetUser) {
            assignedSellerId = targetUser.id;
            assignedSellerName = targetUser.name;
        }
    }

    const isPaid = status === 'paid';
    const nowIso = new Date().toISOString();

    const newNote = {
        id: `NOTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sellerId: assignedSellerId,
        sellerName: assignedSellerName,
        customerName: customerName.trim(),
        customerPhone: customerPhone ? customerPhone.trim() : '',
        description: description ? description.trim() : 'Trufas Artesanais',
        totalAmount: Number(numAmount.toFixed(2)),
        status: isPaid ? 'paid' : 'pending',
        paymentMethod: isPaid ? (paymentMethod || 'Dinheiro (Em mãos)') : '',
        dueDate: dueDate || '',
        notes: extraNotes ? extraNotes.trim() : '',
        createdAt: nowIso,
        paidAt: isPaid ? nowIso : null,
        updatedAt: nowIso
    };

    const notesList = getNotes();
    notesList.unshift(newNote);
    saveNotes(notesList);

    console.log(`[ANOTAÇÃO] Nova anotação criada: "${newNote.customerName}" - R$ ${newNote.totalAmount.toFixed(2)} (${newNote.status === 'paid' ? 'Já Pago' : 'Não Pagou / Fiado'}) por ${assignedSellerName}`);
    res.status(201).json({ success: true, note: newNote });
});

// Editar uma anotação
app.put('/api/admin/notes/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { 
        customerName, 
        customerPhone, 
        description, 
        totalAmount, 
        status, 
        paymentMethod, 
        dueDate, 
        notes: extraNotes,
        sellerId 
    } = req.body;

    const notesList = getNotes();
    const index = notesList.findIndex(n => n.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Anotação não encontrada.' });
    }

    // Permissão: admin ou dono da anotação
    if (req.user.role !== 'admin' && notesList[index].sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode editar suas próprias anotações.' });
    }

    const isPaid = status !== undefined ? (status === 'paid') : (notesList[index].status === 'paid');
    const wasPaid = notesList[index].status === 'paid';
    let paidAt = notesList[index].paidAt;

    if (isPaid && !wasPaid) {
        paidAt = new Date().toISOString();
    } else if (!isPaid) {
        paidAt = null;
    }

    const users = getUsers();
    let updatedSellerId = notesList[index].sellerId;
    let updatedSellerName = notesList[index].sellerName;

    if (req.user.role === 'admin' && sellerId) {
        const targetUser = users.find(u => u.id === sellerId);
        if (targetUser) {
            updatedSellerId = targetUser.id;
            updatedSellerName = targetUser.name;
        }
    }

    notesList[index] = {
        ...notesList[index],
        sellerId: updatedSellerId,
        sellerName: updatedSellerName,
        customerName: customerName !== undefined ? customerName.trim() : notesList[index].customerName,
        customerPhone: customerPhone !== undefined ? customerPhone.trim() : notesList[index].customerPhone,
        description: description !== undefined ? description.trim() : notesList[index].description,
        totalAmount: totalAmount !== undefined ? Number(parseFloat(totalAmount).toFixed(2)) : notesList[index].totalAmount,
        status: isPaid ? 'paid' : 'pending',
        paymentMethod: isPaid ? (paymentMethod || notesList[index].paymentMethod || 'Dinheiro (Em mãos)') : '',
        dueDate: dueDate !== undefined ? dueDate : notesList[index].dueDate,
        notes: extraNotes !== undefined ? extraNotes.trim() : notesList[index].notes,
        paidAt: paidAt,
        updatedAt: new Date().toISOString()
    };

    saveNotes(notesList);
    res.json({ success: true, note: notesList[index] });
});

// Alternar status rápido com 1 clique (Pago <-> Não Pago / Pendente)
app.patch('/api/admin/notes/:id/toggle-status', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { paymentMethod } = req.body || {};

    const notesList = getNotes();
    const note = notesList.find(n => n.id === id);

    if (!note) {
        return res.status(404).json({ error: 'Anotação não encontrada.' });
    }

    if (req.user.role !== 'admin' && note.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode alterar status das suas próprias anotações.' });
    }

    if (note.status === 'pending') {
        note.status = 'paid';
        note.paidAt = new Date().toISOString();
        note.paymentMethod = paymentMethod || 'Dinheiro (Em mãos)';
        console.log(`[ANOTAÇÃO] "${note.customerName}" marcada como PAGA! (R$ ${note.totalAmount.toFixed(2)})`);
    } else {
        note.status = 'pending';
        note.paidAt = null;
        console.log(`[ANOTAÇÃO] "${note.customerName}" reaberta como PENDENTE.`);
    }

    note.updatedAt = new Date().toISOString();
    saveNotes(notesList);

    res.json({ 
        success: true, 
        message: note.status === 'paid' ? 'Marcado como Pago com sucesso!' : 'Marcado como Pendente!',
        note 
    });
});

// Excluir uma anotação
app.delete('/api/admin/notes/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    let notesList = getNotes();
    const note = notesList.find(n => n.id === id);

    if (!note) {
        return res.status(404).json({ error: 'Anotação não encontrada.' });
    }

    if (req.user.role !== 'admin' && note.sellerId !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode excluir suas próprias anotações.' });
    }

    notesList = notesList.filter(n => n.id !== id);
    saveNotes(notesList);

    console.log(`[ANOTAÇÃO] Anotação excluída: "${note.customerName}"`);
    res.json({ success: true, message: 'Anotação removida com sucesso.' });
});

// ==========================================
// ROTAS DE AGENDAMENTOS DE PEDIDOS & ENCOMENDAS (SCHEDULES)
// ==========================================

// Listar agendamentos com filtros, métricas e consolidação de sabores para produção
// Compartilhado entre Fernando e Luana por padrão
app.get('/api/admin/schedules', authenticateUser, (req, res) => {
    const schedules = getSchedules();
    const { sellerId, status, dateFilter } = req.query;

    // Se houver filtro explícito por vendedor (ex: só Fernando ou só Luana), filtra; caso contrário, exibe os 2 perfis
    const targetSellerId = (sellerId && sellerId !== 'all') ? sellerId : null;

    let filteredSchedules = schedules;

    if (targetSellerId) {
        filteredSchedules = filteredSchedules.filter(s => s.sellerId === targetSellerId);
    }

    if (status && status !== 'all') {
        filteredSchedules = filteredSchedules.filter(s => s.status === status);
    }

    // Filtro rápido de data (Hoje, Próximos 7 dias, etc.)
    if (dateFilter && dateFilter !== 'all') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateFilter === 'today') {
            filteredSchedules = filteredSchedules.filter(s => s.scheduleDate === todayStr);
        } else if (dateFilter === 'upcoming7') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];
            filteredSchedules = filteredSchedules.filter(s => s.scheduleDate >= todayStr && s.scheduleDate <= nextWeekStr);
        }
    }

    // Ordenação: 
    // 1. Status ativos primeiro (producing, pending, ready) antes de (delivered, cancelled)
    // 2. Data do agendamento (mais próximos primeiro)
    const statusPriority = { 'producing': 1, 'pending': 2, 'ready': 3, 'delivered': 4, 'cancelled': 5 };
    filteredSchedules.sort((a, b) => {
        const pA = statusPriority[a.status] || 99;
        const pB = statusPriority[b.status] || 99;
        if (pA !== pB) return pA - pB;
        if (a.scheduleDate !== b.scheduleDate) return (a.scheduleDate || '').localeCompare(b.scheduleDate || '');
        return (a.scheduleTime || '').localeCompare(b.scheduleTime || '');
    });

    // Calcular estatísticas e totais para a base compartilhada ou filtrada
    const allForStats = targetSellerId ? schedules.filter(s => s.sellerId === targetSellerId) : schedules;

    let countPending = 0;
    let countProducing = 0;
    let countReady = 0;
    let countDelivered = 0;
    let countCancelled = 0;
    let totalScheduledAmount = 0;
    let totalPendingAmount = 0;
    let totalPaidAmount = 0;

    // Consolidação de Sabores para o Lote de Produção (Apenas agendamentos ativos: pending, producing, ready)
    const flavorTotalsMap = {};
    let totalTrufflesToProduce = 0;

    for (const s of allForStats) {
        const val = Number(s.totalAmount) || 0;
        const dep = Number(s.depositAmount) || 0;

        if (s.status === 'pending') countPending++;
        else if (s.status === 'producing') countProducing++;
        else if (s.status === 'ready') countReady++;
        else if (s.status === 'delivered') countDelivered++;
        else if (s.status === 'cancelled') countCancelled++;

        if (s.status !== 'cancelled') {
            totalScheduledAmount += val;
            if (s.paymentStatus === 'paid') {
                totalPaidAmount += val;
            } else if (s.paymentStatus === 'deposit_paid') {
                totalPaidAmount += dep;
                totalPendingAmount += Math.max(0, val - dep);
            } else {
                totalPendingAmount += val;
            }
        }

        // Se o agendamento está ativo (aguardando confecção ou entrega)
        if (['pending', 'producing', 'ready'].includes(s.status) && Array.isArray(s.items)) {
            for (const item of s.items) {
                const flavorName = (item.flavor || 'Sabor Indefinido').trim();
                const qty = parseInt(item.quantity, 10) || 0;
                if (qty > 0) {
                    flavorTotalsMap[flavorName] = (flavorTotalsMap[flavorName] || 0) + qty;
                    totalTrufflesToProduce += qty;
                }
            }
        }
    }

    // Transformar o mapa em array ordenado pela maior quantidade
    const flavorProductionTotals = Object.entries(flavorTotalsMap)
        .map(([flavor, quantity]) => ({ flavor, quantity }))
        .sort((a, b) => b.quantity - a.quantity);

    res.json({
        schedules: filteredSchedules,
        stats: {
            countPending,
            countProducing,
            countReady,
            countDelivered,
            countCancelled,
            totalSchedules: allForStats.length,
            totalScheduledAmount,
            totalPendingAmount,
            totalPaidAmount
        },
        flavorProductionTotals,
        totalTrufflesToProduce
    });
});

// Criar novo agendamento / encomenda (salva quem cadastrou e permite escolher vendedor)
app.post('/api/admin/schedules', authenticateUser, (req, res) => {
    const { 
        customerName, 
        customerPhone, 
        deliveryType, 
        deliveryAddress, 
        scheduleDate, 
        scheduleTime, 
        items, 
        totalAmount, 
        depositAmount, 
        paymentStatus, 
        paymentMethod, 
        status, 
        notes, 
        sellerId 
    } = req.body;

    if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
    }

    if (!scheduleDate) {
        return res.status(400).json({ error: 'A data do agendamento é obrigatória.' });
    }

    const cleanItems = Array.isArray(items) ? items.filter(i => (parseInt(i.quantity, 10) || 0) > 0).map(i => ({
        id: i.id || ('item-' + crypto.randomBytes(3).toString('hex')),
        flavor: (i.flavor || '').trim() || 'Trufa Sortida',
        quantity: parseInt(i.quantity, 10) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0
    })) : [];

    const numTotal = parseFloat(totalAmount);
    const numDeposit = parseFloat(depositAmount) || 0;

    const users = getUsers();
    let assignedSellerId = req.user.id;
    let assignedSellerName = req.user.name;

    if (sellerId) {
        const found = users.find(u => u.id === sellerId);
        if (found) {
            assignedSellerId = found.id;
            assignedSellerName = found.name;
        }
    }

    const newSchedule = {
        id: 'sched-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'),
        customerName: customerName.trim(),
        customerPhone: (customerPhone || '').trim(),
        deliveryType: deliveryType === 'delivery' ? 'delivery' : 'pickup',
        deliveryAddress: (deliveryAddress || '').trim(),
        scheduleDate,
        scheduleTime: (scheduleTime || '').trim(),
        items: cleanItems,
        totalItems: cleanItems.reduce((acc, i) => acc + i.quantity, 0),
        totalAmount: isNaN(numTotal) ? 0 : numTotal,
        depositAmount: numDeposit,
        paymentStatus: ['paid', 'deposit_paid', 'pending'].includes(paymentStatus) ? paymentStatus : 'pending',
        paymentMethod: (paymentMethod || 'Pix').trim(),
        status: ['pending', 'producing', 'ready', 'delivered', 'cancelled'].includes(status) ? status : 'pending',
        notes: (notes || '').trim(),
        sellerId: assignedSellerId,
        sellerName: assignedSellerName,
        createdBy: req.user.name,
        createdById: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const schedules = getSchedules();
    schedules.push(newSchedule);
    saveSchedules(schedules);

    console.log(`[AGENDAMENTO] Novo agendamento para "${newSchedule.customerName}" por ${req.user.name} em ${newSchedule.scheduleDate} (${newSchedule.totalItems} trufas)`);
    res.status(201).json({ success: true, message: 'Agendamento salvo com sucesso!', schedule: newSchedule });
});

// Atualizar agendamento existente (compartilhado entre perfis)
app.put('/api/admin/schedules/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    const schedules = getSchedules();
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const current = schedules[index];

    const { 
        customerName, 
        customerPhone, 
        deliveryType, 
        deliveryAddress, 
        scheduleDate, 
        scheduleTime, 
        items, 
        totalAmount, 
        depositAmount, 
        paymentStatus, 
        paymentMethod, 
        status, 
        notes, 
        sellerId 
    } = req.body;

    if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
    }

    if (!scheduleDate) {
        return res.status(400).json({ error: 'A data do agendamento é obrigatória.' });
    }

    const cleanItems = Array.isArray(items) ? items.filter(i => (parseInt(i.quantity, 10) || 0) > 0).map(i => ({
        id: i.id || ('item-' + crypto.randomBytes(3).toString('hex')),
        flavor: (i.flavor || '').trim() || 'Trufa Sortida',
        quantity: parseInt(i.quantity, 10) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0
    })) : current.items;

    const numTotal = parseFloat(totalAmount);
    const numDeposit = parseFloat(depositAmount) || 0;

    let assignedSellerId = current.sellerId;
    let assignedSellerName = current.sellerName;

    if (sellerId) {
        const users = getUsers();
        const found = users.find(u => u.id === sellerId);
        if (found) {
            assignedSellerId = found.id;
            assignedSellerName = found.name;
        }
    }

    const updated = {
        ...current,
        customerName: customerName.trim(),
        customerPhone: (customerPhone || '').trim(),
        deliveryType: deliveryType === 'delivery' ? 'delivery' : 'pickup',
        deliveryAddress: (deliveryAddress || '').trim(),
        scheduleDate,
        scheduleTime: (scheduleTime || '').trim(),
        items: cleanItems,
        totalItems: cleanItems.reduce((acc, i) => acc + i.quantity, 0),
        totalAmount: isNaN(numTotal) ? current.totalAmount : numTotal,
        depositAmount: numDeposit,
        paymentStatus: paymentStatus || current.paymentStatus,
        paymentMethod: paymentMethod || current.paymentMethod,
        status: status || current.status,
        notes: (notes !== undefined) ? notes.trim() : current.notes,
        sellerId: assignedSellerId,
        sellerName: assignedSellerName,
        updatedBy: req.user.name,
        updatedById: req.user.id,
        updatedAt: new Date().toISOString()
    };

    if (updated.status === 'delivered' && !current.deliveredAt) {
        updated.deliveredAt = new Date().toISOString();
    }

    schedules[index] = updated;
    saveSchedules(schedules);

    console.log(`[AGENDAMENTO] Agendamento atualizado por ${req.user.name}: "${updated.customerName}"`);
    res.json({ success: true, message: 'Agendamento atualizado com sucesso!', schedule: updated });
});

// Alterar Status Rápido (Ex: Pendente -> Em Produção -> Pronto -> Entregue)
app.patch('/api/admin/schedules/:id/status', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const schedules = getSchedules();
    const schedule = schedules.find(s => s.id === id);

    if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    if (!['pending', 'producing', 'ready', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
    }

    schedule.status = status;
    schedule.updatedBy = req.user.name;
    schedule.updatedById = req.user.id;
    schedule.updatedAt = new Date().toISOString();
    if (status === 'delivered') {
        schedule.deliveredAt = new Date().toISOString();
    }

    saveSchedules(schedules);

    res.json({ 
        success: true, 
        message: `Status atualizado com sucesso!`,
        schedule 
    });
});

// Excluir um agendamento
app.delete('/api/admin/schedules/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    let schedules = getSchedules();
    const schedule = schedules.find(s => s.id === id);

    if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    schedules = schedules.filter(s => s.id !== id);
    saveSchedules(schedules);

    console.log(`[AGENDAMENTO] Agendamento excluído por ${req.user.name}: "${schedule.customerName}"`);
    res.json({ success: true, message: 'Agendamento removido com sucesso.' });
});

// ==========================================
// 🧪 CONFEITARIA: INSUMOS, FICHAS TÉCNICAS & LISTA DE COMPRAS
// ==========================================

// Listar Insumos
app.get('/api/admin/ingredients', authenticateUser, (req, res) => {
    const ingredients = getIngredients();
    res.json(ingredients);
});

// Cadastrar Insumo
app.post('/api/admin/ingredients', authenticateUser, (req, res) => {
    const { name, category, unit, packageSize, packagePrice, unitDisplay } = req.body;
    if (!name || !packageSize || !packagePrice) {
        return res.status(400).json({ error: 'Nome, tamanho da embalagem e preço são obrigatórios.' });
    }

    const ingredients = getIngredients();
    const pkgSizeNum = parseFloat(packageSize) || 1;
    const pkgPriceNum = parseFloat(packagePrice) || 0;
    const unitCost = pkgSizeNum > 0 ? (pkgPriceNum / pkgSizeNum) : 0;

    const newIng = {
        id: 'ing-' + Date.now(),
        name: name.trim(),
        category: category || 'Outros',
        unit: unit || 'g',
        packageSize: pkgSizeNum,
        packagePrice: pkgPriceNum,
        unitCost: unitCost,
        unitDisplay: unitDisplay || `${pkgSizeNum}${unit || 'g'}`
    };

    ingredients.push(newIng);
    saveIngredients(ingredients);

    res.status(201).json({ success: true, ingredient: newIng, message: 'Insumo cadastrado com sucesso!' });
});

// Atualizar Insumo
app.put('/api/admin/ingredients/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { name, category, unit, packageSize, packagePrice, unitDisplay } = req.body;

    const ingredients = getIngredients();
    const ingIndex = ingredients.findIndex(i => i.id === id);
    if (ingIndex === -1) {
        return res.status(404).json({ error: 'Insumo não encontrado.' });
    }

    const pkgSizeNum = parseFloat(packageSize) || ingredients[ingIndex].packageSize;
    const pkgPriceNum = parseFloat(packagePrice) || ingredients[ingIndex].packagePrice;
    const unitCost = pkgSizeNum > 0 ? (pkgPriceNum / pkgSizeNum) : 0;

    ingredients[ingIndex] = {
        ...ingredients[ingIndex],
        name: name !== undefined ? name.trim() : ingredients[ingIndex].name,
        category: category !== undefined ? category : ingredients[ingIndex].category,
        unit: unit !== undefined ? unit : ingredients[ingIndex].unit,
        packageSize: pkgSizeNum,
        packagePrice: pkgPriceNum,
        unitCost: unitCost,
        unitDisplay: unitDisplay || `${pkgSizeNum}${unit || 'g'}`
    };

    saveIngredients(ingredients);
    res.json({ success: true, ingredient: ingredients[ingIndex], message: 'Insumo atualizado com sucesso!' });
});

// Excluir Insumo
app.delete('/api/admin/ingredients/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    let ingredients = getIngredients();
    ingredients = ingredients.filter(i => i.id !== id);
    saveIngredients(ingredients);
    res.json({ success: true, message: 'Insumo removido com sucesso.' });
});

// Listar Fichas Técnicas / Receitas
app.get('/api/admin/recipes', authenticateUser, (req, res) => {
    const recipes = getRecipes();
    const ingredients = getIngredients();

    // Recalcular custos com base nos preços atuais dos insumos
    const recipesWithCurrentCosts = recipes.map(recipe => {
        let totalCost = 0;
        const details = (recipe.ingredients || []).map(item => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const ingCost = ing ? (ing.unitCost * item.amount) : 0;
            totalCost += ingCost;
            return {
                ...item,
                ingredientName: ing?.name || 'Insumo',
                ingredientUnit: ing?.unit || item.unit || 'g',
                itemCost: Number(ingCost.toFixed(2))
            };
        });

        return {
            ...recipe,
            ingredientsDetails: details,
            calculatedCost: Number(totalCost.toFixed(2))
        };
    });

    res.json(recipesWithCurrentCosts);
});

// Salvar / Atualizar Ficha Técnica
app.post('/api/admin/recipes', authenticateUser, (req, res) => {
    const { flavor, icon, description, ingredients: recipeItems } = req.body;
    if (!flavor || !Array.isArray(recipeItems)) {
        return res.status(400).json({ error: 'Sabor e itens da receita são obrigatórios.' });
    }

    const recipes = getRecipes();
    const allIngredients = getIngredients();

    let totalCost = 0;
    recipeItems.forEach(item => {
        const ing = allIngredients.find(i => i.id === item.ingredientId);
        if (ing) totalCost += (ing.unitCost * item.amount);
    });

    const existingIndex = recipes.findIndex(r => r.flavor.toLowerCase().trim() === flavor.toLowerCase().trim());
    const recipeObj = {
        flavor: flavor.trim(),
        icon: icon || '🍫',
        description: description || '',
        ingredients: recipeItems,
        estimatedCost: Number(totalCost.toFixed(2))
    };

    if (existingIndex >= 0) {
        recipes[existingIndex] = recipeObj;
    } else {
        recipes.push(recipeObj);
    }
    saveRecipes(recipes);

    // Atualizar automaticamente o custo do produto correspondente em products.json
    const products = getProducts();
    let updatedProducts = false;
    products.forEach(p => {
        if (p.flavor.toLowerCase().trim() === flavor.toLowerCase().trim()) {
            p.cost = recipeObj.estimatedCost;
            updatedProducts = true;
        }
    });
    if (updatedProducts) saveProducts(products);

    res.json({ success: true, recipe: recipeObj, message: 'Ficha técnica salva e custo unitário atualizado!' });
});

// Calculadora de Produção & Lista de Compras Inteligente
app.post('/api/admin/production/calculate', authenticateUser, (req, res) => {
    let { items } = req.body; // array de { flavor, quantity }

    // Se items não for fornecido, puxa automaticamente todas as encomendas agendadas (status: pending ou producing)
    if (!items || !Array.isArray(items) || items.length === 0) {
        const schedules = getSchedules();
        const activeSchedules = schedules.filter(s => s.status === 'pending' || s.status === 'producing');
        const flavorCounts = {};

        activeSchedules.forEach(s => {
            (s.items || []).forEach(item => {
                const flv = (item.flavor || '').trim();
                if (flv) {
                    flavorCounts[flv] = (flavorCounts[flv] || 0) + (parseInt(item.quantity, 10) || 0);
                }
            });
        });

        items = Object.entries(flavorCounts).map(([flavor, quantity]) => ({ flavor, quantity }));
    }

    const recipes = getRecipes();
    const ingredients = getIngredients();

    let totalTruffles = 0;
    const requiredIngsMap = {}; // ingredientId -> { totalAmount, unit }
    const itemsSummary = [];

    items.forEach(item => {
        const qty = parseInt(item.quantity, 10) || 0;
        if (qty <= 0) return;
        totalTruffles += qty;

        const recipe = recipes.find(r => r.flavor.toLowerCase().trim() === (item.flavor || '').toLowerCase().trim());
        itemsSummary.push({
            flavor: item.flavor,
            quantity: qty,
            hasRecipe: !!recipe
        });

        if (recipe && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach(ri => {
                const totalItemAmount = ri.amount * qty;
                if (!requiredIngsMap[ri.ingredientId]) {
                    requiredIngsMap[ri.ingredientId] = {
                        amount: 0,
                        unit: ri.unit || 'g'
                    };
                }
                requiredIngsMap[ri.ingredientId].amount += totalItemAmount;
            });
        }
    });

    let totalProductionCost = 0;
    const shoppingList = [];

    Object.entries(requiredIngsMap).forEach(([ingId, data]) => {
        const ing = ingredients.find(i => i.id === ingId);
        if (ing) {
            const cost = data.amount * ing.unitCost;
            totalProductionCost += cost;
            const packagesNeeded = ing.packageSize > 0 ? Math.ceil(data.amount / ing.packageSize) : 1;

            shoppingList.push({
                ingredientId: ing.id,
                name: ing.name,
                category: ing.category,
                totalAmountRequired: Number(data.amount.toFixed(1)),
                unit: ing.unit,
                packageSize: ing.packageSize,
                packagePrice: ing.packagePrice,
                packagesNeeded: packagesNeeded,
                unitDisplay: ing.unitDisplay,
                estimatedCost: Number(cost.toFixed(2)),
                buyCost: Number((packagesNeeded * ing.packagePrice).toFixed(2))
            });
        }
    });

    // Gerar texto formatado para envio no WhatsApp
    let waText = `🛒 *LISTA DE COMPRAS - CONFEITARIA DE TRUFAS* 🛒\n`;
    waText += `🍫 *Lote Total:* ${totalTruffles} trufas\n`;
    waText += `📅 *Gerado em:* ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    waText += `📦 *ITENS A PRODUZIR:*\n`;
    itemsSummary.forEach(i => {
        waText += `• ${i.quantity}x Trufas de ${i.flavor}\n`;
    });
    waText += `\n🛍️ *INGREDIENTES NECESSÁRIOS NO MERCADO:*\n`;
    shoppingList.forEach(s => {
        waText += `▫️ *${s.name}:* ${s.totalAmountRequired} ${s.unit} ➔ *Comprar ${s.packagesNeeded} un.* (${s.unitDisplay})\n`;
    });
    waText += `\n💰 *Custo Estimado Insumos:* R$ ${totalProductionCost.toFixed(2).replace('.', ',')}\n`;

    res.json({
        success: true,
        totalTruffles,
        itemsSummary,
        shoppingList,
        totalProductionCost: Number(totalProductionCost.toFixed(2)),
        whatsappShoppingList: waText
    });
});

// ==========================================
// 📱 PORTAL DO CLIENTE PARA ENCOMENDAS ONLINE
// ==========================================

// Cardápio público para o cliente
app.get('/api/client/menu', (req, res) => {
    const products = getProducts().filter(p => p.active !== false);
    const availableFlavors = products.map(p => ({
        id: p.id,
        flavor: p.flavor,
        price: Number(p.price) || 4.00,
        weight: p.weight || '45g',
        size: p.size || 'Médio',
        category: p.category || 'Gourmet',
        description: p.description || '',
        icon: p.icon || '🍫',
        stock: p.stock || 0
    }));
    res.json(availableFlavors);
});

// Criar Encomenda pelo Cliente via WhatsApp
app.post('/api/client/orders', (req, res) => {
    const {
        customerName,
        customerPhone,
        deliveryType,
        deliveryAddress,
        scheduleDate,
        scheduleTime,
        items,
        paymentStatus,
        paymentMethod,
        depositAmount,
        notes
    } = req.body;

    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (!customerPhone || cleanPhone.length < 10) {
        return res.status(400).json({ error: 'WhatsApp obrigatório com DDD (mínimo 10 dígitos).' });
    }

    if (!customerName || customerName.trim().length < 2) {
        return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }

    if (!scheduleDate) {
        return res.status(400).json({ error: 'A data da encomenda (Sexta-feira) é obrigatória.' });
    }

    if (deliveryType === 'delivery' && (!deliveryAddress || deliveryAddress.trim().length < 3)) {
        return res.status(400).json({ error: 'Endereço de entrega é obrigatório.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Selecione pelo menos 1 trufa no cardápio.' });
    }

    const totalItems = items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + ((parseFloat(item.unitPrice) || 4.00) * (parseInt(item.quantity, 10) || 0)), 0);

    const schedules = getSchedules();

    const newSchedule = {
        id: 'sched-' + Date.now(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        cleanPhone: cleanPhone,
        deliveryType: deliveryType || 'delivery',
        deliveryAddress: deliveryAddress ? deliveryAddress.trim() : '',
        scheduleDate: scheduleDate,
        scheduleTime: scheduleTime || '15:00',
        items: items.map(i => ({
            id: i.id || `trufa-${Date.now()}`,
            flavor: i.flavor,
            quantity: parseInt(i.quantity, 10) || 1,
            unitPrice: parseFloat(i.unitPrice) || 4.00
        })),
        totalItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        depositAmount: parseFloat(depositAmount) || 0.00,
        paymentStatus: paymentStatus || 'pending',
        paymentMethod: paymentMethod || 'Pix',
        status: 'pending',
        notes: notes ? notes.trim() : '',
        sellerId: 'user-luana',
        sellerName: 'Luana Menato',
        origin: 'client_portal',
        createdAt: new Date().toISOString()
    };

    schedules.push(newSchedule);
    saveSchedules(schedules);

    // Gerar mensagem de WhatsApp para o cliente enviar
    const itemsDesc = newSchedule.items.map(i => `• ${i.quantity}x Trufa ${i.flavor} (R$ ${(i.quantity * i.unitPrice).toFixed(2).replace('.', ',')})`).join('\n');
    let dateFormatted = newSchedule.scheduleDate;
    const parts = newSchedule.scheduleDate.split('-');
    if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

    let waText = `🍫 *NOVA ENCOMENDA - TRUFAS GOURMET* 🍫\n\n`;
    waText += `Olá Luana & Fernando! Fiz uma encomenda pelo site:\n\n`;
    waText += `👤 *Cliente:* ${newSchedule.customerName}\n`;
    waText += `📱 *WhatsApp:* ${newSchedule.customerPhone}\n`;
    waText += `📅 *Data Desejada:* ${dateFormatted} às ${newSchedule.scheduleTime}\n`;
    waText += `🛵 *Tipo:* ${newSchedule.deliveryType === 'delivery' ? 'Entrega em ' + newSchedule.deliveryAddress : 'Retirada no Local'}\n\n`;
    waText += `📦 *PEDIDO:*\n${itemsDesc}\n`;
    waText += `👉 *Total de Trufas:* ${newSchedule.totalItems} un.\n`;
    waText += `💰 *Valor Total:* R$ ${newSchedule.totalAmount.toFixed(2).replace('.', ',')}\n`;
    if (newSchedule.depositAmount > 0) {
        waText += `💳 *Sinal Adiantado:* R$ ${newSchedule.depositAmount.toFixed(2).replace('.', ',')}\n`;
    }
    if (newSchedule.notes) {
        waText += `📝 *Observações:* ${newSchedule.notes}\n`;
    }
    waText += `\nPodem me confirmar por favor? Muito obrigado(a)! ✨`;

    console.log(`[PORTAL CLIENTE] Nova encomenda recebida de ${newSchedule.customerName} (${newSchedule.totalItems} trufas)`);

    res.status(201).json({
        success: true,
        schedule: newSchedule,
        message: 'Sua encomenda foi registrada com sucesso!',
        whatsappMessageText: waText
    });
});

// Consultar encomendas anteriores do cliente pelo WhatsApp
app.get('/api/client/orders/:phone', (req, res) => {
    const { phone } = req.params;
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
        return res.status(400).json({ error: 'Número de WhatsApp inválido.' });
    }

    const schedules = getSchedules();
    const clientOrders = schedules.filter(s => {
        const sPhone = (s.cleanPhone || s.customerPhone || '').replace(/\D/g, '');
        return sPhone.endsWith(cleanPhone) || cleanPhone.endsWith(sPhone);
    });

    const clientName = clientOrders.length > 0 ? clientOrders[clientOrders.length - 1].customerName : '';

    res.json({
        success: true,
        clientName,
        totalOrders: clientOrders.length,
        orders: clientOrders
    });
});

// Zerar / Limpar Dados do Sistema (Admin)
app.post('/api/admin/reset-all-data', authenticateUser, (req, res) => {
    const { target } = req.body; // 'all' | 'products' | 'orders' | 'transfers' | 'notes' | 'schedules'

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas o administrador pode zerar os dados do sistema.' });
    }

    if (target === 'products' || target === 'all') {
        saveProducts([]);
        console.log('[RESET] Catálogo de produtos zerado.');
    }

    if (target === 'orders' || target === 'all') {
        saveOrders([]);
        console.log('[RESET] Histórico de pedidos zerado.');
    }

    if (target === 'transfers' || target === 'all') {
        saveTransfers([]);
        console.log('[RESET] Histórico de transferências zerado.');
    }

    if (target === 'notes' || target === 'all') {
        saveNotes([]);
        console.log('[RESET] Caderno de anotações zerado.');
    }

    if (target === 'schedules' || target === 'all') {
        saveSchedules([]);
        console.log('[RESET] Agendamentos de pedidos zerados.');
    }

    res.json({
        success: true,
        message: target === 'all' 
            ? 'Todos os dados (produtos, pedidos, transferências, anotações e agendamentos) foram zerados com sucesso!' 
            : `Dados de ${target} zerados com sucesso!`
    });
});

// Fallback de rotas antigas
app.post('/create-payment', async (req, res) => {
    return app._router.handle({ ...req, url: '/api/create-pix', method: 'POST' }, res);
});

app.get('/check-payment/:id', (req, res) => {
    const { id } = req.params;
    res.redirect(`/api/check-payment/${id}`);
});

function startServer(p) {
    const srv = app.listen(p, () => {
        console.log(`🍫 Servidor Trufas Luana & Fernando rodando em http://localhost:${p}`);
    });
    srv.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const nextP = Number(p) + 1;
            console.log(`⚠️ Porta ${p} em uso. Tentando porta ${nextP}...`);
            startServer(nextP);
        } else {
            console.error('Erro no servidor:', err);
        }
    });
}

startServer(port);
