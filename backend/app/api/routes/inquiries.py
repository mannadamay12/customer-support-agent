from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import Inquiry, InquiryType, InquiryStatus, User
from app.llm.classifier import InquiryClassifier

router = APIRouter()
classifier = InquiryClassifier()

# Pydantic models for request/response validation
class InquiryBase(BaseModel):
    subject: str
    content: str
    customer_id: Optional[int] = None

class InquiryCreate(InquiryBase):
    pass

class InquiryResponse(InquiryBase):
    id: int
    inquiry_type: str
    status: str
    created_at: datetime
    confidence_score: float
    escalated: bool
    escalation_reason: Optional[str] = None
    
    class Config:
        orm_mode = True

class InquiryUpdate(BaseModel):
    status: Optional[InquiryStatus] = None
    escalated: Optional[bool] = None
    
    class Config:
        use_enum_values = True

@router.post("/", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
async def create_inquiry(inquiry: InquiryCreate, db: Session = Depends(get_db)):
    """Create a new customer inquiry and classify it"""
    
    # Verify customer exists if ID provided
    if inquiry.customer_id:
        customer = db.query(User).filter(User.id == inquiry.customer_id).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {inquiry.customer_id} not found"
            )
    
    # Classify the inquiry using the LLM
    classification = classifier.classify(inquiry.content)
    
    # Create new inquiry object
    db_inquiry = Inquiry(
        subject=inquiry.subject,
        content=inquiry.content,
        customer_id=inquiry.customer_id,
        inquiry_type=classification["type"],
        confidence_score=classification["confidence"],
        escalated=classification["should_escalate"],
        escalation_reason=classification["escalation_reason"],
        status=InquiryStatus.ESCALATED if classification["should_escalate"] else InquiryStatus.NEW
    )
    
    # Save to database
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    
    return db_inquiry

@router.get("/{inquiry_id}", response_model=InquiryResponse)
async def get_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    """Get a specific inquiry by ID"""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found"
        )
    return inquiry

@router.get("/", response_model=List[InquiryResponse])
async def list_inquiries(
    status: Optional[str] = None, 
    escalated: Optional[bool] = None,
    type: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List inquiries with optional filtering"""
    query = db.query(Inquiry)
    
    # Apply filters if provided
    if status:
        try:
            status_enum = InquiryStatus(status)
            query = query.filter(Inquiry.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value: {status}"
            )
    
    if escalated is not None:
        query = query.filter(Inquiry.escalated == escalated)
        
    if type:
        try:
            type_enum = InquiryType(type)
            query = query.filter(Inquiry.inquiry_type == type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid inquiry type: {type}"
            )
    
    # Apply pagination
    inquiries = query.order_by(Inquiry.created_at.desc()).offset(skip).limit(limit).all()
    return inquiries

@router.patch("/{inquiry_id}", response_model=InquiryResponse)
async def update_inquiry(
    inquiry_id: int, 
    inquiry_update: InquiryUpdate,
    db: Session = Depends(get_db)
):
    """Update an inquiry's status or escalation flag"""
    db_inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not db_inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found"
        )
    
    # Update fields if provided
    update_data = inquiry_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_inquiry, key, value)
    
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry