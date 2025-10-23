// Конфигурация для Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5EvyWDQMwsM1kWLuTx74ec4rKE8LLVveYEVOqfKHvWtSW3GvLiu5BNwOQE0IWXPVb/exec";

// DOM элементы
const form = document.getElementById('bookingForm');
const phoneInput = document.getElementById('phone');
const successMessage = document.getElementById('successMessage');
const bookingDisabledMessage = document.getElementById('bookingDisabledMessage');
const submitButton = form.querySelector('button[type="submit"]');

// Переменные состояния
let currentWeek = 0;
let selectedDate = null;
let selectedTime = null;
let isBookingActive = true;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeDateSelector();
    loadBookingStatus();
    setupEventListeners();
    hideTimeSelection();
});

// Инициализация выбора даты
function initializeDateSelector() {
    updateWeekNavigation();
    renderDates();
    setupWeekNavigation();
}

// Настройка навигации по неделям
function setupWeekNavigation() {
    document.getElementById('prevWeekBtn').addEventListener('click', function() {
        if (currentWeek > 0) {
            currentWeek--;
            updateWeekNavigation();
            renderDates();
            hideTimeSelection();
        }
    });

    document.getElementById('nextWeekBtn').addEventListener('click', function() {
        if (currentWeek < 3) {
            currentWeek++;
            updateWeekNavigation();
            renderDates();
            hideTimeSelection();
        }
    });
}

// Скрыть выбор времени
function hideTimeSelection() {
    const timeSelection = document.getElementById('timeSelection');
    timeSelection.style.display = 'none';
    selectedTime = null;
    document.getElementById('selectedTime').value = '';
    
    document.querySelectorAll('.time-slot').forEach(el => {
        el.classList.remove('selected');
    });
}

// Обновление навигации по неделям
function updateWeekNavigation() {
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    const weekDisplay = document.getElementById('weekDisplay');
    
    prevBtn.disabled = currentWeek === 0;
    nextBtn.disabled = currentWeek === 3;
    
    const startDate = getWeekStartDate();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    weekDisplay.textContent = `Неделя ${currentWeek + 1} (${formatDate(startDate)} - ${formatDate(endDate)})`;
}

// Получение даты начала недели
function getWeekStartDate() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (currentWeek * 7));
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    return startDate;
}

// Рендер дат на неделю
function renderDates() {
    const datesContainer = document.getElementById('datesContainer');
    const startDate = getWeekStartDate();
    
    datesContainer.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateElement = createDateElement(date);
        datesContainer.appendChild(dateElement);
    }
}

// Создание элемента даты
function createDateElement(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateElement = document.createElement('div');
    dateElement.className = 'date-option';
    
    if (date < today) {
        dateElement.classList.add('disabled');
    }
    
    dateElement.innerHTML = `
        <div class="date-day">${getDayName(date)}</div>
        <div class="date-number">${date.getDate()}</div>
        <div class="date-month">${getMonthName(date)}</div>
    `;
    
    if (date >= today) {
        dateElement.addEventListener('click', function() {
            selectDate(date, dateElement);
        });
    }
    
    return dateElement;
}

