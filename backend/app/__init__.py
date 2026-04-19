from flask import Flask

from .api import bp as api_bp
from .config import config_map
from .extensions import cors, db, migrate
from .services.security_service import SecurityError
from .utils.response import error_response


def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_map[config_name])

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    migrate.init_app(app, db)

    # Ensure SQLAlchemy models are imported before migrations or metadata inspection.
    from . import models  # noqa: F401

    @app.errorhandler(SecurityError)
    def handle_security_error(exc: SecurityError):
        message = str(exc)
        if "admin access required" in message:
            return error_response(message, status_code=403, code="FORBIDDEN")
        return error_response(message, status_code=401, code="UNAUTHORIZED")

    app.register_blueprint(api_bp, url_prefix="/api")

    return app
