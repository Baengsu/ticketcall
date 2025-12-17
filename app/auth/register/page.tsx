// app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TermsAgreement from "@/components/auth/terms-agreement";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"terms" | "register">("terms");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);

  // 아이디 중복 체크
  async function checkUsername(username: string) {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingUsername(false);
    }
  }

  // 닉네임 중복 체크
  async function checkNickname(nickname: string) {
    if (!nickname || nickname.length < 2) {
      setNicknameAvailable(null);
      return;
    }

    setCheckingNickname(true);
    try {
      const res = await fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      setNicknameAvailable(data.available);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingNickname(false);
    }
  }

  function handleTermsNext() {
    if (!isAgreed) {
      setErrorMsg("모든 약관에 동의해주세요.");
      return;
    }
    setStep("register");
    setErrorMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    // 유효성 검사
    if (!username || username.length < 3) {
      setErrorMsg("아이디는 최소 3자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    if (!nickname || nickname.length < 2) {
      setErrorMsg("닉네임은 최소 2자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    if (usernameAvailable === false) {
      setErrorMsg("이미 사용 중인 아이디입니다.");
      setIsLoading(false);
      return;
    }

    if (nicknameAvailable === false) {
      setErrorMsg("이미 사용 중인 닉네임입니다.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, nickname, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMsg(data?.message ?? "회원가입에 실패했습니다.");
        return;
      }

      // 성공하면 로그인 페이지로 이동
      router.push("/auth/login?registered=true");
    } catch (err) {
      console.error(err);
      setErrorMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (step === "terms") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                약관동의
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              회원가입을 위해 약관에 동의해주세요
            </p>
          </CardHeader>
          <CardContent>
            <TermsAgreement onAgreementChange={setIsAgreed} />

            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errorMsg}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/")}
              >
                취소
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleTermsNext}
                disabled={!isAgreed}
              >
                가입하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🎫</span>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              회원가입
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            TicketForum에 가입하고 시작하세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">아이디</label>
              <div className="relative">
                <Input
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                    setUsername(value);
                    if (value.length >= 3) {
                      checkUsername(value);
                    } else {
                      setUsernameAvailable(null);
                    }
                  }}
                  placeholder="영문, 숫자, _ 만 사용 가능 (3자 이상)"
                  minLength={3}
                  required
                  className="focus:ring-2 focus:ring-primary"
                />
                {checkingUsername && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    확인 중...
                  </span>
                )}
                {usernameAvailable === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600">
                    사용 가능
                  </span>
                )}
                {usernameAvailable === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-600">
                    사용 불가
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                아이디는 영문, 숫자, _ 만 사용 가능하며 최소 3자 이상이어야 합니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">닉네임</label>
              <div className="relative">
                <Input
                  value={nickname}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setNickname(value);
                    if (value.length >= 2) {
                      checkNickname(value);
                    } else {
                      setNicknameAvailable(null);
                    }
                  }}
                  placeholder="닉네임 (2자 이상)"
                  minLength={2}
                  required
                  className="focus:ring-2 focus:ring-primary"
                />
                {checkingNickname && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    확인 중...
                  </span>
                )}
                {nicknameAvailable === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600">
                    사용 가능
                  </span>
                )}
                {nicknameAvailable === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-600">
                    사용 불가
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                닉네임은 최소 2자 이상이어야 하며, 다른 회원과 중복될 수 없습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="focus:ring-2 focus:ring-primary"
                placeholder="최소 6자 이상"
              />
              <p className="text-xs text-muted-foreground">
                비밀번호는 최소 6자 이상이어야 합니다.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
                  {errorMsg}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep("terms")}
                disabled={isLoading}
              >
                이전
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || usernameAvailable === false || nicknameAvailable === false}
              >
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground">
                이미 계정이 있나요?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  로그인하기
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
