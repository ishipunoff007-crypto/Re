// Конфигурация для Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxyYLuHzLVPg9xOjXW9W67AT4zwVSS7_Qb0QcOy2h4gldEVAMiPfjYVzbju6nFJftq5Rg/exec";

// DOM элементы
const form = document.getElementById('bookingForm');
const phoneInput = document.getElementById('phone');
const successMessage = document.getElementById('successMessage');
const globalError = document.getElementById('globalError');
const submitButton = document.getElementById('submitBtn');

// Переменные состояния
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let selectedTime = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    setupEventListeners();
    hideTimeSelection();
    updateSubmitButton();
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
    
    // Базовые классы
    if (isCurrentMonth) {
        dayElement.classList.add('available');
    } else {
        dayElement.classList.add('unavailable');
    }
    
    if (isPast) dayElement.classList.add('past');
    if (isWeekend) dayElement.classList.add('weekend');
    if (!isFourWeeksLimit) dayElement.classList.add('unavailable');
    
    // Только число, без надписи со слотами
    dayElement.innerHTML = `<div class="day-number">${date.getDate()}</div>`;
    
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

// Выбор даты
async function selectDate(date, element) {
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedDate = date;
    document.getElementById('selectedDate').value = formatDateForStorage(date);
    
    showTimeSelection();
    hideError(null, 'dateError');
    
    // Загружаем доступные слоты с сервера
    await loadAvailableTimeSlots(date);
    updateSubmitButton();
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

// Загрузка доступных слотов с сервера
async function loadAvailableTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    const noSlotsMessage = document.getElementById('noSlotsMessage');
    const dateString = formatDateForStorage(date);
    
    // Показываем индикатор загрузки
    timeSlotsContainer.innerHTML = '';
    noSlotsMessage.style.display = 'none';
    timeSlotsContainer.innerHTML = `
        <div class="loading" style="text-align: center; padding: 20px; color: #666;">
            <i class="fas fa-spinner fa-spin"></i> Проверяем доступное время...
        </div>
    `;
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAvailableSlots&date=${dateString}`);
        
        if (!response.ok) {
            throw new Error('Ошибка сети');
        }
        
        const data = await response.json();
        
        if (data.result === 'success' && data.data.availableSlots) {
            renderTimeSlots(data.data.availableSlots, timeSlotsContainer, noSlotsMessage);
        } else {
            throw new Error(data.message || 'Ошибка загрузки времени');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки времени:', error);
        timeSlotsContainer.innerHTML = '';
        noSlotsMessage.style.display = 'block';
        noSlotsMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> Не удалось загрузить доступное время
        `;
    }
}

// Рендер слотов времени
function renderTimeSlots(availableSlots, container, noSlotsMessage) {
    container.innerHTML = '';
    
    if (!availableSlots || availableSlots.length === 0) {
        noSlotsMessage.style.display = 'block';
        noSlotsMessage.innerHTML = `
            <i class="fas fa-calendar-times"></i> На эту дату нет свободного времени
        `;
        return;
    }
    
    noSlotsMessage.style.display = 'none';
    
    availableSlots.forEach(slot => {
        const timeElement = document.createElement('button');
        timeElement.className = 'time-slot available';
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
    updateSubmitButton();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Маска для телефона
    phoneInput.addEventListener('input', function(e) {
        const x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
        if (x) {
            e.target.value = '+7' + (x[2] ? ' (' + x[2] : '') + (x[3] ? ') ' + x[3] : '') + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
        }
        updateSubmitButton();
    });

    // Обработчик отправки формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            scrollToFirstError();
            return;
        }

        submitForm();
    });

    // Валидация при изменении полей
    form.querySelectorAll('input, select, textarea').forEach(element => {
        element.addEventListener('input', function() {
            validateField(this);
            updateSubmitButton();
        });
        
        element.addEventListener('blur', function() {
            validateField(this);
            updateSubmitButton();
        });
    });

    // Обработчик для кнопки согласия
    document.getElementById('agree').addEventListener('change', function() {
        validateField(this);
        updateSubmitButton();
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

// Обновление состояния кнопки отправки
function updateSubmitButton() {
    const isFormValid = validateFormSilent();
    submitButton.disabled = !isFormValid;
}

// Тихая валидация без показа ошибок
function validateFormSilent() {
    const name = document.getElementById('name').value.trim();
    const phone = phoneInput.value.replace(/\D/g, '');
    const service = document.getElementById('service').value;
    const carModel = document.getElementById('carModel').value.trim();
    const agree = document.getElementById('agree').checked;
    
    return name && 
           phone.length === 11 && 
           service && 
           carModel && 
           agree && 
           selectedDate && 
           selectedTime;
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

    console.log("🔄 Отправляю данные:", formData);
    showLoading();

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });
        
        const data = await response.json();
        console.log("📊 Ответ от сервера:", data);
        
        if (data.result === 'success') {
            showSuccessMessage(formData);
            resetForm();
        } else {
            throw new Error(data.message || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('❌ Ошибка при отправке:', error);
        showGlobalError(error.message);
    } finally {
        hideLoading();
    }
}

// Показать сообщение об успехе
function showSuccessMessage(formData) {
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth' });
    
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
    
    updateSubmitButton();
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
    updateSubmitButton();
}

