import asyncio
import logging
from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.db.models import FollowUp, Inquiry, InquiryStatus
from app.llm.followup import FollowUpGenerator
from app.websocket.server import emit_new_response

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize follow-up generator
followup_generator = FollowUpGenerator()

async def schedule_followups():
    """Check for inquiries that need follow-ups and schedule them"""
    logger.info("Checking for inquiries that need follow-ups...")
    db = SessionLocal()
    
    try:
        # Get inquiries that might need follow-up
        inquiries = db.query(Inquiry).filter(
            Inquiry.status.in_([
                InquiryStatus.IN_PROGRESS,
                InquiryStatus.AWAITING_CUSTOMER
            ])
        ).all()
        
        for inquiry in inquiries:
            # Get the latest response for this inquiry
            responses = db.query(Response).filter(
                Response.inquiry_id == inquiry.id
            ).order_by(Response.created_at.desc()).all()
            
            # Check if a follow-up is needed
            if followup_generator.should_generate_followup(inquiry, responses):
                # Generate follow-up
                followup_data = followup_generator.generate_followup(inquiry, responses)
                
                # Create follow-up record
                followup = FollowUp(
                    inquiry_id=followup_data["inquiry_id"],
                    content=followup_data["content"],
                    scheduled_at=followup_data["scheduled_at"]
                )
                
                db.add(followup)
                db.commit()
                db.refresh(followup)
                
                logger.info(f"Scheduled follow-up for inquiry {inquiry.id}")
    finally:
        db.close()

async def send_followups():
    """Send scheduled follow-ups that are due"""
    logger.info("Sending scheduled follow-ups...")
    db = SessionLocal()
    
    try:
        # Get follow-ups that are due
        due_followups = db.query(FollowUp).filter(
            FollowUp.scheduled_at <= datetime.now(),
            FollowUp.sent_at.is_(None)
        ).all()
        
        for followup in due_followups:
            try:
                # Create a response from the follow-up
                response = Response(
                    inquiry_id=followup.inquiry_id,
                    content=followup.content,
                    is_automated=True
                )
                
                db.add(response)
                db.commit()
                db.refresh(response)
                
                # Update inquiry status
                inquiry = db.query(Inquiry).filter(Inquiry.id == followup.inquiry_id).first()
                if inquiry:
                    inquiry.status = InquiryStatus.AWAITING_CUSTOMER
                    db.commit()
                
                # Mark follow-up as sent
                followup.sent_at = datetime.now()
                followup.successful = True
                db.commit()
                
                # Emit WebSocket event
                await emit_new_response(response, followup.inquiry_id)
                
                logger.info(f"Sent follow-up for inquiry {followup.inquiry_id}")
            except Exception as e:
                logger.error(f"Failed to send follow-up: {str(e)}")
                followup.successful = False
                db.commit()
    finally:
        db.close()

async def run_scheduler():
    """Run the scheduler in a loop"""
    while True:
        try:
            await schedule_followups()
            await send_followups()
        except Exception as e:
            logger.error(f"Scheduler error: {str(e)}")
        
        # Wait for next run (every 15 minutes)
        await asyncio.sleep(15 * 60)