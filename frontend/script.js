// ===== КОНФИГУРАЦИЯ =====
const API_BASE = 'http://localhost:8000';

// ===== СОСТОЯНИЕ =====
let currentUserId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
let currentUsername = localStorage.getItem('username') || null;
let currentTab = 'orders';
let usersCache = {};

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (currentUserId) {
        headers['X-User-ID'] = currentUserId;
    }
    return headers;
}

function showError(message) {
    alert('❌ Ошибка: ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusText(status) {
    const map = {
        'open': 'Открыт',
        'in_progress': 'В работе',
        'closed': 'Завершён'
    };
    return map[status] || status;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== API ЗАПРОСЫ =====
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: getHeaders(),
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.detail || 'Ошибка запроса');
        }
        return data;
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Сервер не отвечает. Проверьте, запущен ли бэкенд на port 8000');
        }
        throw error;
    }
}

// ===== АВТОРИЗАЦИЯ =====
async function login(username, password) {
    try {
        const data = await apiRequest('/auth/login', 'POST', { username, password });
        currentUserId = data.user_id;
        currentUsername = data.username;
        localStorage.setItem('userId', currentUserId);
        localStorage.setItem('username', currentUsername);
        usersCache[currentUserId] = currentUsername;
        updateAuthUI();
        showSuccess('Добро пожаловать, ' + currentUsername + '!');
        closeAuthModal();
        loadOrders();
        loadMyOrders();
        loadProfile();
        return true;
    } catch (error) {
        showError(error.message);
        return false;
    }
}

async function register(username, email, password) {
    try {
        await apiRequest('/auth/register', 'POST', { username, email, password });
        showSuccess('Регистрация успешна! Теперь войдите.');
        showLoginForm();
        return true;
    } catch (error) {
        showError(error.message);
        return false;
    }
}

function logout() {
    currentUserId = null;
    currentUsername = null;
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    updateAuthUI();
    loadOrders();
    document.getElementById('myOrdersList').innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Войдите, чтобы увидеть свои заказы</p></div>';
    document.getElementById('profileInfo').innerHTML = '<p>Войдите, чтобы увидеть профиль</p>';
    showSuccess('Вы вышли из системы');
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const navBtns = document.querySelectorAll('.nav-btn');

    if (currentUserId) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        navBtns.forEach(btn => btn.style.display = 'inline-block');
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        navBtns.forEach(btn => {
            if (btn.dataset.tab === 'orders') {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        });
        switchTab('orders');
    }
}

// ===== ЗАКАЗЫ =====
async function loadOrders(status = '', limit = 10) {
    const container = document.getElementById('ordersList');
    container.innerHTML = '<p>Загрузка...</p>';
    try {
        let url = '/orders';
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (limit) params.append('limit', limit);
        if (params.toString()) url += '?' + params.toString();
        
        const orders = await apiRequest(url);
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Заказов пока нет</p></div>';
            return;
        }
        
        container.innerHTML = (await Promise.all(orders.map(order => renderOrderCard(order)))).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
    }
}

async function loadMyOrders() {
    const container = document.getElementById('myOrdersList');
    if (!currentUserId) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Войдите, чтобы увидеть свои заказы</p></div>';
        return;
    }
    container.innerHTML = '<p>Загрузка...</p>';
    try {
        const orders = await apiRequest('/orders');
        const myOrders = orders.filter(o => o.author_id === currentUserId);
        if (myOrders.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>Вы ещё не создали ни одного заказа</p></div>';
            return;
        }
        container.innerHTML = (await Promise.all(myOrders.map(order => renderOrderCard(order)))).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
    }
}

