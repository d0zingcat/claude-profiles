import type { SwitchBackup } from "./types.js";

export function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "刚刚";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

const REASON_LABELS: Record<SwitchBackup["reason"], string> = {
  switch: "切换",
  restore: "还原",
  official: "官方",
};

export function formatBackupSummary(
  backup: SwitchBackup,
  latestId?: string,
): string {
  const updatedAt = `${formatLocalDateTime(backup.createdAt)} (${formatRelativeTime(backup.createdAt)})`;
  const from = backup.fromProfile ?? "-";
  const reason = REASON_LABELS[backup.reason];
  const latest = backup.id === latestId ? " [最近]" : "";
  return `${updatedAt}  ${from} → ${backup.toProfile}  [${reason}]${latest}`;
}

export function reasonLabel(reason: SwitchBackup["reason"]): string {
  return REASON_LABELS[reason];
}
