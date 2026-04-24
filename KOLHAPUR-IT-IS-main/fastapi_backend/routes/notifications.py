from fastapi import APIRouter


router = APIRouter()


@router.get("/{user_id}")
async def get_notifications(user_id: str):
    return {"success": True, "data": []}


@router.post("")
async def send_notification(payload: dict):
    notification = {
        "id": payload.get("id", "dev-notification"),
        "message": payload.get("message", ""),
        "senderName": payload.get("senderName", ""),
        "timestamp": payload.get("timestamp"),
        "isRead": False,
    }
    return {"success": True, "data": notification}


@router.put("/{notif_id}/read")
async def mark_notification_read(notif_id: str):
    return {"success": True, "data": {"id": notif_id, "isRead": True}}
