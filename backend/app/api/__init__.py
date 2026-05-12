from flask import Blueprint

from .admin_routes import bp as admin_bp
from .auth_routes import bp as auth_bp
from .analysis_routes import bp as analysis_bp
from .avatar_routes import bp as avatar_bp
from .health_routes import bp as health_bp
from .reference_routes import bp as reference_bp
from .session_routes import bp as session_bp
from .upload_routes import bp as upload_bp
from .stream_routes import bp as stream_bp
from .user_routes import bp as user_bp


bp = Blueprint("api", __name__)
bp.register_blueprint(auth_bp)
bp.register_blueprint(admin_bp)
bp.register_blueprint(health_bp)
bp.register_blueprint(reference_bp)
bp.register_blueprint(user_bp)
bp.register_blueprint(session_bp)
bp.register_blueprint(upload_bp)
bp.register_blueprint(stream_bp)
bp.register_blueprint(analysis_bp)
bp.register_blueprint(avatar_bp)
