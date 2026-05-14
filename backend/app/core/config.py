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