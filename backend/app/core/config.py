# 解説: このファイルはアプリ全体の設定値を一元管理する（§5 保護ファイル・ロジック変更禁止）。
# 解説: pydantic-settings の BaseSettings が .env を自動読み込みし、型付きで settings に格納する
# 解説: list[str] は JSON 解釈エラーになるため admin_emails_csv で CSV 文字列として受け取り property で split する
# 解説: populate_by_name=True = Field(alias=...) と元フィールド名の両方でアクセスできるようにする
# 解説: settings = Settings() がモジュールロード時に1回だけ実行され、全コードで共有されるシングルトン
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str
    allowed_origins: str = "http://localhost:5173"
    secret_key: str

    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")
    from_email: str = Field(default="noreply@resend.dev", alias="FROM_EMAIL")
    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")

    vapid_private_key: str = Field(default="", alias="VAPID_PRIVATE_KEY")
    vapid_public_key: str = Field(default="", alias="VAPID_PUBLIC_KEY")
    vapid_email: str = Field(default="mailto:admin@example.com", alias="VAPID_EMAIL")

    privacy_hash_salt: str = Field(default="", alias="PRIVACY_HASH_SALT")

    like_quota_enabled: bool = Field(default=False, alias="LIKE_QUOTA_ENABLED")

    # .env の ADMIN_EMAILS をそのまま文字列として読む（list型にしないのがポイント）
    admin_emails_csv: str = Field(default="", alias="ADMIN_EMAILS")

    @property
    def admin_emails(self) -> list[str]:
        """ADMIN_EMAILS をカンマ区切りからリストに変換して返す。小文字化して比較しやすくする。"""
        if not self.admin_emails_csv:
            return []
        return [e.strip().lower() for e in self.admin_emails_csv.split(",") if e.strip()]

    def get_allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()