// admin.js - Админ-панель для GitHub Pages
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc5RyRZefzGEWq_GCg2QM6Bh0uZYvsisptM2hEtQnrKpvn3GFdgbSiN4vXLlzRQaXC/exec";
const ADMIN_PASSWORD = "autoservice2024";

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('adminAuthenticated') === 'true') {
        showControlPanel();
    }
});

// Функция входа
async function login() {
    const password = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (!password) {
        errorElement.textContent = 'Пожалуйста, введите пароль';
        errorElement.style.display = 'block';
        return;
    }
    
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('adminAuthenticated', 'true');
        showControlPanel();
    } else {
        errorElement.textContent = 'Неверный пароль';
        errorElement.style.display = 'block';
    }
}

// Показать панель управления
function showControlPanel() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('controlPanel').style.display = 'block';
    loadBookingStatus();
    loadRecentBookings();
}

// Загрузка статуса записи
async function loadBookingStatus() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookingStatus`);
        const data = await response.json();
        
        if (data.result === 'success') {
            updateStatusDisplay(data.isActive);
        }
    } catch (error) {
        console.error('Error loading status:', error);
        document.getElementById('statusValue').innerHTML = 
            '<span class="status-paused">Ошибка загрузки</span>';
    }
}

// Обновление отображения статуса
function updateStatusDisplay(isActive) {
    const statusElement = document.getElementById('statusValue');
    const statusPanel = document.getElementById('statusPanel');
            
    if (isActive) {
        statusElement.innerHTML = '<span class="status-active">ЗАПИСЬ АКТИВНА</span>';
        statusPanel.className = 'status-panel';
    } else {
        statusElement.innerHTML = '<span class="status-paused">ЗАПИСЬ ПРИОСТАНОВЛЕНА</span>';
        statusPanel.className = 'status-panel paused';
    }
}

// Переключение статуса записи
async function toggleBooking(status) {
    const successElement = document.getElementById('successMessage');
    const errorElement = document.getElementById('errorMessage');
    
    successElement.style.display = 'none';
    errorElement.style.display = 'none';
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'toggleBooking',
                status: status
            })
        });
        
        const data = await response.json();
        
        if (data.result === 'success') {
            successElement.textContent = data.message;
            successElement.style.display = 'block';
            loadBookingStatus();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        errorElement.textContent = 'Ошибка: ' + error.message;
        errorElement.style.display = 'block';
    }
}

// Загрузка последних записей
async function loadRecentBookings() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getRecentBookings`);
        const data = await response.json();
        
        if (data.result === 'success' && data.bookings) {
            displayBookings(data.bookings);
        } else {
            displayDemoBookings();
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        displayDemoBookings();
    }
}

// Отображение списка записей
function displayBookings(bookings) {
    const container = document.getElementById('recentBookings');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<div class="no-bookings">Нет последних записей</div>';
        return;
    }

    container.innerHTML = bookings.map(booking => `
        <div class="booking-item">
            <div class="booking-meta">
                <span>${booking.date || 'Дата не указана'}</span>
                <span>${booking.time || 'Время не указано'}</span>
            </div>
            <div class="booking-name">${booking.name || 'Имя не указано'}</div>
            <div class="booking-details">
                <div><strong>Телефон:</strong> ${booking.phone || 'Не указан'}</div>
                <div><strong>Услуга:</strong> ${booking.service || 'Не указана'}</div>
                <div><strong>Автомобиль:</strong> ${booking.carModel || 'Не указана'}</div>
            </div>
        </div>
    `).join('');
}

// Демо-записи при ошибке
function displayDemoBookings() {
    const container = document.getElementById('recentBookings');
    container.innerHTML = `
        <div class="booking-item">
            <div class="booking-meta">
                <span>Сегодня</span>
                <span>14:30</span>
            </div>
            <div class="booking-name">Иван Петров</div>
            <div class="booking-details">
                <div><strong>Телефон:</strong> +7 (999) 123-45-67</div>
                <div><strong>Услуга:</strong> Замена масла</div>
                <div><strong>Автомобиль:</strong> Toyota Camry</div>
            </div>
        </div>
    `;
}

// Выход из системы
function logout() {
    localStorage.removeItem('adminAuthenticated');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('controlPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

// Обработка нажатия Enter в поле пароля
document.getElementById('adminPassword')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});
