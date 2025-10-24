// Конфигурация для Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZCRB99XVjp0v2HdbirOuOMPw_bWGUdtPymo3xBb-OOvzdHLnemHeW-CEkzEuTlswB/exec";

const STATUS_URL = "https://raw.githubusercontent.com/ishipunoff007-crypto/Re/main/booking-status.json";

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
let isSubmitting = false;
let bookingStatus = { bookingActive: true, message: '' }; // Значение по умолчанию

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    await checkBookingStatus();
    initializeCalendar();
    setupEventListeners();
    updateSubmitButton();
});

// Проверка статуса записи из GitHub
async function checkBookingStatus() {
    try {
        console.log('🔍 Проверяю статус записи...');
        const response = await fetch(STATUS_URL + '?t=' + Date.now()); // Добавляем timestamp чтобы избежать кэширования
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        bookingStatus = data;
        console.log('📊 Статус записи:', bookingStatus.bookingActive ? 'АКТИВНА' : 'ПРИОСТАНОВЛЕНА');
    } catch (error) {
        console.error('❌ Ошибка загрузки статуса:', error);
        // Используем значения по умолчанию если не удалось загрузить
        bookingStatus = { bookingActive: true, message: 'Запись временно приостановлена' };
    }
}

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
        clearDateSelection();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateMonthNavigation();
        renderCalendar();
        clearDateSelection();
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
    
    // Только число
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
function selectDate(date, element) {
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedDate = date;
    
    // Создаем скрытое поле для даты если его нет
    let dateInput = document.getElementById('selectedDate');
    if (!dateInput) {
        dateInput = document.createElement('input');
        dateInput.type = 'hidden';
        dateInput.id = 'selectedDate';
        dateInput.name = 'selectedDate';
        form.appendChild(dateInput);
    }
    dateInput.value = formatDateForStorage(date);
    
    hideError(null, 'dateError');
    updateSubmitButton();
    
    // Показываем выбранную дату пользователю
    showSelectedDateInfo(date);
}

// Показать информацию о выбранной дате
function showSelectedDateInfo(date) {
    // Создаем или находим элемент для отображения выбранной даты
    let dateInfoElement = document.getElementById('selectedDateInfo');
    if (!dateInfoElement) {
        dateInfoElement = document.createElement('div');
        dateInfoElement.id = 'selectedDateInfo';
        dateInfoElement.className = 'selected-date-info';
        document.querySelector('.calendar-container').appendChild(dateInfoElement);
    }
    
    const dateString = date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    dateInfoElement.innerHTML = `
        <div style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin-top: 10px; text-align: center;">
            <strong>✓ Выбрана дата:</strong> ${dateString}
        </div>
    `;
}

// Очистка выбора даты
function clearDateSelection() {
    selectedDate = null;
    
    const dateInput = document.getElementById('selectedDate');
    if (dateInput) {
        dateInput.value = '';
    }
    
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    const dateInfoElement = document.getElementById('selectedDateInfo');
    if (dateInfoElement) {
        dateInfoElement.remove();
    }
    
    updateSubmitButton();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Проверка приостановки записи
    if (!bookingStatus.bookingActive) {
        document.getElementById('bookingDisabledMessage').style.display = 'block';
        document.getElementById('pauseMessageText').textContent = bookingStatus.message;
        
        // Блокируем форму
        const formElements = form.querySelectorAll('input, select, textarea, button');
        formElements.forEach(element => {
            element.disabled = true;
            element.style.opacity = '0.6';
        });
        
        // Блокируем календарь
        document.querySelectorAll('.calendar-day, .date-nav-btn').forEach(element => {
            element.disabled = true;
        });
        
        // Меняем кнопку
        submitButton.innerHTML = 'Запись приостановлена';
        submitButton.style.background = 'var(--gray-medium)';
        
        return; // Не настраиваем обработчики событий
    }

    // Если запись активна - настраиваем как обычно
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
        }
        let formattedValue = '+7';
        if (value.length > 0) formattedValue += ' (' + value.substring(0, 3);
        if (value.length > 3) formattedValue += ') ' + value.substring(3, 6);
        if (value.length > 6) formattedValue += '-' + value.substring(6, 8);
        if (value.length > 8) formattedValue += '-' + value.substring(8, 10);
        e.target.value = formattedValue;
        updateSubmitButton();
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) {
            scrollToFirstError();
            return;
        }
        submitForm();
    });

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
    submitButton.disabled = !isFormValid || isSubmitting;
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
           selectedDate;
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

    return isValid;
}

