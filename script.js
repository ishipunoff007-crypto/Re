// Вставь сюда URL своего Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc5RyRZefzGEWq_GCg2QM6Bh0uZYvsisptM2hEtQnrKpvn3GFdgbSiN4vXLlzRQaXC/exec";

const calendarGrid = document.getElementById('calendarGrid');
const monthDisplay = document.getElementById('monthDisplay');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const timeInput = document.getElementById('timeInput');
const bookingForm = document.getElementById('bookingForm');
const successMessage = document.getElementById('successMessage');
const globalError = document.getElementById('globalError');
const bookingDisabledMessage = document.getElementById('bookingDisabledMessage');

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

// Проверка статуса записи
async function checkBookingStatus() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getBookingStatus`);
        const data = await res.json();
        if (!data.isActive) bookingDisabledMessage.style.display = 'block';
        else bookingDisabledMessage.style.display = 'none';
    } catch (err) {
        console.error('Ошибка проверки статуса:', err);
        bookingDisabledMessage.style.display = 'none';
    }
}

// Генерация календаря
function renderCalendar(month, year) {
    calendarGrid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthDisplay.textContent = `${year}-${(month + 1).toString().padStart(2,'0')}`;

    const offset = (firstDay === 0 ? 6 : firstDay - 1);
    for(let i=0; i<offset; i++){
        const empty = document.createElement('div'); empty.classList.add('calendar-cell','empty');
        calendarGrid.appendChild(empty);
    }

    for(let day=1; day<=daysInMonth; day++){
        const cell = document.createElement('div');
        cell.classList.add('calendar-cell');
        const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
        cell.textContent = day;

        const todayStr = new Date().toISOString().split('T')[0];
        if(dateStr < todayStr) cell.classList.add('disabled');

        cell.addEventListener('click', () => {
            if(cell.classList.contains('disabled')) return;
            document.querySelectorAll('.calendar-cell.selected').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            selectedDate = dateStr;
            loadAvailableTimes(selectedDate);
        });

        calendarGrid.appendChild(cell);
    }
}

// Переключение месяцев
prevMonthBtn.addEventListener('click', ()=>{ currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCalendar(currentMonth,currentYear); });
nextMonthBtn.addEventListener('click', ()=>{ currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCalendar(currentMonth,currentYear); });

// Загрузка доступных слотов времени
async function loadAvailableTimes(dateStr){
    timeInput.innerHTML = '';
    try{
        const res = await fetch(`${SCRIPT_URL}?action=getAvailableSlots&date=${dateStr}`);
        const data = await res.json();
        if(data.availableSlots.length > 0){
            data.availableSlots.forEach(slot => {
                const opt = document.createElement('option'); opt.value=slot; opt.text=slot;
                timeInput.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option'); opt.text='Нет доступных слотов'; opt.disabled=true;
            timeInput.appendChild(opt);
        }
    } catch(err){ console.error('Ошибка загрузки слотов:', err); }
}

// Отправка формы
bookingForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!selectedDate){ alert('Выберите дату'); return; }
    const formData = {
        action: 'newBooking',
        name: document.getElementById('nameInput').value,
        phone: document.getElementById('phoneInput').value,
        date: selectedDate,
        time: timeInput.value,
        service: document.getElementById('serviceInput').value,
        carModel: document.getElementById('carInput').value,
        comments: document.getElementById('commentsInput').value
    };
    try{
        const res = await fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify(formData) });
        const data = await res.json();
        if(data.result==='success'){ successMessage.style.display='block'; globalError.style.display='none'; bookingForm.reset(); renderCalendar(currentMonth,currentYear); timeInput.innerHTML=''; selectedDate=null;}
        else { globalError.textContent=data.message; globalError.style.display='block'; successMessage.style.display='none'; }
    } catch(err){ console.error(err); globalError.style.display='block'; successMessage.style.display='none'; }
});

// Инициализация
renderCalendar(currentMonth,currentYear);
checkBookingStatus();
