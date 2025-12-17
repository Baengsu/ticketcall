// app/auth/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  // 🔥 URL 쿼리로 넘어온 에러 코드 (?error=AccountDisabled 등)
  const errorCode = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // 🔥 초기 에러 메시지: URL에 AccountDisabled가 있으면 바로 세팅
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    if (errorCode === "AccountDisabled") {
      return "이 계정은 관리자에 의해 정지되었습니다. 자세한 문의는 관리자에게 연락해 주세요.";
    }
    return null;
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!username || !password) {
      setErrorMsg("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false, // 직접 라우터로 이동 제어
      });

      if (res?.error) {
        // 🔥 정지된 계정인 경우 별도 메시지
        if (res.error === "AccountDisabled") {
          setErrorMsg(
            "이 계정은 관리자에 의해 정지되었습니다. 자세한 문의는 관리자에게 연락해 주세요."
          );
        } else {
          // 그 외에는 기존처럼 자격 증명 오류
          setErrorMsg("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
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
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-md">
        <div className="border rounded-xl p-8 bg-gradient-to-br from-card to-card/95 shadow-xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎫</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                로그인
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              TicketForum에 오신 것을 환영합니다
            </p>
          </div>

          {registered && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 text-center">
                ✅ 회원가입이 완료되었습니다. 아이디와 비밀번호로 로그인해 주세요.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">아이디</label>
              <input
                type="text"
                className="w-full rounded-lg border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <input
                type="password"
                className="w-full rounded-lg border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
                  {errorMsg}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-center text-muted-foreground">
              아직 계정이 없으신가요?{" "}
              <a 
                href="/auth/register" 
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                회원가입 하기
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
