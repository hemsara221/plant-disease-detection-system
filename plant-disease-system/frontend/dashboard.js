let apiKey = ""; 
let userName = localStorage.getItem('plant_user_name') || "";
let userLocation = localStorage.getItem('plant_user_location') || "";
let currentResolvedCity = "";

window.onload = async function () {
    console.log("Dashboard initializing...");
    // 1. Fetch Config from Backend
    await fetchConfig();

    // 2. Check for User Name (Avoid placeholders)
    const placeholderNames = ['', 'user', 'Guest', 'guest', 'null', 'undefined'];
    
    console.log("Current user:", userName);

    if (!userName || placeholderNames.includes(userName.trim())) {
        console.log("No valid user found. Showing login prompt.");
        document.getElementById('login-prompt').style.display = 'flex';
    } else {
        console.log("User verified. Hiding prompt.");
        document.getElementById('login-prompt').style.display = 'none';
        updateWelcomeMessages();
        initWeather();
    }
};

async function fetchConfig() {
    try {
        const response = await fetch('http://localhost:5000/config');
        const data = await response.json();
        apiKey = data.OPENWEATHER_API_KEY;
    } catch (error) {
        console.error("Error fetching config:", error);
    }
}

function handleLogin(event) {
    if (event) event.preventDefault();
    const nameInput = document.getElementById('login-user-name');
    userName = nameInput.value.trim();
    
    if (userName) {
        localStorage.setItem('plant_user_name', userName);
        document.getElementById('login-prompt').style.display = 'none';
        updateWelcomeMessages();
        initWeather();
    }
}

function updateWelcomeMessages() {
    const welcomeSpan = document.getElementById('welcome-username');
    const chatWelcomeSpan = document.getElementById('chat-welcome-username');
    if (welcomeSpan) welcomeSpan.innerText = userName;
    if (chatWelcomeSpan) chatWelcomeSpan.innerText = userName;
}

function logout() {
    localStorage.removeItem('plant_user_name');
    userName = "";
    location.reload();
}

function initWeather() {
    // First Priority: Try Device Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.warn("Geolocation denied or failed. Falling back to saved location.");
                handleLocationFallback();
            }
        );
    } else {
        handleLocationFallback();
    }
}

function handleLocationFallback() {
    if (userLocation && userLocation !== "") {
        console.log("Using saved location:", userLocation);
        fetchWeatherByCity(userLocation);
    } else {
        console.log("No saved location or geolocation. Defaulting to Colombo.");
        fetchWeatherByCity("Colombo"); 
    }
}

async function fetchWeatherByCity(city) {
    if (!apiKey) return;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    await execWeatherFetch(url);
}

async function fetchWeatherByCoords(lat, lon) {
    if (!apiKey) return;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    await execWeatherFetch(url);
}

async function execWeatherFetch(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            updateWeatherUI(data);
            // Fetch Forecast
            fetchForecast(url.includes('lat=') ? `lat=${data.coord.lat}&lon=${data.coord.lon}` : `q=${encodeURIComponent(data.name)}`);
        } else {
            console.error("Weather API error:", data.message);
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
    }
}

