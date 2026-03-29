let chart = null;
let currentStream = null;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const imagePreview = document.getElementById('image-preview');
const previewContainer = document.getElementById('preview-container');
const predictBtn = document.getElementById('predict-btn');
const loading = document.getElementById('loading');
const advisorySection = document.getElementById('ai-advisory');
const advisoryContent = document.getElementById('advisory-content');
const videoList = document.getElementById('video-list');
// const sampleGrid = document.getElementById('sample-grid');
const cameraFeed = document.getElementById('camera-feed');
const cameraCanvas = document.getElementById('camera-canvas');
const historyList = document.getElementById('history-list');
const clearBtn = document.getElementById('clear-btn');

// Initialize Chart
function initChart(data = []) {
    const ctx = document.getElementById('prediction-chart').getContext('2d');
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Confidence %',
                data: data.map(d => (d.confidence * 100).toFixed(1)),
                backgroundColor: ['#1B5E20', '#2E7D32', '#43A047', '#66BB6A'],
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, max: 100 } }
        }
    });
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tab === 'upload') {
        document.querySelector('.tab-btn[onclick*="upload"]').classList.add('active');
        document.getElementById('upload-section').classList.add('active');
        document.getElementById('upload-section').style.display = 'block';
        document.getElementById('camera-section').style.display = 'none';
        stopCamera();


    } else {
        document.querySelector('.tab-btn[onclick*="camera"]').classList.add('active');
        document.getElementById('camera-section').classList.add('active');
        document.getElementById('camera-section').style.display = 'block';
        document.getElementById('upload-section').style.display = 'none';
        startCamera();


    }
}

// Camera Logic
async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraFeed.srcObject = currentStream;
    } catch (err) {
        alert("Could not access camera: " + err.message);
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
}

async function captureImage() {
    cameraCanvas.width = cameraFeed.videoWidth;
    cameraCanvas.height = cameraFeed.videoHeight;
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraFeed, 0, 0);

    cameraCanvas.toBlob(blob => {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        processPrediction(file);
    }, 'image/jpeg');
}

// Upload/Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    predictBtn.onclick = () => processPrediction(file);
}

// Main Prediction Flow
async function processPrediction(file) {
    loading.classList.remove('hidden');
    advisorySection.classList.add('hidden');

    // Show loading for chart
    const chartCtx = document.getElementById('prediction-chart').getContext('2d');
    chartCtx.clearRect(0, 0, chartCtx.canvas.width, chartCtx.canvas.height);
    chartCtx.font = "16px Outfit";
    chartCtx.fillStyle = "#666";
    chartCtx.textAlign = "center";
    chartCtx.fillText("Computing Neural Scores...", chartCtx.canvas.width / 2, chartCtx.canvas.height / 2);

    const formData = new FormData();
    formData.append('image', file);

    try {
        // 1. Predict Disease
        const res = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            const predictions = data.predictions;
            initChart(predictions);
            addToHistory(predictions[0].name, data.image_url);


            // 2. Get AI Advisory
            fetchAdvisory(predictions[0].name);

            // 3. Load Sample Images
            loadSamples(predictions[0].name);
        }
    } catch (err) {
        console.error(err);
        alert("Prediction failed. Make sure the backend is running.");
    } finally {
        // loading.classList.add('hidden');
    }
}

async function fetchAdvisory(diseaseName) {

    loading.classList.remove('hidden');
    const sampleContainer = document.getElementById('sample-images');
    sampleContainer.innerHTML = '<div class="spinner-small"></div>';
    
    try {
        
        const res = await fetch(`http://localhost:5000/advisory?disease=${encodeURIComponent(diseaseName)}`);
        const data = await res.json();

        if (data.success) {
            renderAdvisory(data.advice,diseaseName);
            loading.classList.add('hidden');
            advisorySection.classList.remove('hidden');
        }
    } catch (err) {
        loading.classList.add('hidden');
        advisoryContent.innerHTML = '<p class="error">Failed to fetch advisory.</p>';
        console.error(err);
    }
}

