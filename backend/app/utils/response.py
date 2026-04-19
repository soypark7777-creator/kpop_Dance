from flask import jsonify


def success_response(data=None, message="ok", status_code=200):
    return jsonify({"success": True, "data": data, "message": message}), status_code


def error_response(message, status_code=400, code=None):
    payload = {"success": False, "error": message, "status": status_code}
    if code is not None:
        payload["code"] = code
    return jsonify(payload), status_code