async function fetchForecast(query) {
    if (!apiKey) return;
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?${query}&units=metric&appid=${apiKey}`);
        const data = await response.json();
        if (data.cod === "200") {
            updateForecastUI(data);
        }
    } catch (error) {
        console.error("Error fetching forecast:", error);
    }
}

function updateWeatherUI(data) {
    currentResolvedCity = data.name;
    document.querySelector('.location').innerText = `${data.name}, ${data.sys.country}`;
    document.querySelector('.temperature').innerText = `${Math.round(data.main.temp)}°C`;
    document.querySelector('.condition').innerText = data.weather[0].description;

    const iconCode = data.weather[0].icon;
    document.querySelector('.weather-icon').innerText = getWeatherEmoji(iconCode);

    const detailItems = document.querySelectorAll('.detail-item span:last-child');
    if (detailItems.length >= 4) {
        detailItems[0].innerText = `${data.main.humidity}%`;
        detailItems[1].innerText = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
        detailItems[2].innerText = data.rain ? `${data.rain['1h'] || 0}mm` : '0mm';
        detailItems[3].innerText = 'N/A';
    }
}

function updateForecastUI(data) {
    const forecastContainer = document.querySelector('.forecast-container');
    if (!forecastContainer) return;
    forecastContainer.innerHTML = ''; 

    const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);

    dailyData.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const icon = getWeatherEmoji(day.weather[0].icon);
        const temp = Math.round(day.main.temp);

        const dayEl = document.createElement('div');
        dayEl.className = 'forecast-day';
        dayEl.innerHTML = `
                    <div>${dayName}</div>
                    <div>${icon}</div>
                    <div class="forecast-temp">${temp}°</div>
                `;
        forecastContainer.appendChild(dayEl);
    });
}

function getWeatherEmoji(iconCode) {
    const map = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌦️', '09n': '🌧️',
        '10d': '🌧️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️'
    };
    return map[iconCode] || '🌡️';
}

function saveLocation() {
    if (!currentResolvedCity || currentResolvedCity === "") {
        alert("Wait for weather data to load before saving.");
        return;
    }

    localStorage.setItem('plant_user_location', currentResolvedCity);
    userLocation = currentResolvedCity;
    alert("Location Saved Successfully (locally)!");
}
// ==========================================
// CHATBOT LOGIC
// ==========================================

let chatHistory = JSON.parse(localStorage.getItem('plantChatHistory') || '[]');
let currentChat = { id: Date.now(), title: "New Chat", messages: [] };

document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
});

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input ? input.value.trim() : "";
    if (!message) return;

    const welcome = document.getElementById('welcome-screen');
    if (welcome && welcome.style.display !== 'none') {
        welcome.style.opacity = '0';
        setTimeout(() => {
            welcome.style.display = 'none';
        }, 300);
    }
    if (input) input.value = '';

    addMessage('user', message);
    currentChat.messages.push({ role: 'user', content: message });

    if (currentChat.messages.length === 1) {
        currentChat.title = message.length > 25 ? message.substring(0, 25) + "..." : message;
    }

    const loader = document.getElementById('chat-loading');
    if (loader) loader.style.display = 'flex';
    scrollToBottom();

    try {
        const response = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: currentChat.messages.slice(0, -1)
            })
        });

        const data = await response.json();
        if (loader) loader.style.display = 'none';

        if (data.success) {
            addMessage('ai', data.response);
            currentChat.messages.push({ role: 'model', content: data.response });
            saveToHistory();
        } else {
            addMessage('ai', "I'm sorry, I'm having trouble connecting right now.");
        }
    } catch (error) {
        if (loader) loader.style.display = 'none';
        addMessage('ai', "Connection error. Please ensure the backend (app.py) is running.");
        console.error(error);
    }
    scrollToBottom();
}

function addMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    if (sender === 'ai') {
        msgDiv.innerHTML = text;
    } else {
        msgDiv.innerText = text;
    }
    chatMessages.appendChild(msgDiv);
}

function scrollToBottom() {
    const container = document.getElementById('chat-container');
    if (container) container.scrollTop = container.scrollHeight;
}

function saveToHistory() {
    const existingIndex = chatHistory.findIndex(c => c.id === currentChat.id);
    if (existingIndex > -1) {
        chatHistory[existingIndex] = currentChat;
    } else {
        chatHistory.unshift(currentChat);
    }
    localStorage.setItem('plantChatHistory', JSON.stringify(chatHistory.slice(0, 10)));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (chatHistory.length === 0) {
        historyList.innerHTML = '<p class="no-history">No recent chats found.</p>';
        return;
    }

    historyList.innerHTML = '';
    chatHistory.forEach((chat, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.onclick = () => loadChat(index);
        item.innerHTML = `<div class="history-name">${chat.title}</div>`;
        historyList.appendChild(item);
    });
}

function loadChat(index) {
    currentChat = chatHistory[index];
    const chatMessages = document.getElementById('chat-messages');
    const welcome = document.getElementById('welcome-screen');

    if (welcome) welcome.style.display = 'none';
    if (chatMessages) {
        chatMessages.innerHTML = '';
        currentChat.messages.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'ai';
            addMessage(sender, msg.content);
        });
    }
    scrollToBottom();
}

function newChat() {
    currentChat = { id: Date.now(), title: "New Chat", messages: [] };
    const chatMessages = document.getElementById('chat-messages');
    const welcome = document.getElementById('welcome-screen');

    if (chatMessages) chatMessages.innerHTML = '';
    if (welcome) {
        welcome.style.display = 'block';
        welcome.style.opacity = '1';
    }
    scrollToBottom();
}

function clearHistory() {
    if (confirm("Are you sure you want to clear all chat history?")) {
        chatHistory = [];
        localStorage.removeItem('plantChatHistory');
        renderHistory();
        newChat();
    }
}