function renderAdvisory(rawText, diseaseName) {
    try {
        // 1. Remove the tags and potential "json" label
        let cleanText = rawText.replace(/\\s*(json)?/gi, '');

        // 2. Extract JSON object
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const advice = JSON.parse(jsonMatch[0]);

            // Helper to convert **bold** markdown to <b> tags
            const parseMarkdown = (text) => {
                if (!text) return '';
                return text
                    // Handle Bold: **text** -> <b>text</b>
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    // Handle Italics: *text* -> <i>text</i>
                    .replace(/\*(.*?)\*/g, '<i>$1</i>')
                    // Handle shorthand "n1.", "n2." -> Newline + "1.", "2."
                    .replace(/n(\d+\.)/g, '<br>$1')
                    // Handle standard newlines: \n -> <br>
                    .replace(/\n/g, '<br>');
            };

            loading.classList.add('hidden');
            advisoryContent.innerHTML = `
                    <div class="advice-block">
                    <div class="advice-header">
                    <h3>Name: ${diseaseName}</h3>
                    </div>

                    <div class="advice-header">
                    <span class=" theme-icon material-symbols-rounded">front_hand</span>
                    <h3>Explanation:</h3>
                    </div>
                    <div class="markdown-content">${parseMarkdown(advice.explanation)}</div>
                    
                    <div class="advice-header">
                    <span class=" theme-icon material-symbols-rounded">saved_search</span>
                    <h3>Causes:</h3>
                    </div>
                    <div class="markdown-content">${parseMarkdown(advice.causes)}</div>
                    
                    <div class="advice-header">
                    <span class=" theme-icon material-symbols-rounded">healing</span>
                    <h3>Treatment:</h3>
                    </div>
                    <div class="markdown-content">${parseMarkdown(advice.treatment)}</div>
                    
                    <div class="advice-header">
                    <span class=" theme-icon material-symbols-rounded">health_and_safety</span>
                    <h3>Prevention:</h3>
                    </div>
                    <div class="markdown-content">${parseMarkdown(advice.prevention)}</div>
                    <br><center><strong>...</strong></center>
                </div>
            `;

        } else {
            advisoryContent.innerText = rawText;
        }
    } catch (err) {
        console.error("Formatting error:", err);
        advisoryContent.innerText = rawText;
    }
}

//loading sample images
async function loadSamples(diseaseName) {
    const sampleContainer = document.getElementById('sample-images');
    sampleContainer.innerHTML = '<div class="spinner-small"></div>';

    try {
        const res = await fetch(`http://localhost:5000/samples?disease=${encodeURIComponent(diseaseName)}`);
        const data = await res.json();

        if (data.success && data.samples.length > 0) {
            sampleContainer.innerHTML = '';

            // 1. Copy the array to avoid mutating original data
            // 2. Sort it randomly
            // 3. Take the first 5
            const randomSamples = [...data.samples]
                .sort(() => Math.random() - 0.5)
                .slice(0, 5);

            randomSamples.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'sample-thumb';
                img.onclick = () => openModal(url);
                sampleContainer.appendChild(img);
            });
        } else {
            sampleContainer.innerHTML = '<p class="empty-state">No reference images available</p>';
        }
    } catch (err) {
        sampleContainer.innerHTML = '<p class="error">Failed to load samples</p>';
    }
}

// Modal Logic
function closeModal() {
    document.getElementById('image-modal').classList.add('hidden');

}

function openModal(url) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    modal.classList.remove('hidden');
    modalImg.src = url;
}

// History Management
function addToHistory(name, imageUrl) {
    const history = JSON.parse(localStorage.getItem('plant_history') || '[]');
    const newItem = { name, imageUrl, time: new Date().toLocaleString() };
    history.unshift(newItem);
    localStorage.setItem('plant_history', JSON.stringify(history.slice(0, 5)));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('plant_history') || '[]');
    historyList.innerHTML = history.length ? '' : '<p class="empty-state">No recent detections</p>';

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <img src="${item.imageUrl}" class="history-thumb">
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.time}</small>
            </div>
        `;
        historyList.appendChild(div);
    });
}

function clearHistory() {
    // 1. Remove the data from the browser's permanent storage
    localStorage.removeItem('plant_history');

    // 2. Refresh the UI to show the 'No recent detections' state
    renderHistory();
}



// Init
initChart();
renderHistory();
