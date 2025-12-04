// app/auth/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false, // 직접 라우터로 이동 제어
      });

      if (res?.error) {
        setErrorMsg("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      // 성공 → 홈으로 이동
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setErrorMsg("알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md border rounded-lg p-6 bg-card shadow-sm">
        <h1 className="text-xl font-semibold mb-4 text-center">로그인</h1>

        {registered && (
          <p className="mb-2 text-xs text-emerald-600 text-center">
            회원가입이 완료되었습니다. 이메일과 비밀번호로 로그인해 주세요.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">이메일</label>
            <input
              type="email"
              className="w-full rounded border px-3 py-2 text-sm bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">비밀번호</label>
            <input
              type="password"
              className="w-full rounded border px-3 py-2 text-sm bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 whitespace-pre-line">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-muted-foreground">
          아직 계정이 없으신가요?{" "}
          <a href="/auth/register" className="underline">
            회원가입 하기
          </a>
        </p>
      </div>
    </main>
  );
}
