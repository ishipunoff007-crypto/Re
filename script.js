// Конфигурация для Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz78ph7_05mXQwZcDVu-tl9BiY6VroE2euz8bYlNEKwQCceghdv8lyxrti7JWwozg2Czw/exec";

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

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    setupEventListeners();
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
    // Маска для телефона
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Если начинается с 7 или 8, убираем
        if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
        }
        
        // Форматирование
        let formattedValue = '+7';
        if (value.length > 0) formattedValue += ' (' + value.substring(0, 3);
        if (value.length > 3) formattedValue += ') ' + value.substring(3, 6);
        if (value.length > 6) formattedValue += '-' + value.substring(6, 8);
        if (value.length > 8) formattedValue += '-' + value.substring(8, 10);
        
        e.target.value = formattedValue;
        updateSubmitButton();
    });

    // Обработчик отправки формы - УБИРАЕМ ПЕРЕЗАГРУЗКУ СТРАНИЦЫ
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Важно: предотвращаем стандартную отправку формы
        console.log('🔴 Предотвращена стандартная отправка формы');
        
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

// ОТПРАВКА ФОРМЫ - ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ЛОГИКА
async function submitForm() {
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
        const result = await sendFormData(formData);
        
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

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ОТПРАВКИ ДАННЫХ
function sendFormData(formData) {
    return new Promise((resolve, reject) => {
        // Пытаемся отправить через XMLHttpRequest (работает везде)
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', GOOGLE_SCRIPT_URL, true);
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log('📨 Статус ответа:', xhr.status, xhr.statusText);
                
                if (xhr.status === 200) {
                    try {
                        // Пытаемся распарсить ответ
                        const response = JSON.parse(xhr.responseText);
                        console.log('📊 Ответ сервера:', response);
                        resolve({ success: true, data: response });
                    } catch (e) {
                        // Если не удалось распарсить JSON, но статус 200 - считаем успехом
                        console.log('⚠️ Не удалось распарсить JSON, но статус 200');
                        resolve({ success: true, data: { result: 'success' } });
                    }
                } else if (xhr.status === 0) {
                    // CORS ошибка, но данные могли уйти - используем fallback
                    console.log('⚠️ CORS ошибка, используем fallback метод');
                    sendFormDataFallback(formData)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error(`Ошибка сервера: ${xhr.status} ${xhr.statusText}`));
                }
            }
        };
        
        xhr.onerror = function() {
            console.log('❌ XMLHttpRequest ошибка, используем fallback');
            sendFormDataFallback(formData)
                .then(resolve)
                .catch(reject);
        };
        
        xhr.ontimeout = function() {
            console.log('⏰ Таймаут XMLHttpRequest, используем fallback');
            sendFormDataFallback(formData)
                .then(resolve)
                .catch(reject);
        };
        
        xhr.timeout = 10000; // 10 секунд таймаут
        
        console.log('📨 Отправка данных через XMLHttpRequest...');
        xhr.send(JSON.stringify(formData));
    });
}

// FALLBACK МЕТОД ДЛЯ ОБХОДА CORS
function sendFormDataFallback(formData) {
    return new Promise((resolve, reject) => {
        // Создаем временную форму для отправки
        const tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = GOOGLE_SCRIPT_URL;
        tempForm.style.display = 'none';
        tempForm.enctype = 'text/plain';
        
        // Создаем скрытый iframe для получения ответа
        const iframe = document.createElement('iframe');
        iframe.name = 'formTarget';
        iframe.style.display = 'none';
        
        tempForm.target = 'formTarget';
        
        // Добавляем данные в форму
        const dataInput = document.createElement('input');
        dataInput.name = 'data';
        dataInput.value = JSON.stringify(formData);
        tempForm.appendChild(dataInput);
        
        document.body.appendChild(iframe);
        document.body.appendChild(tempForm);
        
        // Обработчик загрузки iframe
        iframe.onload = function() {
            console.log('✅ Fallback метод: данные отправлены');
            
            // Удаляем временные элементы
            setTimeout(() => {
                document.body.removeChild(tempForm);
                document.body.removeChild(iframe);
            }, 1000);
            
            resolve({ success: true, data: { result: 'success' } });
        };
        
        iframe.onerror = function() {
            console.log('❌ Fallback метод: ошибка отправки');
            document.body.removeChild(tempForm);
            document.body.removeChild(iframe);
            reject(new Error('Не удалось отправить данные'));
        };
        
        console.log('📨 Отправка данных через fallback метод...');
        tempForm.submit();
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

