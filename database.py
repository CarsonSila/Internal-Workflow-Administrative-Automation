import os
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./inuka_platform.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models matching the Master Inuka Tables
class BeneficiaryModel(Base):
    __tablename__ = "beneficiaries"

    beneficiary_id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    national_id = Column(String, index=True)
    programs = Column(String)  # pipe-separated list of active program strings
    confidence = Column(Integer)
    health = Column(Integer)
    status = Column(String)
    phone = Column(String)
    email = Column(String)
    location = Column(String)

class SourceRecordModel(Base):
    __tablename__ = "source_records"

    record_id = Column(String, primary_key=True, index=True)
    beneficiary_id = Column(String, index=True)
    name = Column(String)
    national_id = Column(String)
    phone = Column(String)
    email = Column(String)
    location = Column(String)
    program = Column(String)
    ingested_at = Column(String)
    data_quality_score = Column(Integer)

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    time = Column(String)
    date = Column(String, index=True)
    event = Column(String)
    detail = Column(String)
    type = Column(String)
    user = Column(String)

class AnomalyModel(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    detail = Column(String)
    level = Column(String)
    program = Column(String)
    detected = Column(String)
    records = Column(String)  # pipe-separated string

class QualityDimensionModel(Base):
    __tablename__ = "quality_dimensions"

    dimension = Column(String, primary_key=True)
    value = Column(Integer)
    issues = Column(Integer)

def init_db():
    Base.metadata.create_all(bind=engine)
    print("💾 Database initialised! SQL tables successfully bound to: inuka_platform.db")

# Dependency injection for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
