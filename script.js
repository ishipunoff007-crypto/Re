// Конфигурация для Google Apps Script
// ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ URL Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc5RyRZefzGEWq_GCg2QM6Bh0uZYvsisptM2hEtQnrKpvn3GFdgbSiN4vXLlzRQaXC/exec";

// DOM элементы
const form = document.getElementById('bookingForm');
const phoneInput = document.getElementById('phone');
const successMessage = document.getElementById('successMessage');
const bookingDisabledMessage = document.getElementById('bookingDisabledMessage');
const submitButton = document.getElementById('submitBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const globalError = document.getElementById('globalError');

// Переменные состояния
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let selectedTime = null;
let isBookingActive = true;
let availableSlotsCache = {};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Сначала покажем календарь, потом загрузим данные
    initializeCalendar();
    setupEventListeners();
    hideTimeSelection();
    
    // Загружаем статус с задержкой чтобы избежать race condition
    setTimeout(() => {
        loadBookingStatus();
    }, 1000);
});

// Инициализация календаря
function initializeCalendar() {
    updateMonthNavigation();
    renderCalendar();
    setupCalendarNavigation();
}

// Настройка навигации по месяцам
function setupCalendarNavigation() {
    document.getElementById('prevMonthBtn').addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateMonthNavigation();
        renderCalendar();
        hideTimeSelection();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateMonthNavigation();
        renderCalendar();
        hideTimeSelection();
    });
}

// Обновление навигации по месяцам
function updateMonthNavigation() {
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    const monthDisplay = document.getElementById('monthDisplay');
    
    const currentDate = new Date();
    const fourWeeksLater = new Date();
    fourWeeksLater.setDate(currentDate.getDate() + 28);
    
    const viewingDate = new Date(currentYear, currentMonth, 1);
    
    prevBtn.disabled = viewingDate <= currentDate;
    nextBtn.disabled = viewingDate >= fourWeeksLater;
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

// Рендер календаря
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay() + (firstDay.getDay() === 0 ? -6 : 1));
    
    calendarGrid.innerHTML = '';
    
    // Генерируем 42 дня (6 недель)
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = createDayElement(date, today);
        calendarGrid.appendChild(dayElement);
    }
    
    // Загружаем доступность дат (не блокируем основной поток)
    setTimeout(() => {
        loadDateAvailability();
    }, 500);
}

// Создание элемента дня
function createDayElement(date, today) {
    const dayElement = document.createElement('button');
    dayElement.className = 'calendar-day';
    dayElement.type = 'button';
    
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isPast = date < today;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isFourWeeksLimit = isWithinFourWeeks(date);
    
    dayElement.classList.add(isCurrentMonth ? 'available' : 'unavailable');
    if (isPast) dayElement.classList.add('past');
    if (isWeekend) dayElement.classList.add('weekend');
    if (!isFourWeeksLimit) dayElement.classList.add('unavailable');
    
    dayElement.innerHTML = `
        <div class="day-number">${date.getDate()}</div>
        <div class="day-availability" id="availability-${formatDateForStorage(date)}">...</div>
    `;
    
    // Добавляем обработчик только для доступных дат
    if (isCurrentMonth && !isPast && isFourWeeksLimit) {
        dayElement.addEventListener('click', function() {
            selectDate(date, dayElement);
        });
    } else {
        dayElement.disabled = true;
    }
    
    return dayElement;
}

// Проверка, что дата в пределах 4 недель
function isWithinFourWeeks(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourWeeksLater = new Date(today);
    fourWeeksLater.setDate(today.getDate() + 28);
    
    return date >= today && date <= fourWeeksLater;
}

// Загрузка доступности дат
async function loadDateAvailability() {
    const today = new Date();
    const fourWeeksLater = new Date();
    fourWeeksLater.setDate(today.getDate() + 28);
    
    try {
        // Показываем индикатор загрузки
        showLoadingIndicator();
        
        const response = await fetchWithTimeout(
            `${GOOGLE_SCRIPT_URL}?action=getDateAvailability&startDate=${formatDateForStorage(today)}&endDate=${formatDateForStorage(fourWeeksLater)}`,
            { timeout: 10000 }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result === 'success' && data.dateAvailability) {
            updateDateAvailabilityDisplay(data.dateAvailability);
        } else {
            throw new Error(data.message || 'Invalid response format');
        }
    } catch (error) {
        console.error('Error loading date availability:', error);
        // При ошибке показываем все даты как доступные
        showAllDatesAsAvailable();
    } finally {
        hideLoadingIndicator();
    }
}

