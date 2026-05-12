class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "APP_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class NotFoundError(AppError):
    def __init__(self, message: str = "resource not found", code: str = "NOT_FOUND"):
        super().__init__(message=message, status_code=404, code=code)


class ValidationError(AppError):
    def __init__(self, message: str = "invalid request", code: str = "INVALID_REQUEST"):
        super().__init__(message=message, status_code=400, code=code)
