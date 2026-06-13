from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import numpy as np
import io
import os
import re
import easyocr
import cv2
 
app = Flask(__name__)
 
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)
 
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
 
print("Loading YOLO model...")
model = YOLO(MODEL_PATH)
print("YOLO Model loaded!")
 
print("Loading EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("EasyOCR loaded!")
 
IGNORE_WORDS = {
    "PUNJAB", "SINDH", "KPK", "BALOCHISTAN", "AJK", "GB", "ICT",
    "ISLAMABAD", "LAHORE", "KARACHI", "PAKISTAN", "GOVT", "GOVERNMENT",
    "POLICE", "ARMY", "NAVY", "PAF", "RANGERS", "FC", "NA", "PA",
    "PRIVATE", "TAXI", "BUS", "TRUCK", "LOADER", "SUZUKI", "TOYOTA",
    "HONDA", "CIVIC", "CULTUS", "MEHRAN", "ALTO", "SWIFT"
}
 
 
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = (
        'Content-Type, Authorization, '
        'ngrok-skip-browser-warning, X-Requested-With'
    )
    response.headers['Access-Control-Allow-Methods'] = (
        'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers['Access-Control-Max-Age'] = '3600'
    return response
 
 
@app.after_request
def after_request(response):
    return add_cors_headers(response)
 
 
def clean_plate(text):
    text = text.upper().strip()
 
    # Unwanted characters hataو
    text = re.sub(r'[^A-Z0-9\s-]', '', text)
 
    # ✅ FIX: Har word check karo — ignore list mein hai toh hataو
    words = text.split()
    filtered_words = [w for w in words if w not in IGNORE_WORDS]
    text = " ".join(filtered_words)
 
    # ✅ Pakistani number plate patterns — specific se general ki taraf
    patterns = [
        r'[A-Z]{3}-?\d{4}',       # ABC-1234  (most common)
        r'[A-Z]{3}-?\d{3}',        # ABC-123
        r'[A-Z]{2}-?\d{4}',        # AB-1234
        r'[A-Z]{2}-?\d{3}',        # AB-123
        r'\d{4}-?[A-Z]{2,3}',      # 1234-AB
        r'\d{3}-?[A-Z]{2,3}',      # 123-AB
    ]
 
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group().replace(" ", "")
 
    return ""
 
 
def preprocess_plate_image(plate_img):
    plate_arr = np.array(plate_img)
 
    # ✅ FIX: 2x enlargement kaafi hai — 3x slow tha
    plate_arr = cv2.resize(
        plate_arr, None, fx=2, fy=2,
        interpolation=cv2.INTER_CUBIC
    )
 
    gray = cv2.cvtColor(plate_arr, cv2.COLOR_RGB2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
 
    return gray
 
 
@app.route('/detect', methods=['POST', 'OPTIONS'])
def detect_plate():
 
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        return add_cors_headers(response)
 
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image provided'}), 400
 
        file = request.files['image']
        img_bytes = file.read()
 
        pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
 
        # ✅ FIX: conf 0.3 — zyada plates pakad lega
        results = model(pil_img, conf=0.3, verbose=False)
 
        plates = []
 
        for result in results:
            if result.boxes is None:
                continue
 
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
 
                plate_img = pil_img.crop((x1, y1, x2, y2))
 
                try:
                    processed = preprocess_plate_image(plate_img)
 
                    ocr_results = reader.readtext(
                        processed,
                        allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
                        paragraph=False
                    )
 
                    texts = []
                    for (_, text, score) in ocr_results:
                        if score > 0.4:
                            texts.append(text.upper())
 
                    combined_text = " ".join(texts)
                    print("OCR RAW:", combined_text)
 
                    plate_text = clean_plate(combined_text)
                    print("PLATE:", plate_text)
 
                except Exception as ocr_err:
                    print("OCR Error:", ocr_err)
                    plate_text = ""
 
                if plate_text:
                    plates.append({
                        'plate': plate_text,
                        'confidence': round(conf * 100, 1),
                        'bbox': [x1, y1, x2, y2]
                    })
 
        if plates:
            best = max(plates, key=lambda x: x['confidence'])
            return jsonify({
                'success': True,
                'plate': best['plate'],
                'confidence': best['confidence'],
                'all_plates': plates
            })
 
        try:
            full_arr = np.array(pil_img)
            ocr_results = reader.readtext(
                full_arr,
                allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
                paragraph=False
            )
 
            texts = []
            for (_, text, score) in ocr_results:
                if score > 0.4:
                    texts.append(text.upper())
 
            combined_text = " ".join(texts)
            print("FULL OCR:", combined_text)
 
            full_plate = clean_plate(combined_text)
            print("FULL PLATE:", full_plate)
 
            if full_plate:
                return jsonify({
                    'success': True,
                    'plate': full_plate,
                    'confidence': 50,
                    'all_plates': [{'plate': full_plate, 'confidence': 50}]
                })
 
        except Exception as e:
            print("Full OCR Error:", e)
 
        return jsonify({'success': False, 'message': 'No plate detected', 'plate': None})
 
    except Exception as e:
        print("Error:", e)
        return jsonify({'success': False, 'message': str(e)}), 500
 
 
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'model': 'YOLOv8 ANPR', 'ocr': 'EasyOCR'})
 
 
@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'Parkify ANPR Service', 'endpoints': ['/health', '/detect']})
 
 
if __name__ == '__main__':
    print("Starting Flask ANPR service on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)