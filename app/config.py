import os
from dotenv import load_dotenv

load_dotenv()

raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./prestamos.db")
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
# Remove the ?pgbouncer=true flag which is valid for Prisma but crashes psycopg2/SQLAlchemy
if "?pgbouncer=true" in raw_db_url:
    raw_db_url = raw_db_url.replace("?pgbouncer=true", "")

DATABASE_URL = raw_db_url
JWT_SECRET = os.getenv("JWT_SECRET", "prestamos-app-secret-key-change-in-production-2024")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