async function renderOrderCard(order) {
    const statusClass = 'status-' + order.status;
    const statusText = getStatusText(order.status);
    const budget = order.budget ? order.budget.toLocaleString() + ' ₽' : '—';
    const description = order.description || 'Описание отсутствует';
    const authorName = usersCache[order.author_id] || ('ID ' + order.author_id);
    
    return `
        <div class="order-card" onclick="openOrderDetails(${order.id})">
            <h3>${escapeHtml(order.title)}</h3>
            <div class="description">${escapeHtml(description)}</div>
            <div class="meta">
                <span class="budget">${budget}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="author">👤 Автор: ${escapeHtml(authorName)}</div>
        </div>
    `;
}

// ===== ДЕТАЛИ ЗАКАЗА =====
async function openOrderDetails(orderId) {
    const modal = document.getElementById('orderModal');
    const details = document.getElementById('orderDetails');
    modal.style.display = 'block';
    details.innerHTML = '<p>Загрузка...</p>';
    
    try {
        const order = await apiRequest(`/orders/${orderId}`);
        const isAuthor = currentUserId === order.author_id;
        const isClosed = order.status === 'closed';
        const canTake = currentUserId && order.status === 'open' && !isAuthor;
        const authorName = usersCache[order.author_id] || ('ID ' + order.author_id);
        const freelancerName = order.assigned_freelancer_id 
            ? (usersCache[order.assigned_freelancer_id] || ('ID ' + order.assigned_freelancer_id))
            : '—';
        
        details.innerHTML = `
            <h2>${escapeHtml(order.title)}</h2>
            <div class="detail-row">
                <span class="detail-label">📝 Описание</span>
                <span class="detail-value">${escapeHtml(order.description || '—')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">💰 Бюджет</span>
                <span class="detail-value">${order.budget ? order.budget.toLocaleString() + ' ₽' : '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">📊 Статус</span>
                <span class="detail-value"><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">👤 Автор</span>
                <span class="detail-value">${escapeHtml(authorName)}</span>
            </div>
            ${order.assigned_freelancer_id ? `
                <div class="detail-row">
                    <span class="detail-label">👨‍💻 Исполнитель</span>
                    <span class="detail-value">${escapeHtml(freelancerName)}</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-label">📅 Создан</span>
                <span class="detail-value">${formatDate(order.created_at)}</span>
            </div>
            <div class="action-buttons">
                ${isAuthor && !isClosed ? `
                    <button onclick="viewResponses(${order.id})" class="btn btn-warning">📨 Посмотреть отклики</button>
                    <button onclick="updateOrderStatus(${order.id}, 'closed')" class="btn btn-success">✅ Завершить</button>
                    <button onclick="deleteOrder(${order.id})" class="btn btn-danger">🗑️ Удалить</button>
                ` : ''}
                ${isAuthor && isClosed ? `
                    <p style="color: #2ecc71; font-weight: 600;">✅ Заказ завершён</p>
                ` : ''}
                ${canTake ? `
                    <button onclick="takeOrder(${order.id})" class="btn btn-success">📥 Взять заказ</button>
                ` : ''}
                ${!isAuthor && currentUserId && !isClosed ? `
                    <button onclick="showResponseForm(${order.id})" class="btn btn-outline">💬 Откликнуться</button>
                ` : ''}
                ${isClosed && !isAuthor ? `
                    <p style="color: #636e72;">🔒 Заказ завершён, отклики недоступны</p>
                ` : ''}
                ${!currentUserId ? `
                    <p style="color: #636e72;">🔒 Войдите, чтобы взаимодействовать с заказом</p>
                ` : ''}
            </div>
            <div id="responseArea" style="margin-top:20px;"></div>
        `;
    } catch (error) {
        details.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
    }
}

// ===== ОТКЛИКИ =====
async function viewResponses(orderId) {
    const modal = document.getElementById('responsesModal');
    const container = document.getElementById('responsesList');
    modal.style.display = 'block';
    container.innerHTML = '<p>Загрузка...</p>';
    
    try {
        const responses = await apiRequest(`/orders/${orderId}/responses`);
        if (!responses || responses.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><p>Откликов пока нет</p></div>';
            return;
        }
        
        let html = '<h2>📨 Отклики на заказ</h2>';
        for (const resp of responses) {
            const freelancerName = usersCache[resp.freelancer_id] || ('ID ' + resp.freelancer_id);
            html += `
                <div class="response-item">
                    <div class="response-author">👤 ${escapeHtml(freelancerName)}</div>
                    <div class="response-text">${escapeHtml(resp.text)}</div>
                    <div class="response-actions">
                        <button onclick="assignFreelancer(${resp.order_id}, ${resp.freelancer_id})" class="btn btn-success btn-sm">✅ Назначить исполнителем</button>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
    }
}

