# 解説: このファイルは「WebSocket 接続の管理」を担うクラスを定義する。
# 解説: 「WebSocket（WS）」= HTTP とは別の、サーバーとブラウザが「つなぎっぱなし」で
#       双方向にリアルタイム通信できるプロトコル。チャット機能に使う。
# 解説: 呼ばれる場所: ws.py（チャットの WebSocket エンドポイント）が manager を使う
# 解説: このファイルで作る manager オブジェクト = アプリ全体でただ1つ（シングルトン）の接続管理者
# 解説: データの流れ:
#   ブラウザ ↔ ws.py の WS エンドポイント ↔ manager.broadcast でメッセージを全員に配信
#
# 解説: 使用ライブラリ:
#   WebSocket = FastAPI の WebSocket 接続オブジェクト。受信・送信・切断を管理する
#   Dict, List, Optional = 型ヒント用（Dict = 辞書型 / List = リスト型 / Optional = None かもしれない型）

# 解説: FastAPI の WebSocket 接続クラス
from fastapi import WebSocket
# 解説: 型ヒント用のジェネリック型
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# 解説: 1つのマッチ（チャットルーム）に同時に接続できる WebSocket の上限数（DoS 防止）
_MAX_CONNECTIONS_PER_MATCH = 5  # 1 match あたりの WS 接続上限（DoS 防止）


# 解説: WebSocket 接続を管理するクラス。接続・切断・全員配信の機能を持つ
class ConnectionManager:
    # 解説: クラスのインスタンスを作るときに自動的に呼ばれる初期化メソッド
    def __init__(self):
        # 解説: connections = {match_id: [WebSocket, WebSocket, ...]} の辞書
        #       キー = マッチ ID（チャットルームの ID）/ 値 = そのルームに接続中の WebSocket のリスト
        self.connections: Dict[str, List[WebSocket]] = {}

    # 解説: 新しい WebSocket 接続をマッチ ID に紐付けて登録する
    # 解説: async def = WebSocket 操作は非同期（await が必要）なため
    async def connect(self, match_id: str, websocket: WebSocket, subprotocol: str | None = None) -> bool:
        """接続を登録する。上限超過時は False を返す（ws.py 側で close すること）。"""
        # 解説: 現在そのマッチに接続しているリストを取得（なければ空リスト）
        current = self.connections.get(match_id, [])
        # 解説: 上限を超えていれば接続を拒否（False を返す）
        if len(current) >= _MAX_CONNECTIONS_PER_MATCH:
            logger.warning("[WS] 接続数上限超過: match=%s current=%d", match_id, len(current))
            return False
        # 解説: websocket.accept() = 接続を承認する（これを呼ばないとブラウザとの通信ができない）
        await websocket.accept(subprotocol=subprotocol)
        # 解説: 初回接続の場合はマッチ ID のリストを初期化する
        if match_id not in self.connections:
            self.connections[match_id] = []
        # 解説: 接続リストに追加する
        self.connections[match_id].append(websocket)
        logger.info("[WS] connected: match=%s total=%d", match_id, len(self.connections[match_id]))
        return True

    # 解説: 指定マッチの全 WebSocket 接続を強制切断する（ブロック実行時などに使う）
    async def disconnect_all(self, match_id: str) -> None:
        """指定 match_id の全接続を強制切断する（ブロック実行時等）。"""
        # 解説: list(...) でコピーしてからループ（ループ中にリストを変更するとエラーになるため）
        for ws in list(self.connections.get(match_id, [])):
            try:
                # 解説: ws.close(code=1008) = WebSocket をエラーコード 1008（Policy Violation）で切断
                await ws.close(code=1008, reason="Forbidden")
            except Exception:
                pass
        # 解説: 接続辞書からマッチのエントリを削除（なければ何もしない）
        self.connections.pop(match_id, None)
        logger.info("[WS] disconnect_all: match=%s", match_id)

    # 解説: 特定の WebSocket 接続1つをリストから削除する（クライアントが自主的に切断した場合）
    def disconnect(self, match_id: str, websocket: WebSocket):
        if match_id in self.connections:
            try:
                # 解説: .remove() = リストから指定の要素を1つ削除する（存在しなければ ValueError）
                self.connections[match_id].remove(websocket)
            except ValueError:
                # 解説: 既にリストにない場合は無視する
                pass
            # 解説: そのマッチに誰も接続していなくなればエントリ自体を削除する
            if not self.connections[match_id]:
                del self.connections[match_id]
        logger.info(f"[WS] disconnected: match={match_id}")

    # 解説: 指定マッチの全接続に JSON データを配信する（1人を除外することも可能）
    async def broadcast(
        self,
        match_id: str,
        # 解説: data = 送信する JSON データ（辞書形式）
        data: dict,
        # 解説: exclude = 除外する接続（送信者自身には送り返さない場合などに使う）
        exclude: Optional[WebSocket] = None,
    ):
        # 解説: 接続リストにマッチがなければ何もしない
        if match_id not in self.connections:
            return
        # 解説: 送信中に切断された接続を溜めるリスト（後でまとめて削除する）
        dead: List[WebSocket] = []
        # 解説: マッチに接続している全クライアントにデータを送信する
        for ws in self.connections[match_id]:
            # 解説: exclude に指定された接続はスキップ（is = 同一オブジェクトか比較）
            if ws is exclude:
                continue
            try:
                # 解説: ws.send_json(data) = 辞書を JSON 文字列に変換して WebSocket 経由で送信
                await ws.send_json(data)
            except Exception:
                # 解説: 送信失敗 = 接続が切れた = dead リストに追加して後で削除する
                dead.append(ws)
        # 解説: 切断済みの接続をリストから削除する
        for ws in dead:
            self.disconnect(match_id, ws)
        logger.info(f"[WS] broadcast: match={match_id} clients={len(self.connections.get(match_id, []))}")


# 解説: アプリ全体で共有するシングルトンの ConnectionManager インスタンス
# 解説: ws.py がこれをインポートして使う（from app.core.ws_manager import manager）
manager = ConnectionManager()
