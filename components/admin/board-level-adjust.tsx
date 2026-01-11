"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardLevelAdjustProps {
  boardId: number;
  boardName: string;
  currentLevel: number;
  onSuccess?: () => void;
}

export default function BoardLevelAdjust({
  boardId,
  boardName,
  currentLevel,
  onSuccess,
}: BoardLevelAdjustProps) {
  const router = useRouter();
  const [level, setLevel] = useState<string>(String(currentLevel));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const levelNum = Number(level);
    if (!Number.isInteger(levelNum) || levelNum < 1 || levelNum > 5) {
      setError("레벨은 1-5 사이의 정수여야 합니다.");
      return;
    }

    if (levelNum === currentLevel) {
      setError("현재 레벨과 동일합니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minPostLevel: levelNum,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "레벨 변경에 실패했습니다.");
        return;
      }

      setSuccess(`레벨 변경 완료: Lv.${currentLevel} → Lv.${levelNum}`);
      setLevel(String(levelNum));
      
      // 페이지 새로고침하여 최신 데이터 표시
      setTimeout(() => {
        router.refresh();
        if (onSuccess) {
          onSuccess();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          최소 레벨:
        </span>
        <Input
          type="number"
          min="1"
          max="5"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="w-20 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={loading || Number(level) === currentLevel}>
          {loading ? "처리 중..." : "변경"}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
      )}
    </form>
  );
}

