"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserPointsAdjustProps {
  userId: string;
  userName: string | null;
  currentPoints: number;
  onSuccess?: () => void;
}

export default function UserPointsAdjust({
  userId,
  userName,
  currentPoints,
  onSuccess,
}: UserPointsAdjustProps) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum === 0) {
      setError("0이 아닌 유효한 포인트 값을 입력해 주세요.");
      return;
    }

    if (!reason.trim()) {
      setError("포인트 조정 이유를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: amountNum,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "포인트 조정에 실패했습니다.");
        return;
      }

      setSuccess(
        `포인트 조정 완료: ${data.oldPoints} → ${data.newPoints} (${amountNum > 0 ? "+" : ""}${amountNum})`
      );
      setAmount("");
      setReason("");

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
        <Input
          type="number"
          placeholder="포인트 (양수/음수)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 text-sm"
          disabled={loading}
        />
        <Input
          type="text"
          placeholder="조정 이유"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "처리 중..." : "적용"}
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

