## ticketforum 사이트 개발기 (웹사이트 개발 도전)
### 2025-12-01
    - Next.js(TypeScript) 사용예정
    - Tailwind + shadcn UI
    - 기능
        개발 단계에서 내가 지정하는 URL들을 크롤링
        HTML / JSON / XML 등 가져와서 서버에서 가공
        가공한 데이터를 웹 UI(대시보드/검색/카드/차트) 로 보여줌
        나중에는 정기적으로(예: 1시간마다) 다시 크롤링해서 자동 업데이트되는 파이프라인
    - 필수 라이브러리
        cheerio (HTML 파싱)
        xml2js (XML → JS 오브젝트)
        zod (나중에 스키마 검증용 – 선택이지만 강력)
        shadcn UI CLI
### 2025-12-02
    - inter, link, yes, melon 4개의 기종 사이트 별로 코드를 진행 할 예정 (lib)
    - 그리고 aggregate 로 병합해서 데이터 셋 구성
    - shadcn UI 설치 및 적용
    - 웹페이지 달력으로 일단은 진행 최소로 해야할듯!
    - 티켓링크 파이프 추가 확장중
    - 월간 달력뷰만 남겨두고 전부 삭제

### 2025-12-03
    - 예스 24 티켓 크롤링 확장 구현 완료
    - 예스 24 티켓 크롤링 데이터 정제 및 반영 파이프라인 구축 완료
    - 인터파크 크롤링 확장 구현 완료
    - 인터파크 데이터 파이프 라인 구현 완료
    - 멜론티켓 구현 완료
    - ticketlounge 홈페이지명 변경

### 2025-12-04
    - MYSQL 연동 작업 (회원가입)
    - 회원가입, 로그인 API 설계
    - UI 확장 설계, 회원가입, 로그인

### 2025-12-05
    - 상단 탭 수정
    - 공지사항, 자유게시판 구성
    - 로그인, 회원가입 구성
    - 회원 권한 설정 <user, admin>
    - API 코드 리팩토링
    - 자유게시판을 건의사항 게시판으로 변경
    - 건의사항게시판 댓글허용 및 유저만 읽을 수 있게 설정
    - admin 전용 리빌딩 버튼 구현
    - 로그아웃 버튼 구현
    - 댓글 구현

### 2025-12-06
    <숙제>
    - USER가 쓴 글은 본인이 지울 수 있는 버튼 만들기 즉, 수정, 삭제 버튼 만들기.
    - 댓글 삭제 버튼도 만들어야할듯..
    - ADMIN은 모두 삭제 할 수 있음

### 2025-12-09
    - 게시물, 댓글 수정 및 삭제 버튼 만들기 구현
    - 관리자 페이지 구현
    - 실시간 접속자 구현
    - 건의사항 마스킹 구현
    - 관리자 페이지 리빌딩 세션 로그 구현
    - 공지사항 고정 만들기
    - ticketforum 1.1.2 업데이트

### 2025-12-10
    - 고정 공지 현황
    - 숨김 처리된 게시글 개수
    - 관리자 페이지 테이블 구성
    - 건의사항에 관리자 공식 답변
    - 게시글 신고 시스템
    - 건의 처리 / 답변 알림 + 헤더 뱃지
    - 건의사항에 관리자 답변 섹션
    - 캘린더 프런트 변경 / 파피콘 추가 / 10,000 이상 핫 추가
    - 아이디 계정 정지
    - 관리자 페이지에서 유저계정 상세 분석 툴

### 2025-12-17
    - 자동 리빌딩 시스템 구축
    - 리빌링 확인 UI 개선
    - 공지사항 오류 수정
    - 건의사항 오류 수정
    - 관리자에서 유저 목록 / 권한 변경
    - 관리자에서 크롤링 상태 모니터링(사이트별)
    - 개인정보처리방침, 이용약관, 저작권 표시
    - 회원가입 조건 변경 - 이용약관 동의 팝업
    - 아이디, 비밀번호, 닉네임만 필요
    - 로그인 로직 대규모 업데이트
    - 게시글 조회수 설정

