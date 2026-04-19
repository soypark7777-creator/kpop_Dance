from __future__ import annotations

import os

def main() -> None:
    os.environ.setdefault("SECRET_KEY", "dev-secret-for-test")
    os.environ.setdefault("ADMIN_BOOTSTRAP_EMAIL", "admin@kpopdance.local")
    os.environ.setdefault("ADMIN_BOOTSTRAP_PASSWORD", "change-me-admin")

    # Import after environment variables are set so Flask reads the test values.
    from app import create_app
    from app.extensions import db

    app = create_app("testing")
    with app.app_context():
        db.create_all()

    app.run(host="127.0.0.1", port=5001, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
