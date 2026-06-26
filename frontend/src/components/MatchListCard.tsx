import { getUserColor } from "@/components/ColorfulCard";

export type MatchListItem = {
  matchId: string;
  user: {
    id: string;
    nickname: string;
    faculty: string;
    year: string;
    avatarUrl: string | null;
    isDeleted: boolean;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isMine: boolean;
  } | null;
  lastActivityAt: string;
  unreadCount: number;
};

function formatActivity(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "今";
  if (diffMin < 60) return `${diffMin}分前`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${Math.floor(diffMin / 60)}時間前`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "昨日";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type Props = {
  item: MatchListItem;
  onOpenChat: (matchId: string) => void;
  onOpenProfile: (userId: string) => void;
};

export function MatchListCard({ item, onOpenChat, onOpenProfile }: Props) {
  const { matchId, user, lastMessage, lastActivityAt, unreadCount } = item;

  const preview = lastMessage?.content ?? null;
  const time = formatActivity(lastMessage?.createdAt ?? lastActivityAt);
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);
  const tappableProfile = !user.isDeleted;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenChat(matchId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenChat(matchId);
        }
      }}
      aria-label={`${user.isDeleted ? "退会したユーザー" : user.nickname}とのチャットを開く`}
      className="flex items-center gap-3 px-4 py-3
                 cursor-pointer select-none transition-colors
                 hover:bg-ink/[0.04] active:bg-ink/[0.06]
                 focus-visible:outline-none focus-visible:bg-ink/[0.04]"
    >
      {/* アバター（タップ→プロフィール・カード全体クリックと stopPropagation で分離） */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (tappableProfile) onOpenProfile(user.id);
        }}
        disabled={!tappableProfile}
        aria-label={`${user.nickname}のプロフィールを見る`}
        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {user.avatarUrl && !user.isDeleted ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-12 h-12 rounded-full border-2 border-ink object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full border-2 border-ink flex items-center justify-center font-bold text-lg text-ink"
            style={{ background: user.isDeleted ? "var(--color-bone)" : getUserColor(user.id) }}
          >
            {user.isDeleted ? "?" : user.nickname.charAt(0)}
          </div>
        )}
      </button>

      {/* 中央: 名前＋学年学部 / 最終メッセージ（min-w-0 が truncate の要） */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-bold text-[15px] text-ink truncate min-w-0">
            {user.isDeleted ? "退会したユーザー" : user.nickname}
          </span>
          {!user.isDeleted && (
            <span className="shrink-0 text-[13px] text-ink/40 whitespace-nowrap">
              {user.year}・{user.faculty}
            </span>
          )}
        </div>
        <div className="text-[13px] truncate min-w-0">
          {preview ? (
            <span className="text-ink/60">{preview}</span>
          ) : (
            <span className="text-ink/40">まだメッセージはありません</span>
          )}
        </div>
      </div>

      {/* 右: 時刻 + 未読バッヂ（shrink-0 で本文と被らない） */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-[13px] text-ink/40 whitespace-nowrap">{time}</span>
        {unreadCount > 0 && (
          <span
            className="min-w-[21px] min-h-[21px] px-1.5 box-border flex items-center justify-center
                       rounded-full border-[1.5px] border-ink text-white font-bold text-[13px] font-mono leading-none"
            style={{ background: "var(--color-like)" }}
            aria-label={`未読${unreadCount}件`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
