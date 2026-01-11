/**
 * 사용자 배지 컴포넌트
 * 
 * 사용자 닉네임 옆에 표시되는 배지 컴포넌트입니다.
 */

import { BadgeInfo } from "@/lib/badges";

interface UserBadgeProps {
  badges: BadgeInfo[];
  className?: string;
}

/**
 * 사용자 배지 컴포넌트
 * 
 * @param badges - 표시할 배지 목록
 * @param className - 추가 CSS 클래스
 */
export default function UserBadge({ badges, className = "" }: UserBadgeProps) {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {badges.map((badge, index) => (
        <span
          key={badge.type}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}
          title={badge.label}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}

