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

// Garantir diretório e arquivos de dados
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers de Banco de Dados JSON
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

function getProducts() {
    try {
        if (!fs.existsSync(PRODUCTS_FILE)) return [];
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch (e) {
        console.error('Erro ao ler products.json:', e);
        return [];
    }
}

function saveProducts(products) {
    try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
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
app.use(express.static('public'));

// Gerenciamento de Sessão / Tokens Simples
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

// Middleware de Autenticação
function authenticateUser(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
    
    // Suporte ao token legado mestre
    if (authHeader === 'token_trufas_secret_admin_2026') {
        req.user = { id: 'user-fernando', name: 'Fernando', username: 'fernando', role: 'admin', avatar: '👑' };
        return next();
    }

    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
    if (token && activeSessions.has(token)) {
        req.user = activeSessions.get(token);
        return next();
    }

    return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
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

// Listar produtos para o painel de quem está logado
app.get('/api/admin/products', authenticateUser, (req, res) => {
    const { sellerId } = req.query;
    let products = getProducts();

    // Se for admin e não especificou sellerId, traz todos. Se for vendedor, traz só os dele.
    if (req.user.role !== 'admin') {
        products = products.filter(p => p.sellerId === req.user.id);
    } else if (sellerId && sellerId !== 'all') {
        products = products.filter(p => p.sellerId === sellerId);
    }

    res.json(products);
});

// Cadastrar nova trufa vinculada ao vendedor logado
app.post('/api/admin/products', authenticateUser, (req, res) => {
    const { flavor, price, weight, size, stock, category, description, icon, sellerId } = req.body;

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

    console.log(`[PRODUTOS] Nova trufa: "${newProduct.flavor}" adicionada ao estoque de ${assignedSellerName}`);
    res.status(201).json({ success: true, product: newProduct });
});

// Editar trufa
app.put('/api/admin/products/:id', authenticateUser, (req, res) => {
    const { id } = req.params;
    const { flavor, price, weight, size, stock, category, description, icon, active, sellerId } = req.body;

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
// CHECKOUT PIX & PEDIDOS
// ==========================================

// Criar Pedido Pix
app.post('/api/create-pix', async (req, res) => {
    const { items, customerName, customerEmail, customerPhone, cpf } = req.body;

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

    const orderId = `TRUFA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const itemsDescription = orderItems.map(i => `${i.quantity}x ${i.flavor}`).join(', ');
    const description = `Trufas (${totalQty} un): ${itemsDescription}`.slice(0, 120);

    try {
        let qrCode = '';
        let qrCodeBase64 = '';
        let mpPaymentId = '';
        let status = 'pending';

        if (paymentClient) {
            const mpBody = {
                transaction_amount: Number(calculatedTotal.toFixed(2)),
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
            qrCode = `00020126580014br.gov.bcb.pix0136pix-trufas-${orderId}520400005303986540${calculatedTotal.toFixed(2)}5802BR5925TRUFAS GOURMET6009SAO PAULO62070503***6304`;
            status = 'pending';
        }

        const newOrder = {
            id: orderId,
            paymentId: mpPaymentId,
            customerName: customerName || 'Cliente Balcão',
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
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
            totalQuantity: totalQty,
            items: orderItems
        });

    } catch (error) {
        console.error('[PIX] Erro ao criar pagamento:', error);
        res.status(500).json({ error: 'Erro ao gerar Pix no Mercado Pago', details: error.message });
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

// Aprovação Manual (Admin / Vendedor)
app.post('/api/admin/orders/:id/approve-manual', authenticateUser, (req, res) => {
    const { id } = req.params;
    const orders = getOrders();
    const order = orders.find(o => o.id === id || o.paymentId === id);

    if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    order.status = 'approved';
    order.paidAt = new Date().toISOString();
    deductStockForOrder(order);
    saveOrders(orders);

    res.json({ success: true, message: 'Pedido aprovado manualmente e estoque baixado!', order });
});

// Estatísticas e Relatórios (Separados por Vendedor ou Geral)
app.get('/api/admin/stats', authenticateUser, (req, res) => {
    const orders = getOrders();
    const products = getProducts();
    const { sellerId } = req.query;

    const targetSellerId = (req.user.role === 'admin' && sellerId && sellerId !== 'all') 
        ? sellerId 
        : (req.user.role !== 'admin' ? req.user.id : null);

    const approvedOrders = orders.filter(o => o.status === 'approved');

    let totalRevenue = 0;
    let totalTrufflesSold = 0;
    const flavorCounts = {};

    for (const order of approvedOrders) {
        for (const item of order.items || []) {
            if (!targetSellerId || item.sellerId === targetSellerId) {
                totalRevenue += (Number(item.subtotal) || (item.unitPrice * item.quantity));
                totalTrufflesSold += Number(item.quantity);
                flavorCounts[item.flavor] = (flavorCounts[item.flavor] || 0) + Number(item.quantity);
            }
        }
    }

    const topFlavors = Object.entries(flavorCounts)
        .map(([flavor, count]) => ({ flavor, count }))
        .sort((a, b) => b.count - a.count);

    const filteredProducts = targetSellerId 
        ? products.filter(p => p.active !== false && p.sellerId === targetSellerId)
        : products.filter(p => p.active !== false);

    const lowStockAlerts = filteredProducts.filter(p => p.stock <= 3);
    const totalCurrentStock = filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0);

    res.json({
        totalRevenue,
        totalTrufflesSold,
        totalApprovedOrders: approvedOrders.length,
        totalCurrentStock,
        topFlavors,
        lowStockAlerts,
        productsCount: filteredProducts.length,
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

// Fallback de rotas antigas
app.post('/create-payment', async (req, res) => {
    return app._router.handle({ ...req, url: '/api/create-pix', method: 'POST' }, res);
});

app.get('/check-payment/:id', (req, res) => {
    const { id } = req.params;
    res.redirect(`/api/check-payment/${id}`);
});

app.listen(port, () => {
    console.log(`🍫 Servidor Trufas Luana & Fernando rodando em http://localhost:${port}`);
});