### 2025-12-19
    - 레일웨이로 배포 작업 중 다수 문제 발견
    - DB 변경
    - 환경 변수 변경
    - DB 인덱스/unique 정리
    - Prisma 성능 튜닝
    - NextAuth + Postgres 최적 세팅


    - 공연 일정 관심 표시 / 찜하기
    - 공연 알림 레벨 태그
    - 게시판 검색 / 필터
    - 오늘 / 이번주 예매 오픈 알림 블럭
    - 필터 가능한 캘린더
    - 내 활동 간단 통계

## 프로젝트 구조

```
ticketcall
├─ app/                                    # Next.js App Router 페이지 및 API 라우트
│  ├─ admin/                              # 관리자 페이지
│  │  ├─ etc-events/
│  │  │  └─ page.tsx                      # 기타 이벤트 관리 페이지
│  │  ├─ messages/
│  │  │  ├─ page.tsx                      # 메시지 관리 페이지
│  │  │  └─ reports/
│  │  │     ├─ page-client.tsx            # 메시지 신고 클라이언트 컴포넌트
│  │  │     └─ page.tsx                   # 메시지 신고 관리 페이지
│  │  ├─ page.tsx                         # 관리자 대시보드
│  │  ├─ reports/
│  │  │  └─ page.tsx                      # 신고 관리 페이지
│  │  └─ users/
│  │     ├─ [userId]/
│  │     │  └─ page.tsx                   # 사용자 상세 페이지
│  │     └─ page.tsx                      # 사용자 목록 페이지
│  ├─ api/                                 # API 라우트
│  │  ├─ admin/                           # 관리자 API
│  │  │  ├─ boards/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ route.ts                # 게시판 상세 관리 API
│  │  │  │  └─ route.ts                   # 게시판 관리 API
│  │  │  ├─ hide/
│  │  │  │  └─ route.ts                   # 게시글 숨김 처리 API
│  │  │  ├─ messages/
│  │  │  │  ├─ block/
│  │  │  │  │  └─ route.ts                # 메시지 차단 API
│  │  │  │  ├─ block-user/
│  │  │  │  │  └─ route.ts                # 사용자 차단 API
│  │  │  │  ├─ reports/
│  │  │  │  │  └─ route.ts                # 메시지 신고 관리 API
│  │  │  │  ├─ route.ts                   # 메시지 관리 API
│  │  │  │  └─ thread/
│  │  │  │     └─ [threadId]/route.ts     # 메시지 스레드 관리 API
│  │  │  ├─ points/
│  │  │  │  └─ route.ts                   # 포인트 관리 API
│  │  │  ├─ posts-summary/
│  │  │  │  └─ route.ts                   # 게시글 요약 통계 API
│  │  │  ├─ rebuild-logs/
│  │  │  │  └─ route.ts                   # 리빌드 로그 조회 API
│  │  │  └─ reports/
│  │  │     └─ route.ts                   # 신고 관리 API
│  │  ├─ auth/                             # 인증 API
│  │  │  ├─ [...nextauth]/
│  │  │  │  └─ route.ts                   # NextAuth 인증 핸들러
│  │  │  ├─ check-nickname/
│  │  │  │  └─ route.ts                   # 닉네임 중복 확인 API
│  │  │  ├─ check-username/
│  │  │  │  └─ route.ts                   # 아이디 중복 확인 API
│  │  │  └─ register/
│  │  │     └─ route.ts                   # 회원가입 API
│  │  ├─ board/                            # 게시판 API
│  │  │  ├─ [slug]/
│  │  │  │  └─ posts/route.ts             # 게시판별 게시글 목록 API
│  │  │  ├─ comment/
│  │  │  │  ├─ route.ts                   # 댓글 CRUD API
│  │  │  │  └─ vote/route.ts              # 댓글 추천 API
│  │  │  ├─ pin/
│  │  │  │  └─ route.ts                   # 게시글 고정 API
│  │  │  ├─ post/
│  │  │  │  ├─ route.ts                   # 게시글 CRUD API
│  │  │  │  └─ vote/route.ts              # 게시글 추천 API
│  │  │  ├─ report/
│  │  │  │  └─ route.ts                   # 게시글 신고 API
│  │  │  └─ upload-image/
│  │  │     └─ route.ts                   # 이미지 업로드 API
│  │  ├─ debug/                            # 디버그 API
│  │  │  └─ yes/
│  │  │     └─ route.ts                   # YES24 크롤링 디버그 API
│  │  ├─ debug-events/
│  │  │  └─ route.ts                       # 이벤트 디버그 API
│  │  ├─ favorites/                        # 찜하기 API
│  │  │  ├─ check/
│  │  │  │  └─ route.ts                   # 찜하기 확인 API
│  │  │  └─ route.ts                      # 찜하기 CRUD API
│  │  ├─ icons/                            # 아이콘 API
│  │  │  ├─ equip/
│  │  │  │  └─ route.ts                   # 아이콘 장착 API
│  │  │  └─ evolve/
│  │  │     └─ route.ts                   # 아이콘 진화 API
│  │  ├─ messages/                         # 메시지 API
│  │  │  ├─ [messageId]/
│  │  │  │  ├─ delete/route.ts            # 메시지 삭제 API
│  │  │  │  └─ route.ts                   # 메시지 상세 API
│  │  │  ├─ block/
│  │  │  │  └─ route.ts                   # 메시지 차단 API
│  │  │  ├─ mark-notifications-read/
│  │  │  │  └─ route.ts                   # 알림 읽음 처리 API
│  │  │  ├─ report/
│  │  │  │  └─ route.ts                   # 메시지 신고 API
│  │  │  ├─ route.ts                      # 메시지 목록/생성 API
│  │  │  └─ upload/
│  │  │     └─ route.ts                   # 메시지 파일 업로드 API
│  │  ├─ notifications/
│  │  │  └─ unread-count/
│  │  │     └─ route.ts                   # 읽지 않은 알림 수 API
│  │  ├─ online-count/
│  │  │  └─ route.ts                      # 실시간 접속자 수 API
│  │  ├─ ping/
│  │  │  └─ route.ts                      # 헬스체크 API
│  │  └─ rebuild/
│  │     └─ route.ts                      # 데이터 리빌드 API
│  ├─ auth/                                # 인증 페이지
│  │  ├─ login/
│  │  │  └─ page.tsx                      # 로그인 페이지
│  │  └─ register/
│  │     └─ page.tsx                      # 회원가입 페이지
│  ├─ board/                               # 게시판 페이지
│  │  └─ [slug]/
│  │     ├─ [postID]/
│  │     │  ├─ comment/
│  │     │  │  └─ [commentID]/
│  │     │  │     └─ edit/
│  │     │  │        └─ page.tsx          # 댓글 수정 페이지
│  │     │  ├─ edit/
│  │     │  │  └─ page.tsx                # 게시글 수정 페이지
│  │     │  └─ page.tsx                   # 게시글 상세 페이지
│  │     ├─ new/
│  │     │  └─ page.tsx                   # 게시글 작성 페이지
│  │     └─ page.tsx                      # 게시판 목록 페이지
│  ├─ messages/
│  │  └─ page.tsx                         # 메시지 목록 페이지
│  ├─ mypage/
│  │  └─ page.tsx                         # 마이페이지
│  ├─ performance/
│  │  └─ [Id]/
│  │     └─ page.tsx                      # 공연 상세 페이지
│  ├─ ranking/
│  │  └─ page.tsx                         # 랭킹 페이지
│  ├─ apple-icon.tsx                      # Apple 아이콘 설정
│  ├─ favicon.ico                         # 파비콘
│  ├─ globals.css                         # 전역 CSS 스타일
│  ├─ icon.tsx                            # 기본 아이콘 설정
│  ├─ layout.tsx                          # 루트 레이아웃
│  └─ page.tsx                            # 홈페이지 (캘린더 뷰)
├─ components/                             # React 컴포넌트
│  ├─ achievements/                       # 업적 관련 컴포넌트
│  │  ├─ achievement-badge.tsx           # 업적 배지 컴포넌트
│  │  └─ achievements-list.tsx            # 업적 목록 컴포넌트
│  ├─ admin/                              # 관리자 컴포넌트
│  │  ├─ board-level-adjust.tsx           # 게시판 레벨 조정 컴포넌트
│  │  └─ user-points-adjust.tsx           # 사용자 포인트 조정 컴포넌트
│  ├─ auth/                               # 인증 관련 컴포넌트
│  │  └─ terms-agreement.tsx              # 이용약관 동의 컴포넌트
│  ├─ board/                              # 게시판 컴포넌트
│  │  ├─ comment-section.tsx              # 댓글 섹션 컴포넌트
│  │  ├─ comments-client.tsx              # 댓글 클라이언트 컴포넌트
│  │  ├─ level-badge.tsx                  # 레벨 배지 컴포넌트
│  │  ├─ new-post-form.tsx                # 새 게시글 작성 폼
│  │  ├─ post-content.tsx                 # 게시글 내용 컴포넌트
│  │  ├─ posts-list.tsx                   # 게시글 목록 컴포넌트
│  │  ├─ rich-text-editor.tsx             # 리치 텍스트 에디터
│  │  ├─ search-filter.tsx                # 검색 필터 컴포넌트
│  │  └─ user-badge.tsx                   # 사용자 배지 컴포넌트
│  ├─ icons/                              # 아이콘 컴포넌트
│  │  └─ NicknameIcon.tsx                 # 닉네임 아이콘 컴포넌트
│  ├─ messages/                           # 메시지 컴포넌트
│  │  ├─ blocked-users-manager.tsx        # 차단 사용자 관리 컴포넌트
│  │  ├─ messages-list.tsx                # 메시지 목록 컴포넌트
│  │  └─ send-message-button.tsx          # 메시지 전송 버튼
│  ├─ mypage/                             # 마이페이지 컴포넌트
│  │  └─ notifications-list.tsx           # 알림 목록 컴포넌트
│  ├─ ui/                                 # UI 컴포넌트 (shadcn)
│  │  ├─ button.tsx                       # 버튼 컴포넌트
│  │  ├─ card.tsx                         # 카드 컴포넌트
│  │  ├─ checkbox.tsx                     # 체크박스 컴포넌트
│  │  ├─ dialog.tsx                       # 다이얼로그 컴포넌트
│  │  ├─ input.tsx                        # 입력 컴포넌트
│  │  ├─ popover.tsx                      # 팝오버 컴포넌트
│  │  ├─ table.tsx                        # 테이블 컴포넌트
│  │  └─ tabs.tsx                         # 탭 컴포넌트
│  ├─ auth-provider.tsx                   # 인증 프로바이더
│  ├─ calendar-client.tsx                 # 캘린더 클라이언트 컴포넌트
│  ├─ favorites-list.tsx                  # 찜하기 목록 컴포넌트
│  ├─ online-tracker.tsx                  # 실시간 접속자 추적 컴포넌트
│  ├─ site-footer.tsx                     # 사이트 푸터
│  ├─ site-header.tsx                     # 사이트 헤더
│  └─ theme-provider.tsx                  # 테마 프로바이더
├─ components.json                        # shadcn UI 설정 파일
├─ data/                                  # 데이터 파일
│  ├─ merged-backup.json                 # 병합된 데이터 백업
│  ├─ merged-live.json                   # 병합된 실시간 데이터
│  ├─ yes-debug.json                     # YES24 디버그 데이터
│  └─ yes-raw.html                       # YES24 원본 HTML
├─ lib/                                   # 유틸리티 및 비즈니스 로직
│  ├─ tiptap-extensions/                 # TipTap 확장
│  │  ├─ font-family.ts                  # 폰트 패밀리 확장
│  │  ├─ font-size.ts                    # 폰트 크기 확장
│  │  └─ text-align-persist.ts           # 텍스트 정렬 유지 확장
│  ├─ achievements.ts                     # 업적 시스템 로직
│  ├─ aggregate.ts                        # 크롤링 데이터 병합 로직
│  ├─ auth.ts                             # 인증 유틸리티
│  ├─ badges.ts                           # 배지 시스템 로직
│  ├─ baseCrawler.ts                      # 크롤러 기본 클래스
│  ├─ events.ts                           # 이벤트 처리 로직
│  ├─ html-sanitize.ts                    # HTML 정제 유틸리티
│  ├─ image-compress.ts                   # 이미지 압축 유틸리티
│  ├─ inter.ts                            # 인터파크 크롤러
│  ├─ level.ts                            # 레벨 시스템 로직
│  ├─ link.ts                             # 링크 크롤러
│  ├─ melon.ts                            # 멜론티켓 크롤러
│  ├─ permissions.ts                      # 권한 체크 유틸리티
│  ├─ points.ts                           # 포인트 시스템 로직
│  ├─ prisma.ts                           # Prisma 클라이언트 설정
│  ├─ ranking.ts                          # 랭킹 시스템 로직
│  ├─ redis.ts                            # Redis 클라이언트 설정
│  ├─ types.ts                            # TypeScript 타입 정의
│  ├─ utils.ts                            # 공통 유틸리티 함수
│  └─ yes.ts                              # YES24 크롤러
├─ prisma/                                # Prisma 데이터베이스 설정
│  ├─ migrations/                         # 데이터베이스 마이그레이션
│  │  ├─ 20251221075321_init/
│  │  │  └─ migration.sql                # 초기 마이그레이션 SQL
│  │  └─ migration_lock.toml             # 마이그레이션 락 파일
│  ├─ schema.prisma                       # Prisma 스키마 정의
│  └─ seed.ts                             # 데이터베이스 시드 스크립트
├─ public/                                # 정적 파일
│  ├─ icons/                              # 아이콘 파일
│  │  └─ custom/
│  │     └─ phoenix/                      # 피닉스 아이콘 (8개 SVG)
│  ├─ uploads/                            # 업로드된 파일
│  ├─ file.svg                            # 파일 아이콘
│  ├─ globe.svg                           # 지구 아이콘
│  ├─ inter.ico                           # 인터파크 파비콘
│  ├─ link.ico                            # 링크 파비콘
│  ├─ melon.ico                           # 멜론티켓 파비콘
│  ├─ next.svg                            # Next.js 로고
│  ├─ vercel.svg                          # Vercel 로고
│  ├─ window.svg                          # 윈도우 아이콘
│  └─ yes.ico                             # YES24 파비콘
├─ scripts/                               # 스크립트 파일
│  ├─ local-cron.js                       # 로컬 크론 작업 스크립트
│  ├─ seed-phoenix-icons.ts               # 피닉스 아이콘 시드 스크립트
│  └─ set-admin.ts                        # 관리자 계정 설정 스크립트
├─ build-all-errors.txt                   # 빌드 에러 로그 (전체)
├─ build-errors.txt                       # 빌드 에러 로그
├─ docker-compose.yml                     # Docker Compose 설정
├─ DEPLOYMENT.md                          # 배포 가이드 문서
├─ eslint.config.mjs                      # ESLint 설정
├─ middleware.ts                          # Next.js 미들웨어 (인증/권한)
├─ next.config.ts                         # Next.js 설정
├─ next-env.d.ts                          # Next.js 타입 정의
├─ nixpacks.toml                          # Nixpacks 빌드 설정
├─ package.json                           # npm 패키지 설정
├─ package-lock.json                      # npm 패키지 락 파일
├─ POSTGRES_MIGRATION.md                  # PostgreSQL 마이그레이션 가이드
├─ postcss.config.mjs                     # PostCSS 설정
├─ prisma.config.bak                      # Prisma 설정 백업
├─ prisma.config.ts                       # Prisma 설정
├─ projecttree.md                         # 프로젝트 트리 문서
├─ RAILWAY_BUILD_FIX.md                   # Railway 빌드 수정 가이드
├─ RAILWAY_POSTGRES_DEPLOYMENT.md         # Railway PostgreSQL 배포 가이드
├─ railway.json                           # Railway 배포 설정
├─ README_ENV_SETUP.md                    # 환경 변수 설정 가이드
├─ README_LOCAL_SETUP.md                  # 로컬 설정 가이드
├─ README.md                              # 프로젝트 README (현재 파일)
├─ SYNC_LOCKFILE.md                       # 패키지 락 파일 동기화 가이드
├─ tsconfig.json                          # TypeScript 설정
├─ tsconfig.tsbuildinfo                   # TypeScript 빌드 정보
└─ vercel.json                            # Vercel 배포 설정
```