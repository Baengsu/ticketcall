/**
 * 레벨 배지 컴포넌트
 * 
 * 사용자 닉네임 옆에 표시되는 레벨 배지입니다.
 */

import { getLevel } from "@/lib/level";

interface LevelBadgeProps {
  points: number;
  className?: string;
}

/**
 * 레벨 배지 컴포넌트
 * 
 * @param points - 사용자 포인트
 * @param className - 추가 CSS 클래스
 */
export default function LevelBadge({ points, className = "" }: LevelBadgeProps) {
  const level = getLevel(points);
  
  // 레벨별 색상 클래스
  const levelColors: Record<number, string> = {
    1: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    3: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    4: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    5: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const colorClass = levelColors[level] || levelColors[1];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass} ${className}`}
      title={`레벨 ${level}`}
    >
      Lv.{level}
    </span>
  );
}

