# 解説: このファイルは Supabase Python クライアントのシングルトンを生成する（§5 保護ファイル・ロジック変更禁止）。
# 解説: service_role_key を使って RLS をバイパスする全権クライアント。フロントの anon クライアントとは別物。
# 解説: supabase = このモジュールを import したファイルが使い回す共有インスタンス（毎回生成しない）
from supabase import Client, create_client

from app.core.config import settings

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
