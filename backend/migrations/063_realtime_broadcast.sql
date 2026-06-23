-- Phase 0: Realtime Broadcast レール（dev 限定・prod には適用しない）
-- 適用先: dev Supabase SQL Editor のみ
-- 冪等: 再実行してもエラーにならない
--
-- 確認クエリ（適用後）:
--   select to_regprocedure('public.app_notify(uuid[],text)');  -- 非NULL なら OK
--   select policyname from pg_policies where tablename='messages' and schemaname='realtime';

-- 1-a. プライベートチャンネル受信ポリシー（自分の user:{uid} だけ受信可）
drop policy if exists "rt receive own user channel" on realtime.messages;
create policy "rt receive own user channel"
on realtime.messages
for select
to authenticated
using ( realtime.topic() = 'user:' || (select auth.uid())::text );

-- 1-b. 宛先配列に合図を送るヘルパ（本文なし・合図のみ）
create or replace function public.app_notify(target_ids uuid[], kind text)
returns void
language plpgsql
security definer
set search_path = public, realtime
as $$
declare t uuid;
begin
  foreach t in array coalesce(target_ids, '{}') loop
    if t is null then continue; end if;
    perform realtime.send(
      jsonb_build_object('kind', kind),  -- payload（合図のみ・本文なし）
      'change',                          -- event
      'user:' || t::text,                -- topic
      true                               -- private
    );
  end loop;
end;
$$;

grant execute on function public.app_notify(uuid[], text) to service_role;
