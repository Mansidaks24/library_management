import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from . import settings

def build_database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    sqlserver_host = os.getenv("SQLSERVER_HOST")
    sqlserver_database = os.getenv("SQLSERVER_DATABASE")
    sqlserver_user = os.getenv("SQLSERVER_USER")
    sqlserver_password = os.getenv("SQLSERVER_PASSWORD")
    sqlserver_driver_type = os.getenv("SQLSERVER_DRIVER_TYPE", "pymssql").lower()

    if sqlserver_host and sqlserver_database and sqlserver_user and sqlserver_password:
        if sqlserver_driver_type == "pymssql":
            normalized_host = sqlserver_host.replace(",", ":", 1)
            return (
                f"mssql+pymssql://{sqlserver_user}:{quote_plus(sqlserver_password)}@"
                f"{normalized_host}/{sqlserver_database}"
            )

        odbc_driver = os.getenv("SQLSERVER_ODBC_DRIVER", "ODBC Driver 18 for SQL Server")
        encrypt = os.getenv("SQLSERVER_ENCRYPT", "yes")
        trust_server_certificate = os.getenv("SQLSERVER_TRUST_SERVER_CERTIFICATE", "no")
        connection_string = (
            f"DRIVER={{{odbc_driver}}};"
            f"SERVER={sqlserver_host};"
            f"DATABASE={sqlserver_database};"
            f"UID={sqlserver_user};"
            f"PWD={sqlserver_password};"
            f"Encrypt={encrypt};"
            f"TrustServerCertificate={trust_server_certificate};"
        )
        return f"mssql+pyodbc:///?odbc_connect={quote_plus(connection_string)}"

    return "sqlite:///./library.db"


SQLALCHEMY_DATABASE_URL = build_database_url()

engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