// Обновление отображения доступности дат
function updateDateAvailabilityDisplay(dateAvailability) {
    Object.keys(dateAvailability).forEach(dateStr => {
        const availabilityElement = document.getElementById(`availability-${dateStr}`);
        if (availabilityElement) {
            const slots = dateAvailability[dateStr];
            if (slots > 0) {
                availabilityElement.textContent = `${slots} слотов`;
                availabilityElement.style.color = 'var(--success)';
            } else {
                availabilityElement.textContent = 'нет мест';
                availabilityElement.style.color = 'var(--danger)';
            }
        }
    });
}

// Показать все даты как доступные (при ошибке загрузки)
function showAllDatesAsAvailable() {
    const today = new Date();
    const fourWeeksLater = new Date();
    fourWeeksLater.setDate(today.getDate() + 28);
    
    for (let date = new Date(today); date <= fourWeeksLater; date.setDate(date.getDate() + 1)) {
        const availabilityElement = document.getElementById(`availability-${formatDateForStorage(date)}`);
        if (availabilityElement) {
            availabilityElement.textContent = 'загрузка...';
            availabilityElement.style.color = 'var(--gray-medium)';
        }
    }
}

// Выбор даты
async function selectDate(date, element) {
    // Сбрасываем предыдущий выбор
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedDate = date;
    document.getElementById('selectedDate').value = formatDateForStorage(date);
    
    showTimeSelection();
    await loadAvailableTimeSlots(date);
    hideError(null, 'dateError');
}

// Показать выбор времени
function showTimeSelection() {
    const timeSelection = document.getElementById('timeSelection');
    const selectedDateInfo = document.getElementById('selectedDateInfo');
    
    const dateString = selectedDate.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    selectedDateInfo.textContent = `Выбрана дата: ${dateString}`;
    timeSelection.style.display = 'block';
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

// Загрузка доступных слотов времени
async function loadAvailableTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    const dateString = formatDateForStorage(date);
    
    // Показываем индикатор загрузки
    timeSlotsContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #666;">
            <i class="fas fa-spinner fa-spin"></i><br>
            Загрузка доступного времени...
        </div>
    `;
    
    try {
        // Проверяем кэш
        if (availableSlotsCache[dateString]) {
            renderTimeSlots(availableSlotsCache[dateString], timeSlotsContainer);
            return;
        }
        
        const response = await fetchWithTimeout(
            `${GOOGLE_SCRIPT_URL}?action=getAvailableSlots&date=${dateString}`,
            { timeout: 10000 }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result === 'success' && data.availableSlots) {
            // Сохраняем в кэш
            availableSlotsCache[dateString] = data.availableSlots;
            renderTimeSlots(data.availableSlots, timeSlotsContainer);
        } else {
            throw new Error(data.message || 'No available slots data');
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        timeSlotsContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i><br>
                Ошибка загрузки времени.<br>
                <small>Пожалуйста, попробуйте выбрать другую дату или обновите страницу.</small>
            </div>
        `;
    }
}

// Рендер слотов времени
function renderTimeSlots(availableSlots, container) {
    if (!availableSlots || availableSlots.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #666;">
                <i class="fas fa-calendar-times"></i><br>
                На выбранную дату нет свободного времени
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    availableSlots.forEach(slot => {
        const timeElement = document.createElement('button');
        timeElement.className = 'time-slot';
        timeElement.type = 'button';
        timeElement.textContent = slot;
        
        timeElement.addEventListener('click', function() {
            selectTime(slot, timeElement);
        });
        
        container.appendChild(timeElement);
    });
}

// Выбор времени
function selectTime(time, element) {
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
            showGlobalError('Запись временно приостановлена. Пожалуйста, попробуйте позже или свяжитесь с нами по телефону.');
            return;
        }
        
        if (!validateForm()) {
            scrollToFirstError();
            return;
        }

        submitForm();
    });

    // Валидация при изменении полей
    form.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('blur', function() {
            validateField(this);
        });
        
        element.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });

    // Обработчик для кнопки согласия
    document.getElementById('agree').addEventListener('change', function() {
        validateField(this);
    });
}

// Валидация отдельного поля
function validateField(field) {
    const fieldId = field.id;
    
    switch (fieldId) {
        case 'name':
            if (!field.value.trim()) {
                showError(field, 'nameError');
            } else {
                hideError(field, 'nameError');
            }
            break;
            
        case 'phone':
            const phoneDigits = field.value.replace(/\D/g,'');
            if (phoneDigits.length !== 11) {
                showError(field, 'phoneError');
            } else {
                hideError(field, 'phoneError');
            }
            break;
            
        case 'service':
            if (!field.value) {
                showError(field, 'serviceError');
            } else {
                hideError(field, 'serviceError');
            }
            break;
            
        case 'carModel':
            if (!field.value.trim()) {
                showError(field, 'carModelError');
            } else {
                hideError(field, 'carModelError');
            }
            break;
            
        case 'agree':
            if (!field.checked) {
                document.getElementById('agreeError').style.display = 'block';
            } else {
                document.getElementById('agreeError').style.display = 'none';
            }
            break;
    }
}