// Выбор даты
function selectDate(date, element) {
    document.querySelectorAll('.date-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedDate = date;
    document.getElementById('selectedDate').value = formatDateForStorage(date);
    
    showTimeSelection();
    loadAvailableTimeSlots(date);
    hideError(null, 'dateError');
}

// Показать выбор времени
function showTimeSelection() {
    const timeSelection = document.getElementById('timeSelection');
    timeSelection.style.display = 'block';
    
    setTimeout(() => {
        timeSelection.style.opacity = '1';
        timeSelection.style.transform = 'translateY(0)';
    }, 10);
}

// Загрузка доступных слотов времени из Google Таблиц
function loadAvailableTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '<div class="loading-time" style="text-align: center; padding: 20px; color: #666;">Загрузка доступного времени...</div>';
    
    const dateString = formatDateForStorage(date);
    
    fetch(`${GOOGLE_SCRIPT_URL}?action=getAvailableSlots&date=${dateString}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error');
            }
            return response.json();
        })
        .then(data => {
            console.log('Данные от сервера:', data);
            if (data.result === 'success' && data.availableSlots) {
                // Получаем ВСЕ возможные слоты и отмечаем занятые
                const allSlots = generateAllTimeSlots();
                const availableSlots = data.availableSlots;
                renderTimeSlotsWithOccupied(allSlots, availableSlots, timeSlotsContainer);
            } else {
                throw new Error('No available slots data');
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки времени:', error);
            timeSlotsContainer.innerHTML = '<div class="error-time" style="text-align: center; padding: 20px; color: #dc3545;">Ошибка загрузки времени. Пожалуйста, обновите страницу.</div>';
        });
}

// Генерация всех возможных слотов времени
function generateAllTimeSlots() {
    const slots = [];
    const startHour = 9;
    const endHour = 20;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(timeString);
        }
    }
    return slots;
}

// Рендер слотов времени с отметкой занятых
function renderTimeSlotsWithOccupied(allSlots, availableSlots, container) {
    console.log('Все слоты:', allSlots);
    console.log('Доступные слоты:', availableSlots);
    
    if (!allSlots || allSlots.length === 0) {
        container.innerHTML = '<div class="no-slots" style="text-align: center; padding: 20px; color: #666;">Нет доступного времени</div>';
        return;
    }
    
    container.innerHTML = '';
    
    allSlots.forEach(slot => {
        const timeElement = document.createElement('div');
        const isAvailable = availableSlots.includes(slot);
        
        if (isAvailable) {
            // Доступный слот
            timeElement.className = 'time-slot';
            timeElement.textContent = slot;
            timeElement.addEventListener('click', function() {
                selectTime(slot, timeElement);
            });
        } else {
            // Занятый слот
            timeElement.className = 'time-slot occupied';
            timeElement.innerHTML = `
                ${slot}
                <div style="font-size: 0.7rem; margin-top: 2px; opacity: 0.8;">Занято</div>
            `;
            // Убираем возможность клика на занятые слоты
            timeElement.style.cursor = 'not-allowed';
        }
        
        container.appendChild(timeElement);
    });
}

// Выбор времени
function selectTime(time, element) {
    // Проверяем, не занят ли слот
    if (element.classList.contains('occupied')) {
        alert('Это время уже занято. Пожалуйста, выберите другое время.');
        return;
    }
    
    document.querySelectorAll('.time-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedTime = time;
    document.getElementById('selectedTime').value = time;
    hideError(null, 'timeError');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Маска для телефона
    phoneInput.addEventListener('input', function(e) {
        const x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
        if (x) {
            e.target.value = '+7' + (x[2] ? ' (' + x[2] : '') + (x[3] ? ') ' + x[3] : '') + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
        }
    });

    // Обработчик отправки формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!isBookingActive) {
            alert('Запись временно приостановлена. Пожалуйста, попробуйте позже или свяжитесь с нами по телефону.');
            return;
        }
        
        if (!validateForm()) {
            return;
        }

        submitForm();
    });

    // Дополнительная валидация при изменении полей
    form.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('blur', function() {
            validateForm();
        });
    });

    // Обработчик для кнопки согласия
    document.getElementById('agree').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('agreeError').style.display = 'none';
        }
    });
}

// Загрузка статуса записи
function loadBookingStatus() {
    fetch(`${GOOGLE_SCRIPT_URL}?action=getBookingStatus`)
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                isBookingActive = data.isActive;
                updateBookingUI();
            }
        })
        .catch(error => {
            console.error('Error loading booking status:', error);
            isBookingActive = true;
            updateBookingUI();
        });
}

// Обновление UI в зависимости от статуса записи
function updateBookingUI() {
    if (isBookingActive) {
        bookingDisabledMessage.style.display = 'none';
        form.style.display = 'block';
    } else {
        bookingDisabledMessage.style.display = 'block';
        form.style.display = 'none';
    }
}

// Валидация формы
function validateForm() {
    let isValid = true;

    // Валидация имени
    const nameInput = document.getElementById('name');
    if (!nameInput.value.trim()) {
        showError(nameInput, 'nameError');
        isValid = false;
    } else {
        hideError(nameInput, 'nameError');
    }

    // Валидация телефона
    const phoneDigits = phoneInput.value.replace(/\D/g,'');
    if (phoneDigits.length !== 11) {
        showError(phoneInput, 'phoneError');
        isValid = false;
    } else {
        hideError(phoneInput, 'phoneError');
    }

    // Валидация даты
    if (!selectedDate) {
        document.getElementById('dateError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('dateError').style.display = 'none';
    }

    // Валидация времени
    if (!selectedTime) {
        document.getElementById('timeError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('timeError').style.display = 'none';
    }

    // Валидация услуги
    const serviceInput = document.getElementById('service');
    if (!serviceInput.value) {
        showError(serviceInput, 'serviceError');
        isValid = false;
    } else {
        hideError(serviceInput, 'serviceError');
    }

    // Валидация модели автомобиля
    const carModelInput = document.getElementById('carModel');
    if (!carModelInput.value.trim()) {
        showError(carModelInput, 'carModelError');
        isValid = false;
    } else {
        hideError(carModelInput, 'carModelError');
    }

    // Валидация согласия
    const agreeInput = document.getElementById('agree');
    if (!agreeInput.checked) {
        document.getElementById('agreeError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('agreeError').style.display = 'none';
    }

    return isValid;
}

// Отправка формы
function submitForm() {
    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: phoneInput.value.trim(),
        date: document.getElementById('selectedDate').value,
        time: selectedTime,
        service: document.getElementById('service').value,
        carModel: document.getElementById('carModel').value.trim(),
        timestamp: new Date().toISOString()
    };

    showLoading();

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        }
    })
    .then(resp => resp.json())
    .then(data => {
        console.log('Ответ от сервера:', data);
        
        if (data.result === 'success') {
            showSuccessMessage(formData);
            resetForm();
        } else {
            alert('Ошибка при записи: ' + (data.message || 'неизвестная ошибка'));
        }
    })
    .catch(err => {
        console.error('Ошибка при отправке:', err);
        alert('Не удалось отправить запись. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.');
    })
    .finally(() => {
        hideLoading();
    });
}

// Показать сообщение об успехе
function showSuccessMessage(formData) {
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 5000);
}

// Сброс формы
function resetForm() {
    form.reset();
    selectedDate = null;
    selectedTime = null;
    
    document.querySelectorAll('.date-option, .time-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    hideTimeSelection();
    renderDates();
}

// Вспомогательные функции
function getDayName(date) {
    const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return days[date.getDay()];
}

function getMonthName(date) {
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    return months[date.getMonth()];
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU');
}

function formatDateForStorage(date) {
    return date.toISOString().split('T')[0];
}

// Показать ошибку
function showError(input, errorId) {
    if (input) input.classList.add('error');
    document.getElementById(errorId).style.display = 'block';
}

// Скрыть ошибку
function hideError(input, errorId) {
    if (input) input.classList.remove('error');
    document.getElementById(errorId).style.display = 'none';
}

// Показать индикатор загрузки
function showLoading() {
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
}

// Скрыть индикатор загрузки
function hideLoading() {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Записаться';
}

