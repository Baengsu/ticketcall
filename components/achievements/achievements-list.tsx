/**
 * 성취 목록 컴포넌트
 */

"use client";

import { Achievement, groupAchievementsByCategory } from "@/lib/achievements";
import AchievementBadge from "./achievement-badge";

interface AchievementsListProps {
  achievements: Achievement[];
  className?: string;
}

/**
 * 성취 목록 컴포넌트 (카테고리별로 그룹화하여 표시)
 */
export default function AchievementsList({
  achievements,
  className = "",
}: AchievementsListProps) {
  if (achievements.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <p className="text-sm">아직 달성한 성취가 없습니다.</p>
        <p className="text-xs mt-1">게시물을 작성하고 활동을 시작해보세요!</p>
      </div>
    );
  }

  const grouped = groupAchievementsByCategory(achievements);

  const categoryLabels: Record<string, string> = {
    activity: "활동",
    points: "포인트",
    level: "레벨",
    milestone: "마일스톤",
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(grouped).map(
        ([category, categoryAchievements]) =>
          categoryAchievements.length > 0 && (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {categoryLabels[category]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryAchievements.map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                  />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}