async function assignFreelancer(orderId, freelancerId) {
    if (!confirm('Назначить этого фрилансера исполнителем?')) return;
    try {
        await apiRequest(`/orders/${orderId}`, 'PATCH', {
            status: 'in_progress',
            assigned_freelancer_id: freelancerId
        });
        showSuccess('Исполнитель назначен!');
        closeModal('responsesModal');
        closeModal('orderModal');
        loadOrders();
        loadMyOrders();
    } catch (error) {
        showError(error.message);
    }
}

// ===== ДЕЙСТВИЯ С ЗАКАЗАМИ =====
async function updateOrderStatus(orderId, status) {
    if (!confirm(`Изменить статус заказа на "${getStatusText(status)}"?`)) return;
    try {
        await apiRequest(`/orders/${orderId}`, 'PATCH', { status });
        showSuccess('Статус обновлён!');
        closeModal('orderModal');
        loadOrders();
        loadMyOrders();
    } catch (error) {
        showError(error.message);
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Удалить заказ безвозвратно?')) return;
    try {
        await apiRequest(`/orders/${orderId}`, 'DELETE');
        showSuccess('Заказ удалён');
        closeModal('orderModal');
        loadOrders();
        loadMyOrders();
    } catch (error) {
        showError(error.message);
    }
}

async function takeOrder(orderId) {
    if (!confirm('Взять этот заказ в работу?')) return;
    try {
        await apiRequest(`/orders/${orderId}`, 'PATCH', {
            status: 'in_progress',
            assigned_freelancer_id: currentUserId
        });
        showSuccess('Вы взяли заказ в работу!');
        closeModal('orderModal');
        loadOrders();
        loadMyOrders();
    } catch (error) {
        showError(error.message);
    }
}

async function showResponseForm(orderId) {
    const area = document.getElementById('responseArea');
    area.innerHTML = `
        <h4>💬 Оставить отклик</h4>
        <div class="form-group">
            <textarea id="responseText" rows="3" placeholder="Почему вы подходите для этого заказа?" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;"></textarea>
        </div>
        <button onclick="sendResponse(${orderId})" class="btn btn-primary">📤 Отправить отклик</button>
    `;
}

async function sendResponse(orderId) {
    const text = document.getElementById('responseText').value.trim();
    if (!text) {
        showError('Напишите текст отклика');
        return;
    }
    try {
        await apiRequest(`/orders/${orderId}/responses`, 'POST', {
            freelancer_id: currentUserId,
            text: text
        });
        showSuccess('Отклик отправлен!');
        document.getElementById('responseArea').innerHTML = '<p style="color: #2ecc71;">✅ Ваш отклик отправлен</p>';
    } catch (error) {
        showError(error.message);
    }
}

// ===== СОЗДАНИЕ ЗАКАЗА =====
document.getElementById('createOrderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentUserId) {
        showError('Войдите, чтобы создать заказ');
        return;
    }
    const title = document.getElementById('orderTitle').value.trim();
    const description = document.getElementById('orderDescription').value.trim();
    const budget = parseFloat(document.getElementById('orderBudget').value);
    
    if (!title || !budget || budget <= 0) {
        showError('Заполните все обязательные поля');
        return;
    }
    
    try {
        await apiRequest('/orders', 'POST', { title, description, budget });
        showSuccess('Заказ создан!');
        this.reset();
        switchTab('orders');
        loadOrders();
        loadMyOrders();
    } catch (error) {
        showError(error.message);
    }
});

