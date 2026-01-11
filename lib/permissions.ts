/**
 * 레벨 기반 소프트 권한 시스템
 * 
 * 권한은 레벨에서 파생되며 DB에 저장되지 않습니다.
 * 모든 권한 체크는 서버 사이드에서 수행됩니다.
 */

import { getLevel } from "./level";

/**
 * 권한 요구사항 상수
 * 새로운 권한을 추가하려면 여기에 레벨 요구사항을 정의하세요.
 */
export const PERMISSION_LEVELS = {
  DOWNVOTE: 2, // Lv.2+ 사용자는 다운보트 가능
  RESTRICTED_BOARD_POST: 3, // Lv.3+ 사용자는 제한된 게시판에 글 작성 가능 (minPostLevel)
  SEND_MESSAGE: 3, // Lv.3+ 사용자는 메시지 전송 가능
  REPORT_POST: 4, // Lv.4+ 사용자는 게시물 신고 가능
  MODERATOR_ABILITIES: 5, // Lv.5 사용자는 모더레이터 수준 권한 (삭제 제외)
} as const;

/**
 * 사용자가 다운보트할 수 있는지 확인
 * 
 * @param userLevel - 사용자 레벨
 * @returns 다운보트 가능 여부
 */
export function canDownvote(userLevel: number): boolean {
  return userLevel >= PERMISSION_LEVELS.DOWNVOTE;
}

/**
 * 사용자가 제한된 게시판에 글을 작성할 수 있는지 확인
 * 
 * @param userLevel - 사용자 레벨
 * @param requiredLevel - 게시판의 최소 요구 레벨
 * @returns 글 작성 가능 여부
 */
export function canPostInRestrictedBoard(
  userLevel: number,
  requiredLevel: number
): boolean {
  return userLevel >= requiredLevel;
}

/**
 * 사용자가 메시지를 전송할 수 있는지 확인
 * 
 * @param userLevel - 사용자 레벨
 * @returns 메시지 전송 가능 여부
 */
export function canSendMessage(userLevel: number): boolean {
  return userLevel >= PERMISSION_LEVELS.SEND_MESSAGE;
}

/**
 * 사용자가 게시물을 신고할 수 있는지 확인
 * 
 * @param userLevel - 사용자 레벨
 * @returns 신고 가능 여부
 */
export function canReportPost(userLevel: number): boolean {
  return userLevel >= PERMISSION_LEVELS.REPORT_POST;
}

/**
 * 사용자가 모더레이터 수준 권한을 가지는지 확인
 * Lv.5+ 사용자는 게시글/댓글 숨김(소프트 삭제) 가능
 * 
 * @param userLevel - 사용자 레벨
 * @returns 모더레이터 권한 보유 여부
 */
export function hasModeratorAbilities(userLevel: number): boolean {
  return userLevel >= PERMISSION_LEVELS.MODERATOR_ABILITIES;
}

/**
 * 사용자가 게시글/댓글을 숨길 수 있는지 확인
 * Lv.5+ 사용자는 숨김 처리 가능
 * 
 * @param userLevel - 사용자 레벨
 * @returns 숨김 처리 가능 여부
 */
export function canHideContent(userLevel: number): boolean {
  return userLevel >= PERMISSION_LEVELS.MODERATOR_ABILITIES;
}

/**
 * 포인트에서 권한 체크를 위한 헬퍼 함수
 * 
 * @param points - 사용자 포인트
 * @param permission - 권한 종류
 * @returns 권한 보유 여부
 */
export function checkPermissionFromPoints(
  points: number,
  permission: keyof typeof PERMISSION_LEVELS
): boolean {
  const level = getLevel(points);
  const requiredLevel = PERMISSION_LEVELS[permission];

  switch (permission) {
    case "DOWNVOTE":
      return canDownvote(level);
    case "REPORT_POST":
      return canReportPost(level);
    case "MODERATOR_ABILITIES":
      return hasModeratorAbilities(level);
    case "RESTRICTED_BOARD_POST":
      // 이 경우 requiredLevel 파라미터가 필요하므로 사용하지 않음
      return false;
    default:
      return false;
  }
}

