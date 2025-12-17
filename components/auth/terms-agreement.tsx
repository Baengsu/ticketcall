"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsAgreementProps {
  onAgreementChange: (agreed: boolean) => void;
}

export default function TermsAgreement({ onAgreementChange }: TermsAgreementProps) {
  const [allAgreed, setAllAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [ageAgreed, setAgeAgreed] = useState(false);

  const handleAllAgreed = (checked: boolean) => {
    setAllAgreed(checked);
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setAgeAgreed(checked);
    onAgreementChange(checked);
  };

  const handleTermsAgreed = (checked: boolean) => {
    setTermsAgreed(checked);
    const allChecked = checked && privacyAgreed && ageAgreed;
    setAllAgreed(allChecked);
    onAgreementChange(allChecked);
  };

  const handlePrivacyAgreed = (checked: boolean) => {
    setPrivacyAgreed(checked);
    const allChecked = checked && termsAgreed && ageAgreed;
    setAllAgreed(allChecked);
    onAgreementChange(allChecked);
  };

  const handleAgeAgreed = (checked: boolean) => {
    setAgeAgreed(checked);
    const allChecked = checked && termsAgreed && privacyAgreed;
    setAllAgreed(allChecked);
    onAgreementChange(allChecked);
  };

  return (
    <div className="space-y-4">
      {/* 전체 동의 */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Checkbox
          id="all-agree"
          checked={allAgreed}
          onCheckedChange={handleAllAgreed}
        />
        <label
          htmlFor="all-agree"
          className="text-sm font-medium cursor-pointer"
        >
          이용약관, 개인정보 수집 및 이용에 모두 동의합니다.
        </label>
      </div>

      {/* 이용약관 동의 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="terms-agree"
            checked={termsAgreed}
            onCheckedChange={handleTermsAgreed}
          />
          <label
            htmlFor="terms-agree"
            className="text-sm cursor-pointer"
          >
            이용약관 동의 <span className="text-red-500">(필수)</span>
          </label>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full text-left p-3 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              약관 전문 보기
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>이용약관</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <div>
                <h4 className="font-semibold mb-2">제1조 목적</h4>
                <p>본 이용약관은 "티켓포럼"(이하 "티켓포럼")의 서비스의 이용조건과 운영에 관한 제반 사항 규정을 목적으로 합니다.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">제2조 용어의 정의</h4>
                <p className="mb-2">본 약관에서 사용되는 주요한 용어의 정의는 다음과 같습니다.</p>
                <ul className="space-y-1 ml-4 text-xs">
                  <li>① 회원 : 사이트의 약관에 동의하고 개인정보를 제공하여 회원등록을 한 자로서, 사이트와의 이용계약을 체결하고 사이트를 이용하는 이용자를 말합니다.</li>
                  <li>② 이용계약 : 사이트 이용과 관련하여 사이트와 회원간에 체결 하는 계약을 말합니다.</li>
                  <li>③ 회원 아이디(이하 "ID") : 회원의 식별과 회원의 서비스 이용을 위하여 회원별로 부여하는 고유한 문자와 숫자의 조합을 말합니다.</li>
                  <li>④ 비밀번호 : 회원이 부여받은 ID와 일치된 회원임을 확인하고 회원의 권익 보호를 위하여 회원이 선정한 문자와 숫자의 조합을 말합니다.</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                전체 약관 내용은 하단의 이용약관을 참고해주세요.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 개인정보 수집 및 이용 동의 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="privacy-agree"
            checked={privacyAgreed}
            onCheckedChange={handlePrivacyAgreed}
          />
          <label
            htmlFor="privacy-agree"
            className="text-sm cursor-pointer"
          >
            개인정보 수집 및 이용 동의 <span className="text-red-500">(필수)</span>
          </label>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full text-left p-3 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              약관 전문 보기
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 개인정보 수집목적 및 이용목적</h4>
                <ul className="space-y-2 ml-4">
                  <li>
                    <strong>(1) 홈페이지 회원 가입 및 관리</strong>
                    <p className="text-xs ml-2 mt-1">회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정 이용 방지, 만 14세 미만 아동의 개인정보처리 시 법정대리인의 동의 여부 확인, 각종 고지․통지, 고충 처리 등을 목적으로 개인정보를 처리합니다.</p>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 수집하는 개인정보 항목</h4>
                <ul className="space-y-1 ml-4 text-xs">
                  <li>• 아이디 (필수)</li>
                  <li>• 닉네임 (필수)</li>
                  <li>• 비밀번호 (필수, 암호화 저장)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. 개인정보 보유 및 이용기간</h4>
                <p className="text-xs ml-4">회원 탈퇴 시까지 보유하며, 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                전체 개인정보처리방침은 하단의 개인정보처리방침을 참고해주세요.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 만 14세 이상 확인 */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="age-agree"
          checked={ageAgreed}
          onCheckedChange={handleAgeAgreed}
        />
        <label
          htmlFor="age-agree"
          className="text-sm cursor-pointer"
        >
          만 14세 이상입니다. <span className="text-red-500">(필수)</span>
        </label>
      </div>
    </div>
  );
}