// ===== ПРОФИЛЬ =====
async function loadProfile() {
    const container = document.getElementById('profileInfo');
    if (!currentUserId) {
        container.innerHTML = '<p>🔒 Войдите, чтобы увидеть профиль</p>';
        return;
    }
    try {
        const user = await apiRequest('/auth/users/me');
        usersCache[user.id] = user.username;
        container.innerHTML = `
            <p><strong>👤 Имя:</strong> ${escapeHtml(user.username)}</p>
            <p><strong>📧 Email:</strong> ${escapeHtml(user.email)}</p>
            <p><strong>🆔 ID:</strong> ${user.id}</p>
            <p><strong>📅 Регистрация:</strong> ${formatDate(user.created_at)}</p>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
    }
}

// ===== НАВИГАЦИЯ =====
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    if (tabId === 'orders') loadOrders();
    if (tabId === 'my-orders') loadMyOrders();
    if (tabId === 'profile') loadProfile();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
    });
});

// ===== ФИЛЬТРЫ =====
document.getElementById('applyFilters').addEventListener('click', function() {
    const status = document.getElementById('statusFilter').value;
    const limit = document.getElementById('limitFilter').value || 10;
    loadOrders(status, parseInt(limit));
});

// ===== МОДАЛЬНЫЕ ОКНА =====
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.modal .close').forEach(el => {
    el.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ===== АВТОРИЗАЦИЯ =====
function openAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    showLoginForm();
}

function showLoginForm() {
    const container = document.getElementById('authForms');
    container.innerHTML = `
        <div class="auth-form">
            <h2>🔐 Вход</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label>Имя пользователя</label>
                    <input type="text" id="loginUsername" required placeholder="Введите имя">
                </div>
                <div class="form-group">
                    <label>Пароль</label>
                    <input type="password" id="loginPassword" required placeholder="Введите пароль">
                </div>
                <button type="submit" class="btn btn-primary">Войти</button>
            </form>
            <div style="text-align: center; margin-top: 15px;">
                <p style="color: #636e72; margin-bottom: 10px;">Нет аккаунта?</p>
                <button onclick="showRegisterForm()" class="btn btn-secondary" style="width: 100%;">Зарегистрироваться</button>
            </div>
        </div>
    `;
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        if (username && password) {
            await login(username, password);
        } else {
            showError('Заполните все поля');
        }
    });
}

function showRegisterForm() {
    const container = document.getElementById('authForms');
    container.innerHTML = `
        <div class="auth-form">
            <h2>📝 Регистрация</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label>Имя пользователя</label>
                    <input type="text" id="regUsername" required placeholder="Придумайте имя">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="regEmail" required placeholder="example@mail.ru">
                </div>
                <div class="form-group">
                    <label>Пароль (мин. 6 символов)</label>
                    <input type="password" id="regPassword" required minlength="6" placeholder="Придумайте пароль">
                </div>
                <button type="submit" class="btn btn-success">Зарегистрироваться</button>
            </form>
            <div style="text-align: center; margin-top: 15px;">
                <p style="color: #636e72; margin-bottom: 10px;">Уже есть аккаунт?</p>
                <button onclick="showLoginForm()" class="btn btn-primary" style="width: 100%;">Войти</button>
            </div>
        </div>
    `;
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        if (username && email && password) {
            await register(username, email, password);
        } else {
            showError('Заполните все поля');
        }
    });
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.getElementById('loginBtn').addEventListener('click', openAuthModal);
document.getElementById('logoutBtn').addEventListener('click', logout);

updateAuthUI();
loadOrders();

console.log('🚀 Student Freelance Exchange загружен!');