// Загрузка статуса записи
async function loadBookingStatus() {
    try {
        const response = await fetchWithTimeout(
            `${GOOGLE_SCRIPT_URL}?action=getBookingStatus`,
            { timeout: 5000 }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result === 'success') {
            isBookingActive = data.isActive;
            updateBookingUI();
        } else {
            throw new Error(data.message || 'Invalid response');
        }
    } catch (error) {
        console.error('Error loading booking status:', error);
        // При ошибке считаем запись активной
        isBookingActive = true;
        updateBookingUI();
    }
}

// Обновление UI в зависимости от статуса записи
function updateBookingUI() {
    if (isBookingActive) {
        bookingDisabledMessage.style.display = 'none';
        submitButton.disabled = false;
    } else {
        bookingDisabledMessage.style.display = 'block';
        submitButton.disabled = true;
    }
}

// Валидация формы
function validateForm() {
    let isValid = true;
    
    // Валидация всех полей
    validateField(document.getElementById('name'));
    validateField(document.getElementById('phone'));
    validateField(document.getElementById('service'));
    validateField(document.getElementById('carModel'));
    validateField(document.getElementById('agree'));

    // Проверяем ошибки
    if (document.querySelector('.field-error[style*="display: block"]')) {
        isValid = false;
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

    return isValid;
}

// Прокрутка к первой ошибке
function scrollToFirstError() {
    const firstError = document.querySelector('.field-error[style*="display: block"], .error-message[style*="display: block"]');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Отправка формы
async function submitForm() {
    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: phoneInput.value,
        date: document.getElementById('selectedDate').value,
        time: selectedTime,
        service: document.getElementById('service').value,
        carModel: document.getElementById('carModel').value.trim(),
        comments: document.getElementById('comments').value.trim(),
        timestamp: new Date().toISOString()
    };

    showLoading();

    try {
        const response = await fetchWithTimeout(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            timeout: 10000
        });
        
        const data = await response.json();
        
        if (data.result === 'success') {
            showSuccessMessage(formData);
            resetForm();
            // Очищаем кэш для обновления доступности
            availableSlotsCache = {};
        } else {
            throw new Error(data.message || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('Ошибка при отправке:', error);
        showGlobalError('Не удалось отправить запись. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.');
    } finally {
        hideLoading();
    }
}

// Показать сообщение об успехе
function showSuccessMessage(formData) {
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth' });
    
    // Обновляем текст сообщения
    const messageText = document.getElementById('successMessageText');
    messageText.textContent = `Спасибо, ${formData.name}! Ваша запись на ${formData.date} в ${formData.time} принята. Мы свяжемся с вами для подтверждения.`;
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 8000);
}

// Показать глобальную ошибку
function showGlobalError(message) {
    const errorText = document.getElementById('errorMessageText');
    errorText.textContent = message;
    globalError.style.display = 'block';
    globalError.scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
        globalError.style.display = 'none';
    }, 5000);
}

// Сброс формы
function resetForm() {
    form.reset();
    selectedDate = null;
    selectedTime = null;
    
    document.querySelectorAll('.calendar-day.selected, .time-slot.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    hideTimeSelection();
    renderCalendar();
    
    // Скрываем все ошибки
    document.querySelectorAll('.field-error').forEach(error => {
        error.style.display = 'none';
    });
    
    document.querySelectorAll('.form-control.error').forEach(input => {
        input.classList.remove('error');
    });
}

// Вспомогательные функции
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
    document.querySelector('.btn-text').style.display = 'none';
    document.querySelector('.btn-loading').style.display = 'inline-block';
}

// Скрыть индикатор загрузки
function hideLoading() {
    submitButton.disabled = false;
    document.querySelector('.btn-text').style.display = 'inline-block';
    document.querySelector('.btn-loading').style.display = 'none';
}

// Показать индикатор загрузки для календаря
function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

// Скрыть индикатор загрузки для календаря
function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Функция fetch с таймаутом
function fetchWithTimeout(url, options = {}) {
    const { timeout = 8000, ...fetchOptions } = options;
    
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
        
        fetch(url, fetchOptions)
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

// Обработка сообщений от админ-панели
window.addEventListener('message', function(event) {
    if (event.data.type === 'bookingStatusUpdated') {
        loadBookingStatus();
    }
});

// Автоматическое обновление статуса каждые 5 минут
setInterval(() => {
    loadBookingStatus();
}, 300000);
