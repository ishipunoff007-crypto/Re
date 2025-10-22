// Конфигурация для Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5EvyWDQMwsM1kWLuTx74ec4rKE8LLVveYEVOqfKHvWtSW3GvLiu5BNwOQE0IWXPVb/exec";

let currentWeek = 0;
let selectedDate = null;
let selectedTime = null;
let bookedSlots = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Сайт загружен");
    loadBookedSlots();
    initializeDateSelector();
    setupEventListeners();
});

function loadBookedSlots() {
    fetch(GOOGLE_SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                bookedSlots = data.bookedSlots || {};
                console.log('Занятые слоты:', bookedSlots);
                if (selectedDate) renderTimeSlotsForDate(selectedDate);
            } else {
                console.warn('Ошибка получения слотов:', data.message);
            }
        })
        .catch(error => console.error('Ошибка загрузки:', error));
}

function initializeDateSelector() {
    updateWeekNavigation();
    renderDates();
    setupWeekNavigation();
}

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

function hideTimeSelection() {
    document.getElementById('timeSelection').style.display = 'none';
    selectedTime = null;
    document.getElementById('selectedTime').value = '';
}

function updateWeekNavigation() {
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    
    prevBtn.disabled = currentWeek === 0;
    nextBtn.disabled = currentWeek === 3;
    
    const startDate = getWeekStartDate();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    document.getElementById('weekDisplay').textContent = 
        `Неделя ${currentWeek + 1} (${formatDate(startDate)} - ${formatDate(endDate)})`;
}

function getWeekStartDate() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (currentWeek * 7));
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    return startDate;
}

function renderDates() {
    const datesContainer = document.getElementById('datesContainer');
    const startDate = getWeekStartDate();
    
    datesContainer.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateElement = document.createElement('div');
        dateElement.className = 'date-option';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
            dateElement.classList.add('disabled');
        } else {
            dateElement.addEventListener('click', function() {
                selectDate(date, dateElement);
            });
        }
        
        dateElement.innerHTML = `
            <div class="date-day">${getDayName(date)}</div>
            <div class="date-number">${date.getDate()}</div>
            <div class="date-month">${getMonthName(date)}</div>
        `;
        
        datesContainer.appendChild(dateElement);
    }
}

function selectDate(date, element) {
    document.querySelectorAll('.date-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedDate = date;
    document.getElementById('selectedDate').value = formatDateForStorage(date);
    showTimeSelection();
    renderTimeSlotsForDate(date);
}

function showTimeSelection() {
    document.getElementById('timeSelection').style.display = 'block';
}

function renderTimeSlotsForDate(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    const dateString = formatDateForStorage(date);
    const bookedForDate = bookedSlots[dateString] || [];
    
    timeSlotsContainer.innerHTML = '';
    
    const allSlots = [];
    for (let hour = 9; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
    }
    
    allSlots.forEach(slot => {
        const timeElement = document.createElement('div');
        const isBooked = bookedForDate.includes(slot);
        
        if (isBooked) {
            timeElement.className = 'time-slot occupied';
            timeElement.innerHTML = `${slot}<br><small>Занято</small>`;
        } else {
            timeElement.className = 'time-slot';
            timeElement.textContent = slot;
            timeElement.addEventListener('click', function() {
                selectTime(slot, timeElement);
            });
        }
        
        timeSlotsContainer.appendChild(timeElement);
    });
}

function selectTime(time, element) {
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedTime = time;
    document.getElementById('selectedTime').value = time;
}

function setupEventListeners() {
    document.getElementById('phone').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (!value.startsWith('7')) value = '7' + value;
            if (value.length > 1) value = '+7' + value.substring(1);
        }
        e.target.value = value;
    });

    document.getElementById('bookingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) return;
        submitForm();
    });
}

function validateForm() {
    const fields = ['name', 'phone', 'service', 'carModel'];
    for (const field of fields) {
        if (!document.getElementById(field).value.trim()) {
            alert(`Заполните поле: ${field}`);
            return false;
        }
    }
    if (!selectedDate) { alert('Выберите дату'); return false; }
    if (!selectedTime) { alert('Выберите время'); return false; }
    if (!document.getElementById('agree').checked) {
        alert('Необходимо согласие');
        return false;
    }
    return true;
}

function submitForm() {
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Отправка...';

    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date: document.getElementById('selectedDate').value,
        time: selectedTime,
        service: document.getElementById('service').value,
        carModel: document.getElementById('carModel').value.trim()
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(formData)
    })
    .then(resp => resp.json())
    .then(data => {
        if (data.result === 'success') {
            document.getElementById('successMessage').style.display = 'block';
            resetForm();
            loadBookedSlots(); // 🔄 сразу обновляем занятые слоты
        } else {
            alert(data.message || 'Ошибка записи');
            loadBookedSlots(); // обновим, чтобы отразить занятое время
        }
    })
    .catch(err => {
        alert('Ошибка отправки. Попробуйте ещё раз.');
        console.error(err);
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Записаться';
    });
}

function resetForm() {
    document.getElementById('bookingForm').reset();
    selectedDate = null;
    selectedTime = null;
    document.querySelectorAll('.date-option, .time-slot').forEach(el => el.classList.remove('selected'));
    hideTimeSelection();
    renderDates();
}

function getDayName(date) {
    return ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'][date.getDay()];
}

function getMonthName(date) {
    return ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'][date.getMonth()];
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU');
}

function formatDateForStorage(date) {
    return date.toISOString().split('T')[0];
}
