from pathlib import Path

from dotenv import load_dotenv


def load_environment() -> None:
    backend_env = Path(__file__).resolve().parent / ".env"
    project_env = Path(__file__).resolve().parent.parent / ".env"

    load_dotenv(project_env, override=False)
    load_dotenv(backend_env, override=False)


load_environment()
