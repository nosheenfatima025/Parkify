from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import numpy as np
import io
import os
import re
import easyocr

app = Flask(__name__)

# CORS - allow everything
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

# Load models once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
print("Loading YOLO model...")
model = YOLO(MODEL_PATH)
print("YOLO Model loaded!")

print("Loading EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("EasyOCR loaded!")

def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

@app.after_request
def after_request(response):
    return add_cors_headers(response)

def clean_plate(text):
    text = text.upper().strip()
    text = re.sub(r'[^A-Z0-9\-]', '', text)
    return text

@app.route('/detect', methods=['POST', 'OPTIONS', 'GET'])
def detect_plate():
    # Handle preflight
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        return add_cors_headers(response)

    if request.method == 'GET':
        return jsonify({'message': 'Send POST request with image file'})

    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image provided'}), 400

        file = request.files['image']
        img_bytes = file.read()

        pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')

        # YOLO detection
        results = model(pil_img, conf=0.3)

        plates = []
        for result in results:
            if hasattr(result, 'boxes') and result.boxes is not None:
                for i, box in enumerate(result.boxes):
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])

                    # Crop plate
                    plate_img = pil_img.crop((x1, y1, x2, y2))
                    plate_arr = np.array(plate_img)

                    # EasyOCR
                    try:
                        ocr_results = reader.readtext(plate_arr)
                        plate_text = " ".join([text for (_, text, c) in ocr_results if c > 0.3])
                        plate_text = clean_plate(plate_text)
                    except Exception as ocr_err:
                        print(f"OCR error: {ocr_err}")
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
        else:
            # Try full image OCR
            try:
                full_arr = np.array(pil_img)
                ocr_results = reader.readtext(full_arr)
                full_text = " ".join([text for (_, text, c) in ocr_results if c > 0.4])
                full_text = clean_plate(full_text)
                if full_text:
                    return jsonify({
                        'success': True,
                        'plate': full_text,
                        'confidence': 50.0,
                        'all_plates': [{'plate': full_text, 'confidence': 50.0}]
                    })
            except Exception as e:
                print(f"Full OCR error: {e}")

            return jsonify({
                'success': False,
                'message': 'No plate detected',
                'plate': None
            })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        return add_cors_headers(response)
    return jsonify({'status': 'running', 'model': 'YOLOv8 ANPR', 'ocr': 'EasyOCR'})

@app.route('/', methods=['GET'])
def index():
    return jsonify({'message': 'Parkify ANPR Service', 'endpoints': ['/health', '/detect']})

if __name__ == '__main__':
    print("Starting Flask ANPR service on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)