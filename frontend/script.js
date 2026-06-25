// ===== КОНФИГУРАЦИЯ =====
const API_BASE = 'http://localhost:8000';

// ===== СОСТОЯНИЕ =====
let currentUserId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
let currentUsername = localStorage.getItem('username') || null;
let currentTab = 'orders';

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
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const navBtns = document.querySelectorAll('.nav-btn');

    if (currentUserId) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        navBtns.forEach(btn => btn.style.display = 'inline-block');
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        navBtns.forEach(btn => {
            if (btn.dataset.tab === 'orders') {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none';
            }
        });
        // Переключиться на вкладку заказов
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
        container.innerHTML = orders.map(order => renderOrderCard(order)).join('');
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
        container.innerHTML = myOrders.map(order => renderOrderCard(order)).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
    }
}

function renderOrderCard(order) {
    const statusClass = 'status-' + order.status;
    const statusText = getStatusText(order.status);
    const budget = order.budget ? order.budget.toLocaleString() + ' ₽' : '—';
    const description = order.description || 'Описание отсутствует';
    
    return `
        <div class="order-card" onclick="openOrderDetails(${order.id})">
            <h3>${escapeHtml(order.title)}</h3>
            <div class="description">${escapeHtml(description)}</div>
            <div class="meta">
                <span class="budget">${budget}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="author">👤 Автор: ID ${order.author_id}</div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        const canTake = currentUserId && order.status === 'open' && !isAuthor;
        
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
                <span class="detail-value">ID ${order.author_id}</span>
            </div>
            ${order.assigned_freelancer_id ? `
                <div class="detail-row">
                    <span class="detail-label">👨‍💻 Исполнитель</span>
                    <span class="detail-value">ID ${order.assigned_freelancer_id}</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-label">📅 Создан</span>
                <span class="detail-value">${formatDate(order.created_at)}</span>
            </div>
            <div class="action-buttons">
                ${isAuthor ? `
                    <button onclick="updateOrderStatus(${order.id}, 'in_progress')" class="btn btn-primary" ${order.status === 'closed' ? 'disabled' : ''}>Взять в работу</button>
                    <button onclick="updateOrderStatus(${order.id}, 'closed')" class="btn btn-success" ${order.status === 'closed' ? 'disabled' : ''}>Завершить</button>
                    <button onclick="deleteOrder(${order.id})" class="btn btn-danger">Удалить</button>
                ` : ''}
                ${canTake ? `
                    <button onclick="takeOrder(${order.id})" class="btn btn-success">📥 Взять заказ</button>
                ` : ''}
                ${!isAuthor && currentUserId ? `
                    <button onclick="showResponseForm(${order.id})" class="btn btn-outline">💬 Откликнуться</button>
                ` : ''}
                ${!currentUserId ? `
                    <p style="color: #636e72;">Войдите, чтобы взаимодействовать с заказом</p>
                ` : ''}
            </div>
            <div id="responseArea" style="margin-top:20px;"></div>
        `;
    } catch (error) {
        details.innerHTML = '<p style="color: red;">❌ ' + error.message + '</p>';
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
        <h4>Оставить отклик</h4>
        <div class="form-group">
            <textarea id="responseText" rows="3" placeholder="Почему вы подходите для этого заказа?" style="width:100%;padding:10px;border:2px solid #e0e0e0;border-radius:8px;"></textarea>
        </div>
        <button onclick="sendResponse(${orderId})" class="btn btn-primary">Отправить отклик</button>
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
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Показать нужную
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
    // Обновить кнопки
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    // Загрузить данные
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

// ===== АВТОРИЗАЦИЯ В МОДАЛКЕ =====
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
            <div class="auth-switch">
                Нет аккаунта? <a onclick="showRegisterForm()">Зарегистрироваться</a>
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
            <div class="auth-switch">
                Уже есть аккаунт? <a onclick="showLoginForm()">Войти</a>
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
document.getElementById('registerBtn').addEventListener('click', openAuthModal);
document.getElementById('logoutBtn').addEventListener('click', logout);

// Загрузка при старте
updateAuthUI();
loadOrders();

console.log('🚀 Student Freelance Exchange загружен!');
console.log('📌 API Base:', API_BASE);
console.log('👤 Текущий пользователь:', currentUserId || 'Не авторизован');