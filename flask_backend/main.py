from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request, Response, Header, Cookie
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List
import os
import json
import requests
import shutil
from datetime import datetime, timedelta
from functools import wraps
import uuid
import jwt
from pathlib import Path
from urllib.parse import urlencode
import secrets
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Import backend modules
from upload_and_summary.landmark_detection import (
    detect_landmark_google_vision,
    predict_landmark_custom_model
)
from upload_and_summary.summary_generator import get_openai_summary, generate_audio_summary
from upload_and_summary.places import find_nearby_places
from upload_and_summary.map_generator import generate_custom_leaflet_map_from_api_output

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads")
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_LANGUAGES = {"en", "hi", "kn", "ta", "te"}
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/")
AUTH_COOKIE_NAME = "auth_token"

def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value

SECRET_KEY = require_env("SECRET_KEY")
if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 characters")

def cookie_secure() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() == "production"

# Supabase client setup
supabase_url = require_env("SUPABASE_URL")
supabase_key = require_env("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Create FastAPI app
app = FastAPI(title="Tourism App API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth helper functions
def get_google_provider_cfg():
    discovery_url = os.getenv("GOOGLE_DISCOVERY_URL", "https://accounts.google.com/.well-known/openid-configuration")
    return requests.get(discovery_url, timeout=10).json()

def get_google_auth_url(state: str):
    # Get Google provider configuration
    google_provider_cfg = get_google_provider_cfg()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]

    redirect_uri = f"{BACKEND_URL}/auth/login/callback"
    params = {
        "response_type": "code",
        "client_id": require_env("GOOGLE_CLIENT_ID"),
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
    }
    return f"{authorization_endpoint}?{urlencode(params)}"

def process_google_callback(request: Request):
    # Get auth code from Google
    code = request.query_params.get("code")
    if not code:
        return None, None
    
    # Get token endpoint
    google_provider_cfg = get_google_provider_cfg()
    token_endpoint = google_provider_cfg["token_endpoint"]
    
    # Prepare token request
    token_url = token_endpoint
    redirect_uri = f"{BACKEND_URL}/auth/login/callback"
    
    data = {
        'code': code,
        'client_id': require_env('GOOGLE_CLIENT_ID'),
        'client_secret': require_env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    # Exchange auth code for tokens
    token_response = requests.post(token_url, data=data, timeout=10)
    token_json = token_response.json()
    
    if 'id_token' not in token_json:
        return None, None
    
    # Get user info
    id_info = id_token.verify_oauth2_token(
        token_json['id_token'],
        google_requests.Request(),
        require_env('GOOGLE_CLIENT_ID')
    )
    
    if id_info.get('email_verified'):
        # Extract user info
        user_info = {
            'google_id': id_info['sub'],
            'email': id_info['email'],
            'display_name': id_info.get('name', ''),
            'profile_picture_url': id_info.get('picture', '')
        }
        
        # Create or update user in database
        user = create_or_update_user(user_info)
        
        # Create JWT token for frontend
        token = create_auth_token(user)
        
        return user, token
    else:
        return None, None

def create_or_update_user(user_info):
    # Check if user exists by email
    response = supabase.table('users').select('*').eq('email', user_info['email']).execute()
    
    if len(response.data) > 0:
        # Update existing user
        user_id = response.data[0]['user_id']
        update_data = {
            'display_name': user_info['display_name'],
            'profile_picture_url': user_info['profile_picture_url'],
            'last_login': 'now()'
        }
        
        supabase.table('users').update(update_data).eq('user_id', user_id).execute()
        return response.data[0]
    else:
        # Create new user
        new_user = {
            'user_id': str(uuid.uuid4()),
            'email': user_info['email'],
            'display_name': user_info['display_name'],
            'profile_picture_url': user_info['profile_picture_url'],
            'created_at': 'now()',
            'last_login': 'now()'
        }
        
        response = supabase.table('users').insert(new_user).execute()
        return response.data[0]

def create_auth_token(user):
    payload = {
        'user_id': user['user_id'],
        'email': user['email'],
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def verify_auth_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except:
        return None

def safe_upload_name(original_name: Optional[str]) -> str:
    suffix = Path(original_name or "").suffix.lower()
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        suffix = ".jpg"
    return f"{uuid.uuid4().hex}{suffix}"

async def save_image_upload(image: UploadFile) -> Path:
    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    file_path = UPLOAD_FOLDER / safe_upload_name(image.filename)
    total = 0
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await image.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Image is too large")
                buffer.write(chunk)
    except Exception:
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        raise
    finally:
        await image.close()
    return file_path

def safe_audio_filename(landmark: str, language: str) -> str:
    safe_landmark = "".join(ch if ch.isalnum() else "_" for ch in landmark).strip("_")[:80]
    if not safe_landmark:
        raise HTTPException(status_code=400, detail="Landmark name is invalid")
    safe_language = language if language in ALLOWED_LANGUAGES else "en"
    return f"summary_{safe_landmark}_{safe_language}.mp3"

def resolve_upload_file(filename: str) -> Path:
    basename = Path(filename).name
    if not basename or basename != filename:
        raise HTTPException(status_code=400, detail="Invalid file name")
    candidate = (UPLOAD_FOLDER / basename).resolve()
    upload_root = UPLOAD_FOLDER.resolve()
    if upload_root not in candidate.parents and candidate != upload_root:
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return candidate

# FastAPI Dependency for authentication
async def get_current_user(
    authorization: Optional[str] = Header(None),
    auth_token: Optional[str] = Cookie(None, alias=AUTH_COOKIE_NAME),
):
    token = None
    if authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ', 1)[1]
    elif auth_token:
        token = auth_token

    if not token:
        raise HTTPException(status_code=401, detail="Token is missing")

    data = verify_auth_token(token)
    
    if not data:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user from database
    response = supabase.table('users').select('*').eq('user_id', data['user_id']).execute()
    if len(response.data) == 0:
        raise HTTPException(status_code=401, detail="User not found")
    
    return response.data[0]

# Authentication routes
@app.get("/")
async def index():
    return {"message": "Tourism API is running"}

@app.get("/auth/login")
async def login(request: Request):
    """Redirect to Google OAuth login"""
    state = secrets.token_urlsafe(32)
    auth_url = get_google_auth_url(state)
    response = RedirectResponse(auth_url)
    response.set_cookie(
        "oauth_state",
        state,
        max_age=600,
        httponly=True,
        secure=cookie_secure(),
        samesite="lax",
    )
    return response

@app.get("/auth/login/callback")
async def callback(request: Request):
    """Handle Google OAuth callback"""
    expected_state = request.cookies.get("oauth_state")
    received_state = request.query_params.get("state")
    if not expected_state or not received_state or not secrets.compare_digest(expected_state, received_state):
        return RedirectResponse(f"{FRONTEND_URL}/login?error=invalid_state")

    user, token = process_google_callback(request)
    
    if not user or not token:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=auth_failed")
    
    response = RedirectResponse(f"{FRONTEND_URL}/auth/callback")
    response.delete_cookie("oauth_state")
    response.set_cookie(
        AUTH_COOKIE_NAME,
        token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=cookie_secure(),
        samesite="lax",
    )
    return response

@app.post("/auth/logout")
async def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie(AUTH_COOKIE_NAME)
    return response

@app.get("/auth/user")
async def get_user(current_user: Dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@app.get("/auth/verify-token")
async def verify_token(current_user: Dict = Depends(get_current_user)):
    """Verify if token is valid"""
    return {'valid': True, 'user': current_user}

# Backend functionality routes
@app.post("/detect_landmark/")
async def detect_landmark(image: UploadFile = File(...)):
    file_path = await save_image_upload(image)

    vision_result = detect_landmark_google_vision(str(file_path))
    if vision_result:
        return vision_result

    predicted, lat, lng = predict_landmark_custom_model(str(file_path))
    return {"name": predicted, "lat": lat, "lng": lng}

@app.post("/generate_summary/")
async def generate_summary(landmark: str = Form(...), language: str = Form("en")):
    language = language if language in ALLOWED_LANGUAGES else "en"
    summary = get_openai_summary(landmark, language)
    audio_filename = safe_audio_filename(landmark, language)
    audio_path = UPLOAD_FOLDER / audio_filename
    generate_audio_summary(summary, language, save_path=str(audio_path))
    return {"summary": summary, "audio_file": audio_filename}

@app.get("/download_audio/{filename}")
async def download_audio(filename: str):
    return FileResponse(resolve_upload_file(filename), media_type="audio/mpeg")

@app.get("/nearby_places/")
async def nearby_places(lat: float, lng: float):
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    results = find_nearby_places(lat, lng)
    return results

@app.get("/generate_map/")
async def generate_map(lat: float, lng: float):
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    results = find_nearby_places(lat, lng)
    map_ = generate_custom_leaflet_map_from_api_output(results)
    map_path = UPLOAD_FOLDER / f"leaflet_map_{uuid.uuid4().hex}.html"
    map_.save(map_path)
    return FileResponse(map_path)

# Trips endpoints
@app.post("/trips")
async def create_trip(request: Request, current_user: Dict = Depends(get_current_user)):
    """Create a new trip for the user"""
    try:
        # Parse the request body
        try:
            body = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid request body: {str(e)}")
        
        # Validate required fields
        required_fields = ["lat", "lng", "description", "place_name"]
        missing_fields = [field for field in required_fields if field not in body]
        if missing_fields:
            raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing_fields)}")
        
        # Create trip in database
        new_trip = {
            "trip_id": str(uuid.uuid4()),
            "user_id": current_user["user_id"],
            "lat": body["lat"],
            "lng": body["lng"],
            "description": body["description"],
            "place_name": body["place_name"],
            "start_date": body.get("start_date", datetime.now().isoformat()),
            "end_date": body.get("end_date"),
            "created_at": "now()"
        }
        
        try:
            response = supabase.table('trips').insert(new_trip).execute()
            if not response.data or len(response.data) == 0:
                raise HTTPException(status_code=500, detail="Failed to create trip in database")
        except Exception as db_error:
            raise HTTPException(status_code=500, detail="Database error")
            
        return response.data[0]
    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server error")

@app.get("/trips")
async def get_user_trips(current_user: Dict = Depends(get_current_user)):
    """Get all trips for the current user"""
    try:
        response = supabase.table('trips').select('*').eq('user_id', current_user["user_id"]).order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch trips")

@app.get("/trips/{trip_id}")
async def get_trip_details(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Get details of a specific trip"""
    try:
        # Verify the trip belongs to the user
        response = supabase.table('trips').select('*').eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        if len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Trip not found or does not belong to user")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/trips/{trip_id}")
async def update_trip(trip_id: str, request: Request, current_user: Dict = Depends(get_current_user)):
    """Update a trip"""
    try:
        # Verify the trip belongs to the user
        trip_response = supabase.table('trips').select('*').eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        if len(trip_response.data) == 0:
            raise HTTPException(status_code=404, detail="Trip not found or does not belong to user")
        
        # Parse the request body
        body = await request.json()
        
        # Prepare update data
        update_data = {}
        allowed_fields = ["description", "start_date", "end_date", "place_name"]
        for field in allowed_fields:
            if field in body:
                update_data[field] = body[field]
                
        if not update_data:
            return trip_response.data[0]  # No updates to make
            
        # Add updated_at timestamp
        update_data["updated_at"] = "now()"
        
        # Update the trip
        response = supabase.table('trips').update(update_data).eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a trip"""
    try:
        # Verify the trip belongs to the user
        trip_response = supabase.table('trips').select('*').eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        if len(trip_response.data) == 0:
            raise HTTPException(status_code=404, detail="Trip not found or does not belong to user")
        
        # Delete the trip
        supabase.table('trips').delete().eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        
        return {"message": "Trip deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trips/{trip_id}/complete")
async def complete_trip(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Mark a trip as completed by moving it to journeys table"""
    try:
        # Verify the trip belongs to the user
        trip_response = supabase.table('trips').select('*').eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        if len(trip_response.data) == 0:
            raise HTTPException(status_code=404, detail="Trip not found or does not belong to user")
        
        trip_data = trip_response.data[0]
        
        # Create a new journey record
        journey_data = {
            "journey_id": str(uuid.uuid4()),
            "user_id": current_user["user_id"],
            "lat": trip_data["lat"],
            "lng": trip_data["lng"],
            "description": trip_data["description"],
            "place_name": trip_data["place_name"],
            "start_date": trip_data["start_date"],
            "end_date": trip_data["end_date"],
            "created_at": "now()"
        }
        
        # Insert into journeys table
        journey_response = supabase.table('journeys').insert(journey_data).execute()
        if not journey_response.data or len(journey_response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create journey record")
            
        # Delete the trip from trips table
        supabase.table('trips').delete().eq('trip_id', trip_id).eq('user_id', current_user["user_id"]).execute()
        
        return {"message": "Trip marked as completed and moved to journeys", "journey_id": journey_data["journey_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to complete trip")

@app.get("/journeys/history")
async def get_journey_history(current_user: Dict = Depends(get_current_user)):
    """Get all completed journeys for the current user"""
    try:
        response = supabase.table('journeys').select('*').eq('user_id', current_user["user_id"]).order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch journey history")

# Run the application  
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True) 
