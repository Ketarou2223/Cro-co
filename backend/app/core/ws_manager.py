from fastapi import WebSocket
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

_MAX_CONNECTIONS_PER_MATCH = 5  # 1 match あたりの WS 接続上限（DoS 防止）


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, match_id: str, websocket: WebSocket, subprotocol: str | None = None) -> bool:
        """接続を登録する。上限超過時は False を返す（ws.py 側で close すること）。"""
        current = self.connections.get(match_id, [])
        if len(current) >= _MAX_CONNECTIONS_PER_MATCH:
            logger.warning("[WS] 接続数上限超過: match=%s current=%d", match_id, len(current))
            return False
        await websocket.accept(subprotocol=subprotocol)
        if match_id not in self.connections:
            self.connections[match_id] = []
        self.connections[match_id].append(websocket)
        logger.info("[WS] connected: match=%s total=%d", match_id, len(self.connections[match_id]))
        return True

    async def disconnect_all(self, match_id: str) -> None:
        """指定 match_id の全接続を強制切断する（ブロック実行時等）。"""
        for ws in list(self.connections.get(match_id, [])):
            try:
                await ws.close(code=1008, reason="Forbidden")
            except Exception:
                pass
        self.connections.pop(match_id, None)
        logger.info("[WS] disconnect_all: match=%s", match_id)

    def disconnect(self, match_id: str, websocket: WebSocket):
        if match_id in self.connections:
            try:
                self.connections[match_id].remove(websocket)
            except ValueError:
                pass
            if not self.connections[match_id]:
                del self.connections[match_id]
        logger.info(f"[WS] disconnected: match={match_id}")

    async def broadcast(
        self,
        match_id: str,
        data: dict,
        exclude: Optional[WebSocket] = None,
    ):
        if match_id not in self.connections:
            return
        dead: List[WebSocket] = []
        for ws in self.connections[match_id]:
            if ws is exclude:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(match_id, ws)
        logger.info(f"[WS] broadcast: match={match_id} clients={len(self.connections.get(match_id, []))}")


manager = ConnectionManager()
