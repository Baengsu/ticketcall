/**
 * 성취 배지 컴포넌트
 */

import { Achievement } from "@/lib/achievements";

interface AchievementBadgeProps {
  achievement: Achievement;
  className?: string;
}

/**
 * 단일 성취 배지 컴포넌트
 */
export default function AchievementBadge({
  achievement,
  className = "",
}: AchievementBadgeProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors ${className}`}
      title={achievement.description}
    >
      <span className="text-2xl flex-shrink-0">{achievement.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{achievement.name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {achievement.description}
        </p>
      </div>
    </div>
  );
}

