from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import os
import shutil
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

# Import blueprints and modules
from auth.routes import auth_bp
from upload_and_summary.landmark_detection import (
    detect_landmark_google_vision,
    predict_landmark_custom_model
)
from upload_and_summary.summary_generator import get_openai_summary, generate_audio_summary
from upload_and_summary.places import find_nearby_places
from upload_and_summary.map_generator import generate_custom_leaflet_map_from_api_output

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads")
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_LANGUAGES = {"en", "hi", "kn", "ta", "te"}

def safe_upload_name(original_name):
    suffix = Path(original_name or "").suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        return None
    return f"{uuid.uuid4().hex}{suffix}"

def safe_audio_filename(landmark, language):
    safe_landmark = "".join(ch if ch.isalnum() else "_" for ch in landmark).strip("_")[:80]
    if not safe_landmark:
        return None
    safe_language = language if language in ALLOWED_LANGUAGES else "en"
    return f"summary_{safe_landmark}_{safe_language}.mp3"

def resolve_upload_file(filename):
    basename = Path(filename or "").name
    if not basename or basename != filename:
        return None
    candidate = (UPLOAD_FOLDER / basename).resolve()
    upload_root = UPLOAD_FOLDER.resolve()
    if upload_root not in candidate.parents or not candidate.is_file():
        return None
    return candidate

def create_app():
    app = Flask(__name__)
    secret_key = os.getenv('SECRET_KEY')
    if not secret_key or len(secret_key) < 32:
        raise RuntimeError("SECRET_KEY must be configured and at least 32 characters")
    app.secret_key = secret_key
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
    
    # Enable CORS for Next.js frontend
    CORS(app, resources={r"/*": {"origins": os.getenv('FRONTEND_URL')}}, supports_credentials=True)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    @app.route('/')
    def index():
        return jsonify({"message": "Tourism API is running"})
    
    @app.route('/detect_landmark/', methods=['POST'])
    def detect_landmark():
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image = request.files['image']
        filename = safe_upload_name(secure_filename(image.filename))
        if not filename:
            return jsonify({"error": "Only JPEG, PNG, or WebP images are allowed"}), 400
        file_path = UPLOAD_FOLDER / filename
        image.save(file_path)

        vision_result = detect_landmark_google_vision(str(file_path))
        if vision_result:
            return jsonify(vision_result)

        predicted, lat, lng = predict_landmark_custom_model(str(file_path))
        return jsonify({"name": predicted, "lat": lat, "lng": lng})

    @app.route('/generate_summary/', methods=['POST'])
    def generate_summary():
        landmark = request.form.get('landmark')
        language = request.form.get('language', 'en')
        language = language if language in ALLOWED_LANGUAGES else "en"
        
        if not landmark:
            return jsonify({"error": "Landmark name is required"}), 400
            
        summary = get_openai_summary(landmark, language)
        audio_filename = safe_audio_filename(landmark, language)
        if not audio_filename:
            return jsonify({"error": "Landmark name is invalid"}), 400
        audio_path = UPLOAD_FOLDER / audio_filename
        generate_audio_summary(summary, language, save_path=str(audio_path))
        return jsonify({"summary": summary, "audio_file": audio_filename})

    @app.route('/download_audio/')
    def download_audio():
        filename = request.args.get('file') or request.args.get('path')
        file_path = resolve_upload_file(filename)
        if not file_path:
            return jsonify({"error": "File not found"}), 404
        return send_file(file_path)

    @app.route('/nearby_places/')
    def nearby_places():
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        results = find_nearby_places(lat, lng)
        return jsonify(results)

    @app.route('/generate_map/')
    def generate_map():
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        results = find_nearby_places(lat, lng)
        map_ = generate_custom_leaflet_map_from_api_output(results)
        map_path = UPLOAD_FOLDER / f"leaflet_map_{uuid.uuid4().hex}.html"
        map_.save(map_path)
        return send_file(map_path)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=os.getenv("FLASK_DEBUG") == "1", port=5000)
