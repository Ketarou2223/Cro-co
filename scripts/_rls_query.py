"""
RLS drift check - DB introspection helper.
Called by check_rls_drift.ps1.  Do not run directly.
Output: single JSON line to stdout, exit 2 on error.
"""
import sys
import json
import ssl
import urllib.parse


def to_list(v):
    """pg8000 returns pg name[] as Python list; handle string fallback."""
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [x.strip() for x in v.strip("{}").split(",") if x.strip()]
    return []


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: _rls_query.py <DATABASE_URL>"}))
        sys.exit(2)

    db_url = sys.argv[1]
    u = urllib.parse.urlparse(db_url)

    try:
        import pg8000.dbapi as pgdb
    except ImportError:
        print(json.dumps({"error": "pg8000 not installed. Run: pip install pg8000"}))
        sys.exit(2)

    try:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        password = urllib.parse.unquote(u.password) if u.password else None
        conn = pgdb.connect(
            host=u.hostname,
            port=u.port or 5432,
            user=u.username,
            password=password,
            database=u.path.lstrip("/"),
            ssl_context=ssl_ctx,
        )
    except Exception as e:
        print(json.dumps({"error": "DB connection failed: " + str(e)}))
        sys.exit(2)

    def query(sql):
        cur = conn.cursor()
        cur.execute(sql)
        cols = [d[0] for d in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        cur.close()
        return rows

    try:
        tables = query(
            "SELECT tablename, rowsecurity AS rls_enabled "
            "FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        )
        policies = query(
            "SELECT tablename, policyname, cmd AS command, roles, permissive, "
            "left(qual,200) AS using_expr, left(with_check,200) AS with_check_expr "
            "FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname"
        )
        grants = query(
            "SELECT grantee, table_name, privilege_type "
            "FROM information_schema.role_table_grants "
            "WHERE table_schema='public' "
            "AND grantee IN ('anon','authenticated','public') "
            "AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE') "
            "ORDER BY table_name, grantee, privilege_type"
        )
        sec_fns = query(
            "SELECT p.proname AS function_name, p.proconfig AS config "
            "FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid "
            "WHERE n.nspname='public' AND p.prosecdef=true ORDER BY p.proname"
        )
    except Exception as e:
        conn.close()
        print(json.dumps({"error": "DB query failed: " + str(e)}))
        sys.exit(2)

    conn.close()

    for p in policies:
        p["roles"] = to_list(p.get("roles"))
    for f in sec_fns:
        f["config"] = to_list(f.get("config"))

    print(json.dumps({
        "tables": tables,
        "policies": policies,
        "grants": grants,
        "sec_fns": sec_fns,
    }))


if __name__ == "__main__":
    main()
