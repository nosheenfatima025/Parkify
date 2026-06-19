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
# Warm-up: pehli inference call hamesha bohat slow hoti hai (~15-20 sec)
# kyunke EasyOCR andar hi andar lazy initialization karta hai.
# Yeh dummy call abhi karwa lete hain taake real requests fast (1-2 sec) hon.
_warmup_img = np.zeros((50, 200), dtype=np.uint8)
reader.readtext(_warmup_img)
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
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

@app.after_request
def after_request(response):
    return add_cors_headers(response)


def smart_fix(text):
    """Pakistani plate: ABC-1234 ya AAA-000"""
    text = text.upper().strip()
    text = re.sub(r'[^A-Z0-9]', '', text)

    if len(text) < 4:
        return ""

    number_fixes = {
        'O': '0', 'Q': '0', 'C': '0', 'D': '0',
        'I': '1', 'L': '1',
        'Z': '2', 'E': '3',
        'S': '5', 'G': '6',
        'T': '7', 'B': '8',
    }

    # Pehle 3 chars = letter part
    rev = {'0': 'O', '1': 'I', '5': 'S', '8': 'B', '6': 'G'}
    letter_part = ""
    for i in range(min(3, len(text))):
        ch = text[i]
        letter_part += rev.get(ch, ch) if ch.isdigit() else ch

    # Baaki = number part
    number_part = text[3:]
    fixed_num = "".join(number_fixes.get(ch, ch) for ch in number_part)

    if not fixed_num:
        return ""

    # Agar number part mein abhi bhi letters bache hain (jo number_fixes
    # map nahi kar saka, e.g. 'H'), to wo junk/extra characters hain —
    # unhe trailing se hata do
    fixed_num = re.sub(r'[A-Z]+$', '', fixed_num)

    if not fixed_num:
        return ""

    result = f"{letter_part}-{fixed_num}"

    # Final strict validation: sirf Pakistani plate format accept karo
    # (2-3 letters, dash, 3-4 digits) — warna reject
    if not re.fullmatch(r'[A-Z]{2,3}-\d{3,4}', result):
        return ""

    return result


def clean_plate(text):
    text = text.upper().strip()
    text = re.sub(r'[^A-Z0-9\s]', ' ', text)

    # Ignore words hatao
    words = text.split()
    filtered = [w for w in words if w not in IGNORE_WORDS and len(w) >= 2]
    text = " ".join(filtered)

    if not text.strip():
        return ""

    print(f"  After filter: '{text}'")

    # Pakistani patterns
    patterns = [
        r'[A-Z]{3}\s?\d{4}',   # AAA1234
        r'[A-Z]{3}\s?\d{3}',   # AAA123
        r'[A-Z]{2}\s?\d{4}',   # AA1234
        r'[A-Z]{2}\s?\d{3}',   # AA123
    ]

    # Direct match
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            raw = re.sub(r'\s+', '', match.group())
            # Format: ABC-1234
            letters = re.match(r'^([A-Z]+)', raw).group(1)
            numbers = raw[len(letters):]
            return f"{letters}-{numbers}"

    # Smart fix try karo on each token — best valid plate lo
    candidates = []
    for token in text.split():
        if token in IGNORE_WORDS:
            continue
        fixed = smart_fix(token)
        print(f"  smart_fix('{token}') = '{fixed}'")
        if fixed:
            candidates.append(fixed)

    if not candidates:
        return ""

    # Prefer tokens with numbers (real plate has digits)
    def has_digits(s):
        return sum(c.isdigit() for c in s)

    best = max(candidates, key=lambda s: (has_digits(s), len(s)))
    return best


def preprocess_fast(plate_img):
    arr = np.array(plate_img)
    # 4x resize for better OCR
    arr = cv2.resize(arr, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    # Sharpen karo
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    gray = cv2.filter2D(gray, -1, kernel)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    enhanced = clahe.apply(gray)
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def ocr_fast(img_array):
    """OCR with multiple attempts"""
    try:
        # Attempt 1: normal
        results = reader.readtext(
            img_array,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            paragraph=False,
            decoder='greedy',
        )
        texts = [text.upper() for (_, text, score) in results if score > 0.05]
        combined = " ".join(texts)
        
        if combined.strip():
            return combined
            
        # Attempt 2: inverted image
        if len(img_array.shape) == 2:
            inv = cv2.bitwise_not(img_array)
        else:
            inv = cv2.bitwise_not(img_array)
        results2 = reader.readtext(
            inv,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            paragraph=False,
            decoder='greedy',
        )
        texts2 = [text.upper() for (_, text, score) in results2 if score > 0.05]
        return " ".join(texts2)
        
    except Exception as e:
        print(f"OCR error: {e}")
        return ""


@app.route('/detect', methods=['POST', 'OPTIONS'])
def detect_plate():
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response('', 200))

    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image provided'}), 400

        file = request.files['image']
        img_bytes = file.read()

        pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')

        # ✅ SPEED: resize if too large
        w, h = pil_img.size
        if w > 1280:
            ratio = 1280 / w
            pil_img = pil_img.resize((1280, int(h * ratio)), Image.LANCZOS)

        print(f"\n=== Detection: {pil_img.size} ===")

        # YOLO
        results = model(pil_img, conf=0.2, verbose=False, imgsz=640)
        plates = []

        for result in results:
            if result.boxes is None or len(result.boxes) == 0:
                continue

            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])

                pad = 8
                x1 = max(0, x1 - pad)
                y1 = max(0, y1 - pad)
                x2 = min(pil_img.width, x2 + pad)
                y2 = min(pil_img.height, y2 + pad)

                plate_img = pil_img.crop((x1, y1, x2, y2))
                processed = preprocess_fast(plate_img)

                raw_text = ocr_fast(processed)
                print(f"OCR RAW: '{raw_text}'")

                plate_text = clean_plate(raw_text)
                print(f"PLATE: '{plate_text}'")

                if plate_text and len(plate_text) >= 4:
                    plates.append({
                        'plate': plate_text,
                        'confidence': round(conf * 100, 1),
                    })

        if plates:
            best = max(plates, key=lambda x: x['confidence'])
            print(f"✅ RESULT: {best['plate']} ({best['confidence']}%)")
            return jsonify({'success': True, 'plate': best['plate'],
                          'confidence': best['confidence'], 'all_plates': plates})

        # Fallback: full image
        print("YOLO miss — full OCR...")
        full_arr = np.array(pil_img)
        raw_text = ocr_fast(full_arr)
        print(f"FULL OCR: '{raw_text}'")
        full_plate = clean_plate(raw_text)
        print(f"FULL PLATE: '{full_plate}'")

        if full_plate:
            return jsonify({'success': True, 'plate': full_plate, 'confidence': 50,
                          'all_plates': [{'plate': full_plate, 'confidence': 50}]})

        return jsonify({'success': False, 'message': 'No plate detected', 'plate': None})

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'model': 'YOLOv8 ANPR', 'ocr': 'EasyOCR'})

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'Parkify ANPR Service', 'endpoints': ['/health', '/detect']})

if __name__ == '__main__':
    print("Starting Flask ANPR service on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)