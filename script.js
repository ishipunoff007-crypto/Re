// ======== Настройки ========
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc5RyRZefzGEWq_GCg2QM6Bh0uZYvsisptM2hEtQnrKpvn3GFdgbSiN4vXLlzRQaXC/exec"; // <-- вставь URL опубликованного Apps Script
const MAX_WEEKS = 4;

// ======== Элементы DOM ========
const bookingForm = document.getElementById("booking-form");
const dateInput = document.getElementById("date");
const timeSelect = document.getElementById("time");
const statusMessage = document.getElementById("status-message");
const bookingContainer = document.getElementById("booking-container");

// ======== Инициализация ========
document.addEventListener("DOMContentLoaded", async () => {
  await checkBookingStatus();
  setupDatePicker();
});

// ======== Проверка статуса записи ========
async function checkBookingStatus() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBookingStatus`);
    const data = await response.json();

    if (!data.isActive) {
      bookingContainer.classList.add("booking-paused");
      statusMessage.innerText = "Запись временно приостановлена.";
    } else {
      bookingContainer.classList.remove("booking-paused");
      statusMessage.innerText = "";
    }
  } catch (err) {
    console.error("Ошибка проверки статуса:", err);
  }
}

// ======== Настройка выбора даты ========
function setupDatePicker() {
  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  const maxDate = new Date();
  maxDate.setDate(today.getDate() + MAX_WEEKS * 7);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  dateInput.min = minDate;
  dateInput.max = maxDateStr;

  dateInput.addEventListener("change", loadAvailableTimes);
}

// ======== Загрузка доступных слотов времени ========
async function loadAvailableTimes() {
  const selectedDate = dateInput.value;
  if (!selectedDate) return;

  timeSelect.innerHTML = '<option disabled selected>Загрузка...</option>';

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAvailableSlots&date=${selectedDate}`);
    const data = await response.json();

    timeSelect.innerHTML = "";

    if (data.isDayOff) {
      timeSelect.innerHTML = '<option disabled>Выходной день</option>';
      return;
    }

    if (data.availableSlots.length === 0) {
      timeSelect.innerHTML = '<option disabled>Нет доступного времени</option>';
      return;
    }

    data.availableSlots.forEach(time => {
      const option = document.createElement("option");
      option.value = time;
      option.textContent = time;
      timeSelect.appendChild(option);
    });

  } catch (err) {
    console.error("Ошибка загрузки времени:", err);
    timeSelect.innerHTML = '<option disabled>Ошибка загрузки</option>';
  }
}

// ======== Отправка формы ========
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    name: bookingForm.name.value.trim(),
    phone: bookingForm.phone.value.trim(),
    date: bookingForm.date.value,
    time: bookingForm.time.value,
    service: bookingForm.service.value,
    carModel: bookingForm.carModel.value,
    comments: bookingForm.comments.value.trim(),
    timestamp: new Date().toISOString()
  };

  // Проверка обязательных полей
  if (!formData.name || !formData.phone || !formData.date || !formData.time) {
    alert("Пожалуйста, заполните все обязательные поля.");
    return;
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.result === "success") {
      alert(result.message || "Запись успешно создана!");
      bookingForm.reset();
      timeSelect.innerHTML = "";
    } else {
      alert(result.message || "Ошибка при записи.");
    }

  } catch (err) {
    console.error("Ошибка отправки данных:", err);
    alert("Ошибка соединения с сервером. Попробуйте позже.");
  }
});
