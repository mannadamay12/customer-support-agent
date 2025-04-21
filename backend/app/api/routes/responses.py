from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import Response, Inquiry, InquiryStatus, User
from app.llm.response_generator import ResponseGenerator
from app.websocket.server import emit_new_response

router = APIRouter()
response_generator = ResponseGenerator()

# Pydantic models for request/response validation
class ResponseBase(BaseModel):
    content: str
    inquiry_id: int
    agent_id: Optional[int] = None
    is_automated: bool = True

class ResponseCreate(ResponseBase):
    pass

class ResponseResponse(ResponseBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# Background task to update inquiry status after response
def update_inquiry_status(inquiry_id: int, db: Session):
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if inquiry and inquiry.status == InquiryStatus.NEW:
        inquiry.status = InquiryStatus.IN_PROGRESS
        db.commit()

@router.post("/", response_model=ResponseResponse, status_code=status.HTTP_201_CREATED)
async def create_response(
    response: ResponseCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new response to an inquiry"""
    
    # Verify inquiry exists
    inquiry = db.query(Inquiry).filter(Inquiry.id == response.inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {response.inquiry_id} not found"
        )
    
    # Verify agent exists if provided
    if response.agent_id:
        agent = db.query(User).filter(User.id == response.agent_id).first()
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent with ID {response.agent_id} not found"
            )
    
    # Create response object
    db_response = Response(
        content=response.content,
        inquiry_id=response.inquiry_id,
        agent_id=response.agent_id,
        is_automated=response.is_automated
    )
    
    # Save to database
    db.add(db_response)
    db.commit()
    db.refresh(db_response)
    
    # Schedule background task to update inquiry status
    background_tasks.add_task(update_inquiry_status, response.inquiry_id, db)

    await emit_new_response(db_response, response.inquiry_id)
    
    return db_response

@router.get("/inquiry/{inquiry_id}", response_model=List[ResponseResponse])
async def get_responses_for_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    """Get all responses for a specific inquiry"""
    
    # Verify inquiry exists
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found"
        )
    
    # Get responses ordered by creation time
    responses = db.query(Response).filter(
        Response.inquiry_id == inquiry_id
    ).order_by(Response.created_at.asc()).all()
    
    return responses

@router.post("/generate/{inquiry_id}", response_model=ResponseResponse)
async def generate_response(
    inquiry_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate an AI response for an inquiry"""
    
    # Verify inquiry exists
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found"
        )
    
    # Check if inquiry is escalated
    if inquiry.escalated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inquiry ID {inquiry_id} is marked for escalation and requires human response"
        )
    
    # Get previous responses for context
    previous_responses = db.query(Response).filter(
        Response.inquiry_id == inquiry_id
    ).order_by(Response.created_at.asc()).all()
    
    # Generate response using LLM
    response_text = response_generator.generate_response(inquiry, previous_responses)
    
    # Create and save response
    db_response = Response(
        content=response_text,
        inquiry_id=inquiry_id,
        is_automated=True
    )
    
    db.add(db_response)
    db.commit()
    db.refresh(db_response)
    
    # Schedule background task to update inquiry status
    background_tasks.add_task(update_inquiry_status, inquiry_id, db)
    
    await emit_new_response(db_response, inquiry_id)

    return db_response