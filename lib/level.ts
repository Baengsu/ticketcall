/**
 * 레벨 계산 유틸리티
 * 
 * 레벨은 데이터베이스에 저장되지 않으며,
 * 포인트에서 동적으로 계산됩니다.
 */

/**
 * 레벨 임계값 상수
 * 포인트 범위에 따라 레벨이 결정됩니다.
 */
export const LEVEL_THRESHOLDS = [
  { level: 1, min: 0, max: 49 },      // Lv.1: 0-49
  { level: 2, min: 50, max: 199 },    // Lv.2: 50-199
  { level: 3, min: 200, max: 499 },   // Lv.3: 200-499
  { level: 4, min: 500, max: 999 },   // Lv.4: 500-999
  { level: 5, min: 1000, max: Infinity }, // Lv.5: 1000+
] as const;

/**
 * 포인트를 기반으로 레벨을 계산하는 함수
 * 
 * 레벨 계산 규칙:
 * - Lv.1: 0-49 포인트
 * - Lv.2: 50-199 포인트
 * - Lv.3: 200-499 포인트
 * - Lv.4: 500-999 포인트
 * - Lv.5: 1000+ 포인트
 * 
 * @param points - 사용자의 포인트
 * @returns 계산된 레벨 (1-5)
 * 
 * @example
 * getLevel(0)   // 1
 * getLevel(49)  // 1
 * getLevel(50)  // 2
 * getLevel(199) // 2
 * getLevel(200) // 3
 * getLevel(1000) // 5
 */
export function getLevel(points: number): number {
  // 포인트가 음수일 경우 레벨 1로 처리
  if (points < 0) {
    return 1;
  }

  // 레벨 임계값을 역순으로 검색하여 해당 레벨 찾기
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (points >= threshold.min) {
      return threshold.level;
    }
  }

  // 기본값 (실제로는 여기 도달하지 않음)
  return 1;
}

/**
 * 레벨 진행도 정보를 계산하는 함수
 * UI에서 레벨 진행 상황을 표시하는 데 사용됩니다.
 * 
 * @param points - 사용자의 현재 포인트
 * @returns 레벨 진행도 정보 객체
 * 
 * @example
 * getLevelProgress(75)
 * // {
 * //   currentLevel: 2,
 * //   currentPoints: 75,
 * //   nextLevelPoints: 200,
 * //   progressPercent: 16.67
 * // }
 * 
 * @example
 * getLevelProgress(1000) // 최대 레벨
 * // {
 * //   currentLevel: 5,
 * //   currentPoints: 1000,
 * //   nextLevelPoints: null,
 * //   progressPercent: 100
 * // }
 */
export function getLevelProgress(points: number): {
  currentLevel: number;
  currentPoints: number;
  nextLevelPoints: number | null;
  progressPercent: number;
} {
  // 음수 포인트는 0으로 처리
  const currentPoints = Math.max(0, points);
  
  // 현재 레벨 계산
  const currentLevel = getLevel(currentPoints);
  
  // 현재 레벨의 임계값 찾기
  const currentThreshold = LEVEL_THRESHOLDS.find(
    (t) => t.level === currentLevel
  );
  
  if (!currentThreshold) {
    // 임계값을 찾을 수 없으면 기본값 반환
    return {
      currentLevel: 1,
      currentPoints,
      nextLevelPoints: 50,
      progressPercent: 0,
    };
  }
  
  // 최대 레벨인 경우 (Lv.5)
  if (currentLevel === 5) {
    return {
      currentLevel: 5,
      currentPoints,
      nextLevelPoints: null, // 다음 레벨 없음
      progressPercent: 100, // 최대 레벨이므로 100%
    };
  }
  
  // 다음 레벨의 임계값 찾기
  const nextThreshold = LEVEL_THRESHOLDS.find(
    (t) => t.level === currentLevel + 1
  );
  
  if (!nextThreshold) {
    // 다음 레벨을 찾을 수 없으면 (이론적으로 발생하지 않음)
    return {
      currentLevel,
      currentPoints,
      nextLevelPoints: null,
      progressPercent: 100,
    };
  }
  
  // 현재 레벨 내에서의 진행도 계산
  // 예: Lv.2 (50-199)에서 포인트가 75라면:
  // progressPercent = (75 - 50) / (199 - 50) * 100 = 16.67%
  const levelRange = currentThreshold.max - currentThreshold.min;
  const pointsInLevel = currentPoints - currentThreshold.min;
  const progressPercent = Math.min(
    100,
    Math.max(0, (pointsInLevel / levelRange) * 100)
  );
  
  return {
    currentLevel,
    currentPoints,
    nextLevelPoints: nextThreshold.min, // 다음 레벨까지 필요한 포인트
    progressPercent: Math.round(progressPercent * 100) / 100, // 소수점 둘째 자리까지
  };
}

