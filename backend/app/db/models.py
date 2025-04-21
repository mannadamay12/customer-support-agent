from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class InquiryType(str, enum.Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    GENERAL = "general"
    FEATURE_REQUEST = "feature_request"
    COMPLAINT = "complaint"
    OTHER = "other"

class InquiryStatus(str, enum.Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    AWAITING_CUSTOMER = "awaiting_customer"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True)
    name = Column(String(100))
    hashed_password = Column(String(100))
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    inquiries = relationship("Inquiry", back_populates="customer")
    responses = relationship("Response", back_populates="agent")

class Inquiry(Base):
    __tablename__ = "inquiries"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(200))
    content = Column(Text)
    inquiry_type = Column(Enum(InquiryType), default=InquiryType.GENERAL)
    confidence_score = Column(Float, default=0.0)  # LLM confidence in classification
    status = Column(Enum(InquiryStatus), default=InquiryStatus.NEW)
    escalated = Column(Boolean, default=False)
    escalation_reason = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    customer = relationship("User", back_populates="inquiries")
    responses = relationship("Response", back_populates="inquiry")
    followups = relationship("FollowUp", back_populates="inquiry")

class Response(Base):
    __tablename__ = "responses"
    
    id = Column(Integer, primary_key=True, index=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id"))
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Null if AI-generated
    content = Column(Text)
    is_automated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    inquiry = relationship("Inquiry", back_populates="responses")
    agent = relationship("User", back_populates="responses")

class FollowUp(Base):
    __tablename__ = "followups"
    
    id = Column(Integer, primary_key=True, index=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id"))
    content = Column(Text)
    scheduled_at = Column(DateTime(timezone=True))
    sent_at = Column(DateTime(timezone=True), nullable=True)
    successful = Column(Boolean, nullable=True)  # True if sent, False if failed
    
    # Relationships
    inquiry = relationship("Inquiry", back_populates="followups")