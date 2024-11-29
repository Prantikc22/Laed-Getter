from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class EmailTemplate(Base):
    __tablename__ = 'email_templates'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(String, nullable=False)
    variables = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WhatsAppTemplate(Base):
    __tablename__ = 'whatsapp_templates'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    language = Column(String(10), nullable=False)
    content = Column(String, nullable=False)
    variables = Column(JSON)
    status = Column(String(20), default='pending')  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MessageLog(Base):
    __tablename__ = 'message_logs'
    
    id = Column(Integer, primary_key=True)
    message_type = Column(String(20), nullable=False)  # email or whatsapp
    template_id = Column(Integer, nullable=False)
    recipient = Column(String(255), nullable=False)
    variables = Column(JSON)
    status = Column(String(20), nullable=False)  # sent, failed
    error_message = Column(String)
    sent_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    engine = create_engine('sqlite:///lead_getter.db')
    Base.metadata.create_all(engine)

if __name__ == '__main__':
    init_db()
