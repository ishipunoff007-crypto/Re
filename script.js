// ======= CONFIG =======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzc5RyRZefzGEWq_GCg2QM6Bh0uZYvsisptM2hEtQnrKpvn3GFdgbSiN4vXLlzRQaXC/exec";

// ======= UTILS =======
async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Fetch error:", err);
        return null;
    }
}

// ======= INIT =======
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("bookingForm");
    const dateInput = document.getElementById("dateInput");
    const timeSelect = document.getElementById("timeInput");

    // Проверка и установка min для даты
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;

        // Обработчик изменения даты для обновления слотов
        dateInput.addEventListener("change", async () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) return;

            const data = await fetchJSON(`${WEB_APP_URL}?action=getAvailableSlots&date=${selectedDate}`);
            if (!data || data.result !== "success") {
                console.error("Ошибка получения слотов:", data);
                return;
            }

            // Очистка и генерация новых слотов
            if (timeSelect) {
                timeSelect.innerHTML = "";
                data.availableSlots.forEach(slot => {
                    const option = document.createElement("option");
                    option.value = slot;
                    option.textContent = slot;
                    timeSelect.appendChild(option);
                });

                if (data.availableSlots.length === 0) {
                    const option = document.createElement("option");
                    option.value = "";
                    option.textContent = "Нет доступных слотов";
                    timeSelect.appendChild(option);
                }
            }
        });
    }

    // Обработчик формы
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = {
                action: "newBooking",
                name: document.getElementById("nameInput")?.value || "",
                phone: document.getElementById("phoneInput")?.value || "",
                date: dateInput?.value || "",
                time: timeSelect?.value || "",
                service: document.getElementById("serviceInput")?.value || "",
                carModel: document.getElementById("carInput")?.value || "",
                comments: document.getElementById("commentsInput")?.value || ""
            };

            // Проверка обязательных полей
            if (!formData.name || !formData.phone || !formData.date || !formData.time || !formData.service || !formData.carModel) {
                alert("Пожалуйста, заполните все обязательные поля!");
                return;
            }

            const response = await fetchJSON(WEB_APP_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!response) {
                alert("Ошибка соединения с сервером.");
                return;
            }

            if (response.result === "success") {
                alert(response.message || "Запись успешно добавлена!");
                form.reset();
                // Обновляем слоты после записи
                dateInput.dispatchEvent(new Event("change"));
            } else {
                alert(response.message || "Ошибка при добавлении записи");
            }
        });
    }

    // Проверка статуса записи
    checkBookingStatus();
});

// ======= CHECK STATUS =======
async function checkBookingStatus() {
    const statusData = await fetchJSON(`${WEB_APP_URL}?action=getBookingStatus`);
    if (!statusData || statusData.result !== "success") {
        console.warn("Не удалось получить статус записи");
        return;
    }

    if (!statusData.isActive) {
        alert("Запись временно приостановлена. Пожалуйста, попробуйте позже.");
        const form = document.getElementById("bookingForm");
        if (form) form.querySelectorAll("input, select, button, textarea").forEach(el => el.disabled = true);
    }
}

