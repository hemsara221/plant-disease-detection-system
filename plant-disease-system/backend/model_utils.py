import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
import os

# ------------------ CUSTOM LAYER ------------------
class GaussianNoiseLayer(tf.keras.layers.Layer):
    def call(self, inputs, training=False):
        return inputs  # Disable noise during inference


# ------------------ PATH SETUP ------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
target_path = os.path.join(parent_dir, 'database')

# ------------------ CLASS NAMES ------------------
def get_subfolder_names(main_folder_path):
    subfolders = []
    for item in os.listdir(main_folder_path):
        full_path = os.path.join(main_folder_path, item)
        if os.path.isdir(full_path):
            subfolders.append(item)
    return sorted(subfolders)  # 🔥 SORTED = CRITICAL

CLASS_NAMES = get_subfolder_names(target_path)

print(f"Found {len(CLASS_NAMES)} classes:")
print(CLASS_NAMES)


# ------------------ MODEL LOADING ------------------
MODEL_PATH = "model/plant_disease_model.h5"

def load_trained_model():
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(
                MODEL_PATH,
                custom_objects={"GaussianNoiseLayer": GaussianNoiseLayer},
                compile=False
            )
            return model
        except Exception as e:
            print(f"Error loading model: {e}")
            return None
    else:
        print(f"Model file not found at {MODEL_PATH}")
        return None


# ------------------ IMAGE PREPROCESS ------------------
def preprocess_image(img_path):
    img = image.load_img(img_path, target_size=(260, 260))
    img_array = image.img_to_array(img)

    img_array = np.expand_dims(img_array, axis=0)

    # 🔥 CRITICAL FIX (EfficientNet preprocessing)
    img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)

    return img_array


# ------------------ PREDICTION ------------------
def predict_disease(model, img_array):
    if model is None:
        return [
            {"name": "No Model Loaded", "confidence": 1.0},
            {"name": "N/A", "confidence": 0.0},
            {"name": "N/A", "confidence": 0.0},
            {"name": "N/A", "confidence": 0.0}
        ]

    predictions = model.predict(img_array)[0]

    top_indices = np.argsort(predictions)[-4:][::-1]

    top_predictions = []
    for idx in top_indices:
        top_predictions.append({
            "name": CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else f"Unknown Class {idx}",
            "confidence": float(predictions[idx])
        })

    return top_predictions