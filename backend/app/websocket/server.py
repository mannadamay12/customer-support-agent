import socketio
import logging
from typing import Dict, Set
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi', 
    cors_allowed_origins=settings.ORIGINS
)

# Create ASGI app for Socket.IO server
socket_app = socketio.ASGIApp(sio)

# Store connected clients
connected_clients: Dict[str, Set[str]] = {
    'agents': set(),  # Agent room for handling escalations
    'customers': set()  # Customer room for updates
}

# Socket.IO event handlers
@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    
    # Verify authentication token (simplified for now)
    token = auth.get('token') if auth else None
    if not token:
        logger.warning(f"Client {sid} connection rejected: No authentication token")
        return False
    
    # In a real app, validate token and get user role
    # For now, we'll assume all connections are valid
    await sio.emit('connect_success', {'status': 'connected'}, to=sid)
    return True

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    
    # Remove from all rooms
    for room in connected_clients:
        if sid in connected_clients[room]:
            connected_clients[room].remove(sid)

@sio.event
async def join(sid, data):
    """Handle client joining a room"""
    room = data.get('room')
    if not room or room not in connected_clients:
        logger.warning(f"Client {sid} tried to join invalid room: {room}")
        return
    
    logger.info(f"Client {sid} joined room: {room}")
    connected_clients[room].add(sid)
    await sio.enter_room(sid, room)

@sio.event
async def leave(sid, data):
    """Handle client leaving a room"""
    room = data.get('room')
    if not room or room not in connected_clients:
        return
    
    logger.info(f"Client {sid} left room: {room}")
    if sid in connected_clients[room]:
        connected_clients[room].remove(sid)
    await sio.leave_room(sid, room)

# Event emitters
async def emit_new_inquiry(inquiry):
    """Emit new inquiry event to agents"""
    logger.info(f"Emitting new inquiry event: {inquiry.id}")
    await sio.emit('new_inquiry', inquiry.dict(), room='agents')

async def emit_inquiry_updated(inquiry):
    """Emit inquiry updated event to relevant clients"""
    logger.info(f"Emitting inquiry updated event: {inquiry.id}")
    # Send to agents room
    await sio.emit('inquiry_updated', inquiry.dict(), room='agents')
    
    # Send to specific customer if applicable
    if inquiry.customer_id:
        customer_sid = f"customer_{inquiry.customer_id}"
        await sio.emit('inquiry_updated', inquiry.dict(), room=customer_sid)

async def emit_new_response(response, inquiry_id):
    """Emit new response event to relevant clients"""
    logger.info(f"Emitting new response event for inquiry: {inquiry_id}")
    # Convert to dict for serialization
    response_data = response.dict()
    response_data['inquiry_id'] = inquiry_id
    
    # Send to agents room
    await sio.emit('new_response', response_data, room='agents')
    
    # Send to specific customer if applicable
    inquiry = await get_inquiry(inquiry_id)  # You'll need to implement this function
    if inquiry and inquiry.customer_id:
        customer_sid = f"customer_{inquiry.customer_id}"
        await sio.emit('new_response', response_data, room=customer_sid)

async def emit_escalation(inquiry, reason):
    """Emit escalation event to agents"""
    logger.info(f"Emitting escalation event: {inquiry.id}")
    await sio.emit('escalation', {
        'inquiry': inquiry.dict(),
        'reason': reason
    }, room='agents')

# Helper function to get inquiry
async def get_inquiry(inquiry_id):
    """Get inquiry by ID"""
    from app.db.session import SessionLocal
    from app.db.models import Inquiry
    
    db = SessionLocal()
    try:
        inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
        return inquiry
    finally:
        db.close()