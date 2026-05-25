from app.core.supabase_client import supabase


def get_signed_image_url(path: str, expires_in: int = 3600) -> str | None:
    try:
        res = supabase.storage.from_("profile-images").create_signed_url(path, expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signed_url")
        return getattr(res, "signed_url", None) or getattr(res, "signedURL", None)
    except Exception:
        return None
