from flask import Flask

from .api import bp as api_bp
from .config import config_map
from .extensions import cors, db, migrate
from .services.security_service import SecurityError
from .utils.errors import AppError
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

    @app.errorhandler(AppError)
    def handle_app_error(exc: AppError):
        return error_response(exc.message, status_code=exc.status_code, code=exc.code)

    @app.errorhandler(404)
    def handle_not_found(_exc):
        return error_response("route not found", status_code=404, code="NOT_FOUND")

    @app.errorhandler(500)
    def handle_internal_error(_exc):
        return error_response("internal server error", status_code=500, code="INTERNAL_SERVER_ERROR")

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.cli.command("seed-demo")
    def seed_demo_command():
        """Seed minimal demo users and dance references."""
        from .api.reference_routes import seed_demo_references_if_empty
        from .models import User

        if db.session.get(User, 1) is None:
            db.session.add(
                User(
                    id=1,
                    email="demo@kpopdance.local",
                    password_hash="dev-only-password-hash",
                    nickname="DemoDancer",
                    avatar_id="avatar_001",
                    points=1000,
                    is_admin=False,
                    status="active",
                )
            )
            db.session.commit()
        seed_demo_references_if_empty()
        print("demo seed complete")

    return app
