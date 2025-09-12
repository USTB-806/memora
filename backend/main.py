import os
from loguru import logger
from dotenv import load_dotenv

__file__ = os.path.abspath(__file__)
PROJ_DIR = os.path.dirname(os.path.dirname(__file__))

# os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"
# os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7890"

ENV = os.getenv("ENV", "dev")
if ENV == "dev":
    logger.info("Loading DEV environment variables")
    load_dotenv(os.path.join(PROJ_DIR, ".env.dev"), override=True)
elif ENV == "prod":
    logger.info("Loading PROD environment variables")
    load_dotenv(os.path.join(PROJ_DIR, ".env.prod"), override=True)

from router import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn

    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
