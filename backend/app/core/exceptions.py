from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class AppException(HTTPException):
    """Base application exception."""
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(AppException):
    """Resource not found."""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class AuthenticationError(AppException):
    """Authentication failed."""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class PermissionError(AppException):
    """Permission denied."""
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ValidationError(AppException):
    """Validation error."""
    def __init__(self, detail: str = "Validation error"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class BusinessLogicError(AppException):
    """Business logic error."""
    def __init__(self, detail: str = "Business logic error"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": type(exc).__name__},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later.", "error_type": "InternalServerError"},
    )


def register_exception_handlers(app) -> None:
    """Register all custom exception handlers with the FastAPI app."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(NotFoundError, app_exception_handler)
    app.add_exception_handler(AuthenticationError, app_exception_handler)
    app.add_exception_handler(PermissionError, app_exception_handler)
    app.add_exception_handler(ValidationError, app_exception_handler)
    app.add_exception_handler(BusinessLogicError, app_exception_handler)
    # Catch-all for unhandled exceptions in production
    app.add_exception_handler(Exception, generic_exception_handler)