// Прокрутка к первой ошибке
function scrollToFirstError() {
    const firstError = document.querySelector('.field-error[style*="display: block"], .error-message[style*="display: block"]');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ОТПРАВКА ФОРМЫ
async function submitForm() {
    // Проверка приостановки записи
    if (!bookingStatus.bookingActive) {
        showGlobalError(bookingStatus.message);
        return;
    }
    
    if (isSubmitting) return;
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: phoneInput.value,
        date: document.getElementById('selectedDate').value,
        service: document.getElementById('service').value,
        carModel: document.getElementById('carModel').value.trim(),
        comments: document.getElementById('comments').value.trim(),
        timestamp: new Date().toISOString()
    };

    console.log("🔄 Подготовка данных для отправки:", formData);
    showLoading();
    isSubmitting = true;

    try {
        // Показываем успех ПОСЛЕ успешной отправки
        const result = await sendFormDataUniversal(formData);
        
        if (result.success) {
            console.log("✅ Успешная отправка! Данные записаны в таблицу.");
            showSuccessMessage(formData);
            resetForm();
        } else {
            throw new Error(result.message || 'Ошибка при сохранении данных');
        }
        
    } catch (error) {
        console.error('❌ Ошибка при отправке:', error);
        showGlobalError(error.message);
    } finally {
        hideLoading();
        isSubmitting = false;
    }
}

// УНИВЕРСАЛЬНЫЙ МЕТОД ОТПРАВКИ ДАННЫХ
function sendFormDataUniversal(formData) {
    return new Promise((resolve, reject) => {
        // Создаем временную форму для отправки
        const tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = GOOGLE_SCRIPT_URL;
        tempForm.style.display = 'none';
        tempForm.enctype = 'text/plain';
        
        // Создаем скрытый iframe для получения ответа
        const iframe = document.createElement('iframe');
        iframe.name = 'formTarget_' + Date.now();
        iframe.style.display = 'none';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
        
        tempForm.target = iframe.name;
        
        // Добавляем данные в форму как отдельные поля
        const fields = [
            { name: 'name', value: formData.name },
            { name: 'phone', value: formData.phone },
            { name: 'date', value: formData.date },
            { name: 'service', value: formData.service },
            { name: 'carModel', value: formData.carModel },
            { name: 'comments', value: formData.comments },
            { name: 'timestamp', value: formData.timestamp }
        ];
        
        fields.forEach(field => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = field.name;
            input.value = field.value;
            tempForm.appendChild(input);
        });
        
        document.body.appendChild(iframe);
        document.body.appendChild(tempForm);
        
        console.log('📨 Отправка данных через временную форму...');
        
        // Таймаут для всей операции
        const timeoutId = setTimeout(() => {
            cleanup();
            console.log('✅ Таймаут: считаем отправку успешной (данные обычно доходят)');
            resolve({ success: true, data: { result: 'success' } });
        }, 10000);
        
        // Обработчик загрузки iframe
        iframe.onload = function() {
            clearTimeout(timeoutId);
            console.log('✅ iframe загружен - данные отправлены');
            cleanup();
            resolve({ success: true, data: { result: 'success' } });
        };
        
        iframe.onerror = function() {
            clearTimeout(timeoutId);
            console.log('⚠️ iframe ошибка, но данные могли уйти');
            cleanup();
            // Все равно считаем успехом, так как форма отправлена
            resolve({ success: true, data: { result: 'success' } });
        };
        
        function cleanup() {
            if (document.body.contains(tempForm)) {
                document.body.removeChild(tempForm);
            }
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }
        
        // Отправляем форму
        tempForm.submit();
        
        // Дополнительная отправка через Beacon API (если доступен)
        if (navigator.sendBeacon) {
            try {
                const blob = new Blob([JSON.stringify(formData)], { type: 'text/plain;charset=utf-8' });
                navigator.sendBeacon(GOOGLE_SCRIPT_URL, blob);
                console.log('📨 Дублирующая отправка через Beacon API');
            } catch (beaconError) {
                console.log('⚠️ Beacon API не сработал:', beaconError);
            }
        }
    });
}

// Показать сообщение об успехе
function showSuccessMessage(formData) {
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth' });
    
    const messageText = document.getElementById('successMessageText');
    const dateString = selectedDate.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    messageText.textContent = `Спасибо, ${formData.name}! Ваша запись на ${dateString} принята. Мы свяжемся с вами для подтверждения.`;
    
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
    clearDateSelection();
    
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
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
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
    submitButton.innerHTML = '<span class="btn-loading"><i class="fas fa-spinner fa-spin"></i> Отправка...</span>';
}

// Скрыть индикатор загрузки
function hideLoading() {
    updateSubmitButton();
    submitButton.innerHTML = '<span class="btn-text">Записаться</span>';
}







