from flask import Blueprint, redirect, jsonify, request
import os
from .oauth import AUTH_COOKIE_NAME, cookie_secure, get_google_auth_url, process_google_callback, token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login')
def login():
    """Redirect to Google OAuth login"""
    auth_url = get_google_auth_url()
    return redirect(auth_url)

@auth_bp.route('/login/callback')
def callback():
    """Handle Google OAuth callback"""
    user, token = process_google_callback()
    
    if not user or not token:
        return redirect(f"{os.getenv('FRONTEND_URL')}/login?error=auth_failed")
    
    response = redirect(f"{os.getenv('FRONTEND_URL')}/auth/callback")
    response.set_cookie(
        AUTH_COOKIE_NAME,
        token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=cookie_secure(),
        samesite="Lax",
    )
    return response

@auth_bp.route('/user')
@token_required
def get_user(current_user):
    """Get current user info"""
    return jsonify(current_user)

@auth_bp.route('/verify-token')
@token_required
def verify_token(current_user):
    """Verify if token is valid"""
    return jsonify({'valid': True, 'user': current_user})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Logged out'})
    response.delete_cookie(AUTH_COOKIE_NAME)
    return response
