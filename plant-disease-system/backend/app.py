from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
from model_utils import load_trained_model, preprocess_image, predict_disease
from gemini_utils import get_plant_advisory, get_plant_chat_response
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
# Database folder is in the parent directory of 'backend'
DATABASE_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATABASE_FOLDER, exist_ok=True)

# Load model once at startup
model = load_trained_model()

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    try:
        # Preprocess and Predict
        img_array = preprocess_image(filepath)
        top_predictions = predict_disease(model, img_array)
        
        # Cleanup uploaded file
        # os.remove(filepath) 
        
        return jsonify({
            "success": True,
            "predictions": top_predictions,
            "image_url": f"http://localhost:5000/uploads/{filename}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/advisory', methods=['GET'])
def advisory():
    disease_name = request.args.get('disease')
    if not disease_name:
        return jsonify({"error": "Disease name required"}), 400
    
    try:
        advice = get_plant_advisory(disease_name)
        return jsonify({"success": True, "advice": advice})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/samples', methods=['GET'])
def get_samples():
    disease_name = request.args.get('disease')
    if not disease_name:
        return jsonify({"error": "Disease name required"}), 400
    
    # Path to database/{disease_name}
    plant_path = os.path.join(DATABASE_FOLDER, disease_name)
    if not os.path.exists(plant_path):
        return jsonify({"success": True, "samples": []})
    
    try:
        samples = [f for f in os.listdir(plant_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
        # Return URLs to the samples
        sample_urls = [f"http://localhost:5000/database/{disease_name}/{f}" for f in samples]
        return jsonify({"success": True, "samples": sample_urls})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/database/<path:filename>')
def serve_database_file(filename):
    from flask import send_from_directory
    return send_from_directory(DATABASE_FOLDER, filename)

@app.route('/config', methods=['GET'])
def get_config():
    return jsonify({
        "OPENWEATHER_API_KEY": os.getenv("OPENWEATHER_API_KEY")
    })

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message')
    history = data.get('history', [])
    
    if not message:
        return jsonify({"error": "Message required"}), 400
    
    try:
        response = get_plant_chat_response(message, history)
        return jsonify({"success": True, "response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    from flask import send_from_directory
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
