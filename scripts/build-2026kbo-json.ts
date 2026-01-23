// scripts/build-2026kbo-json.ts
// KBO 2026 시즌 일정 텍스트 파일을 JSON으로 변환하는 스크립트

import * as fs from "fs";
import * as path from "path";

interface KBOGame {
  source: string;
  title: string;
  openAt: string; // ISO format: YYYY-MM-DDTHH:mm
  openAtLabel: string; // Human-readable: YYYY-MM-DD HH:mm:ss
  region: string; // 경기장 이름
  detailUrl: string; // 빈 문자열 placeholder
}

// 날짜 파싱: "03.28(토)" -> { month: 3, day: 28 }
function parseDate(dateStr: string): { month: number; day: number } | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\(/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

// 시간 파싱: "14:00" -> { hour: 14, minute: 0 }
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

// 팀 매치업 정규화: "KTvsLG" -> "KT vs LG"
function normalizeMatchup(matchup: string): string {
  // "vs" 또는 "VS"를 찾아서 양쪽에 공백 추가
  return matchup
    .replace(/([A-Z가-힣]+)vs([A-Z가-힣]+)/gi, "$1 vs $2")
    .replace(/([A-Z가-힣]+)VS([A-Z가-힣]+)/gi, "$1 vs $2")
    .trim();
}

// ISO 날짜 문자열 생성: YYYY-MM-DDTHH:mm
function formatISO(year: number, month: number, day: number, hour: number, minute: number): string {
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  const h = hour.toString().padStart(2, "0");
  const min = minute.toString().padStart(2, "0");
  return `${year}-${m}-${d}T${h}:${min}`;
}

// 라벨 형식: YYYY-MM-DD HH:mm:ss
function formatLabel(year: number, month: number, day: number, hour: number, minute: number): string {
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  const h = hour.toString().padStart(2, "0");
  const min = minute.toString().padStart(2, "0");
  return `${year}-${m}-${d} ${h}:${min}:00`;
}

// 제목 생성: "[경기장] 팀A vs 팀B"
function createTitle(venue: string, matchup: string): string {
  const normalizedMatchup = normalizeMatchup(matchup);
  return `[${venue}] ${normalizedMatchup}`;
}

function main() {
  const inputPath = path.join(__dirname, "..", "data", "2026kbo.txt");
  const outputPath = path.join(__dirname, "..", "data", "2026kbo.json");

  console.log(`Reading from: ${inputPath}`);

  const content = fs.readFileSync(inputPath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  const games: KBOGame[] = [];
  const seen = new Set<string>(); // 중복 체크용
  let currentDate: { month: number; day: number } | null = null;
  const year = 2026;

  for (const line of lines) {
    // 탭으로 분리
    const parts = line.split("\t").map((p) => p.trim()).filter((p) => p.length > 0);

    if (parts.length < 3) continue; // 최소한 날짜/시간, 매치업, 경기장이 필요

    let datePart: string | null = null;
    let timePart: string | null = null;
    let matchupPart: string | null = null;
    let venuePart: string | null = null;

    // 알려진 경기장 목록
    const knownVenues = ["잠실", "문학", "대구", "창원", "대전", "사직", "수원", "광주", "고척"];

    // 첫 번째 컬럼이 날짜 형식인지 확인
    const firstPart = parts[0];
    const dateMatch = parseDate(firstPart);

    if (dateMatch) {
      // 날짜가 있는 경우
      currentDate = dateMatch;
      datePart = firstPart;
      timePart = parts[1] || null;
      matchupPart = parts[2] || null;
      // 경기장은 보통 뒤쪽에 있음 (탭으로 분리된 컬럼 중에서 찾기)
      for (let i = 3; i < parts.length; i++) {
        const p = parts[i];
        if (p && p !== "-" && knownVenues.includes(p)) {
          venuePart = p;
          break;
        }
      }
    } else {
      // 날짜가 없는 경우 (이전 날짜 상속)
      if (!currentDate) continue; // 날짜가 없으면 스킵
      timePart = parts[0] || null;
      matchupPart = parts[1] || null;
      // 경기장 찾기
      for (let i = 2; i < parts.length; i++) {
        const p = parts[i];
        if (p && p !== "-" && knownVenues.includes(p)) {
          venuePart = p;
          break;
        }
      }
    }

    // 필수 필드 검증
    if (!currentDate || !timePart || !matchupPart || !venuePart) {
      continue;
    }

    const time = parseTime(timePart);
    if (!time) continue;

    // 중복 체크: 같은 날짜+시간+매치업+경기장
    const dedupKey = `${currentDate.month}-${currentDate.day}-${time.hour}-${time.minute}-${matchupPart}-${venuePart}`;
    if (seen.has(dedupKey)) {
      continue;
    }
    seen.add(dedupKey);

    // 게임 객체 생성
    const openAt = formatISO(year, currentDate.month, currentDate.day, time.hour, time.minute);
    const openAtLabel = formatLabel(year, currentDate.month, currentDate.day, time.hour, time.minute);
    const title = createTitle(venuePart, matchupPart);

    games.push({
      source: "kbo",
      title,
      openAt,
      openAtLabel,
      region: venuePart,
      detailUrl: "",
    });
  }

  // 날짜와 시간 순으로 정렬
  games.sort((a, b) => a.openAt.localeCompare(b.openAt));

  // JSON 파일로 저장
  const output = JSON.stringify(games, null, 2);
  fs.writeFileSync(outputPath, output, "utf-8");

  // 통계 출력
  const venues = new Set(games.map((g) => g.region));
  const dates = games.map((g) => g.openAt.split("T")[0]);
  const minDate = dates.length > 0 ? dates[0] : "N/A";
  const maxDate = dates.length > 0 ? dates[dates.length - 1] : "N/A";

  console.log("\n✅ 변환 완료!");
  console.log(`📊 총 게임 수: ${games.length}건`);
  console.log(`🏟️  경기장 수: ${venues.size}개 (${Array.from(venues).sort().join(", ")})`);
  console.log(`📅 날짜 범위: ${minDate} ~ ${maxDate}`);
  console.log(`💾 저장 위치: ${outputPath}`);
}

main();
