# Plant Disease Detection System - Setup Guide

This system uses a Python Flask backend for disease prediction and a modern HTML/CSS/JS frontend for the user interface.

## 1. Prerequisites
- Python 3.8+
- [Optional] VS Code or any code editor
-  `.h5` model file
- Google AI Studio API Key (for Gemini), Openweather API Key(to fetch weather forcast)

## 2. Directory Structure
```text
/system
  ├── /backend
  │    ├── /model
  │    │     └── plant_disease_model.h5
  │    ├── app.py (Main script)
  │    ├── gemini_utils.py
  │    ├── model_utils.py
  │    ├── requirements.txt
  │    └── .env           <------------- add api keys in here
  ├── /frontend
  │    ├── dashboard.css
  │    ├── dashboard.html
  │    ├── dashboard.js
  │    ├── detector.css
  │    ├── detector.html
  │    ├── detector.js
  │    ├── logo.png
  │    ├── sidebar.css
  │    └── sidebar.js
  └── /database         <------------------add images to show for reference images when detecting diseases
       ├── /Early Blight(Tomato)
       │    ├── image1.jpg
       │    └── ...
       ├── /Healthy Corn Plant
       │    ├── image1.jpg
       │    └── ...
       ├── /Healthy Potato Plant
       │    ├── image1.jpg
       │    └── ...
       ├── /Healthy Tomato Plant
       │    ├── image1.jpg
       │    └── ...
       ├── /Late Blight(Potato)
       │    ├── image1.jpg
       │    └── ...
       ├── /Leaf Blight(Corn)
       │    ├── image1.jpg
       │    └── ...
       ├── /Leaf Mold(Tomato)
       │    ├── image1.jpg
       │    └── ...
       └── /Leaf Rust(Corn)
            ├── image1.jpg
            └── ...

```

## 3. Setup Steps
1. **Model**: Set your model name to `plant_disease_model.h5` and place it in `backend/model/`.
2. **API Key**: Open `backend/.env` and add your Google AI Studio API key and Openweather API.
3. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. **Class Names**: Open `backend/model_utils.py` and update the `CLASS_NAMES` list to match the classes your model was trained on.

## 4. How to Run
1. **Start the Backend**:
   ```bash
   cd backend
   tf_env\Scripts\activate   <--------(only run if you using a virtual environment)
   python app.py
   ```
   The server will run on `http://localhost:5000`.

2. **Open the Frontend**:
   Simply open `frontend/dashboard.html` in your web browser.

## 5. Features

Dashborad
- **weather widget**
- **Chatbox**:Ask any questions related to plants.
-**Chat History**: Histry of your previous chats.

Detector
- **Upload/Camera**: Choose between file upload or live webcam capture.
- **Top 4 Predictions**: Visualized with an animated bar chart.
- **AI Advisory**: Detailed report (explanation, treatment, prevention)
- **History**: Local history of previous detections.
- **Responsive**: Works on desktop and mobile.


