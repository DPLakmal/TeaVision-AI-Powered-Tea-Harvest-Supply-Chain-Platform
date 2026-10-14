"""FastAPI application entry point for the TeaVision ML Inference Service.

Configures lifespan lifecycle events, middleware, structured logging, error handlers,
and registers inference and health monitoring routes.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
import structlog

from app.config import Settings, get_settings
from app.model_loader import load_model
from app.routers import health, predict

logger = structlog.get_logger(__name__)


def setup_logging(ml_env: str = "development") -> None:
    """Configure structlog processors based on deployment environment.

    Args:
        ml_env: Runtime environment string ('development', 'staging', 'production').
    """
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if ml_env.lower() == "production":
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI application lifespan context manager.

    Initializes structured logging and loads the TorchScript model into memory
    before handling requests, and performs cleanup upon shutdown.

    Args:
        app: The FastAPI application instance.

    Yields:
        None
    """
    settings: Settings = get_settings()
    setup_logging(settings.ml_env)
    logger.info(
        "Starting TeaVision ML Inference Service",
        environment=settings.ml_env,
        model_arch=settings.model_arch,
        model_version=settings.model_version,
    )

    # Preload the ML model into memory
    await load_model(settings)

    yield

    logger.info("TeaVision ML Inference Service shut down cleanly.")


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application instance.

    Returns:
        FastAPI: Fully configured web application.
    """
    application = FastAPI(
        title="TeaVision ML Inference Service",
        description="AI-powered tea harvest leaf quality grading and classification API.",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Enable CORS for frontend and mobile clients
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routes
    application.include_router(health.router)
    application.include_router(predict.router)

    # Root redirect to OpenAPI documentation
    @application.get("/", include_in_schema=False)
    async def root_redirect() -> RedirectResponse:
        """Redirect root requests to interactive API documentation."""
        return RedirectResponse(url="/docs")

    # Custom exception handlers
    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.warning(
            "Validation error on incoming request",
            path=str(request.url.path),
            errors=exc.errors(),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )

    @application.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        logger.warning(
            "HTTP exception encountered",
            path=str(request.url.path),
            status_code=exc.status_code,
            detail=exc.detail,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @application.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error(
            "Unhandled internal server error",
            path=str(request.url.path),
            error=str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred while processing the request."},
        )

    return application


# Global application instance for ASGI servers like uvicorn
app = create_app()
