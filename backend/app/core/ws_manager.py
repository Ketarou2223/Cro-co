from fastapi import WebSocket
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, match_id: str, websocket: WebSocket):
        await websocket.accept()
        if match_id not in self.connections:
            self.connections[match_id] = []
        self.connections[match_id].append(websocket)
        logger.info(f"[WS] connected: match={match_id} total={len(self.connections[match_id])}")

    def disconnect(self, match_id: str, websocket: WebSocket):
        if match_id in self.connections:
            try:
                self.connections[match_id].remove(websocket)
            except ValueError:
                pass
            if not self.connections[match_id]:
                del self.connections[match_id]
        logger.info(f"[WS] disconnected: match={match_id}")

    async def broadcast(self, match_id: str, data: dict):
        if match_id not in self.connections:
            return
        dead: List[WebSocket] = []
        for ws in self.connections[match_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(match_id, ws)
        logger.info(f"[WS] broadcast: match={match_id} clients={len(self.connections.get(match_id, []))}")


manager = ConnectionManager()
