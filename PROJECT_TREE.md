# TicketCall 프로젝트 트리

```
ticketcall/
├── .cursorrules                    # Cursor AI 규칙 설정
├── .gitignore                      # Git 무시 파일 목록
├── .nvmrc                          # Node.js 버전 관리
├── components.json                 # shadcn/ui 컴포넌트 설정
├── docker-compose.yml              # Docker Compose 설정
├── eslint.config.mjs               # ESLint 설정
├── middleware.ts                    # Next.js 미들웨어
├── next.config.ts                   # Next.js 설정
├── nixpacks.toml                   # Nixpacks 배포 설정
├── package.json                    # 프로젝트 의존성 및 스크립트
├── package-lock.json               # 패키지 잠금 파일
├── postcss.config.mjs              # PostCSS 설정
├── prisma.config.ts                # Prisma 설정
├── prisma.config.bak               # Prisma 설정 백업
├── railway.json                    # Railway 배포 설정
├── tsconfig.json                   # TypeScript 설정
├── vercel.json                     # Vercel 배포 설정
│
├── app/                            # Next.js App Router
│   ├── admin/                      # 관리자 페이지
│   │   ├── etc-events/
│   │   │   └── page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx
│   │   │   └── reports/
│   │   │       ├── page-client.tsx
│   │   │       └── page.tsx
│   │   ├── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   ├── [userId]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── vote-stats/
│   │       └── page.tsx
│   │
│   ├── api/                        # API 라우트
│   │   ├── admin/                  # 관리자 API
│   │   │   ├── audit-logs/
│   │   │   │   └── route.ts
│   │   │   ├── boards/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── hide/
│   │   │   │   └── route.ts
│   │   │   ├── messages/
│   │   │   │   ├── block/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── block-user/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── reports/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── route.ts
│   │   │   │   └── thread/
│   │   │   │       └── [threadId]/
│   │   │   │           └── route.ts
│   │   │   ├── points/
│   │   │   │   └── route.ts
│   │   │   ├── posts-summary/
│   │   │   │   └── route.ts
│   │   │   ├── rebuild-logs/
│   │   │   │   └── route.ts
│   │   │   ├── reports/
│   │   │   │   └── route.ts
│   │   │   └── vote-stats/
│   │   │       └── route.ts
│   │   │
│   │   ├── auth/                   # 인증 API
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts
│   │   │   ├── check-nickname/
│   │   │   │   └── route.ts
│   │   │   ├── check-username/
│   │   │   │   └── route.ts
│   │   │   └── register/
│   │   │       └── route.ts
│   │   │
│   │   ├── board/                  # 게시판 API
│   │   │   ├── [slug]/
│   │   │   │   └── posts/
│   │   │   │       └── route.ts
│   │   │   ├── comment/
│   │   │   │   ├── route.ts
│   │   │   │   └── vote/
│   │   │   │       └── route.ts
│   │   │   ├── pin/
│   │   │   │   └── route.ts
│   │   │   ├── post/
│   │   │   │   ├── route.ts
│   │   │   │   └── vote/
│   │   │   │       └── route.ts
│   │   │   ├── report/
│   │   │   │   └── route.ts
│   │   │   └── upload-image/
│   │   │       └── route.ts
│   │   │
│   │   ├── debug/                  # 디버그 API
│   │   │   └── yes/
│   │   │       └── route.ts
│   │   │
│   │   ├── debug-events/
│   │   │   └── route.ts
│   │   │
│   │   ├── favorites/              # 즐겨찾기 API
│   │   │   ├── check/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   │
│   │   ├── icons/                  # 아이콘 API
│   │   │   ├── equip/
│   │   │   │   └── route.ts
│   │   │   └── evolve/
│   │   │       └── route.ts
│   │   │
│   │   ├── messages/               # 메시지 API
│   │   │   ├── [messageId]/
│   │   │   │   ├── delete/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── block/
│   │   │   │   └── route.ts
│   │   │   ├── mark-notifications-read/
│   │   │   │   └── route.ts
│   │   │   ├── report/
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   │
│   │   ├── notifications/         # 알림 API
│   │   │   └── unread-count/
│   │   │       └── route.ts
│   │   │
│   │   ├── online-count/
│   │   │   └── route.ts
│   │   │
│   │   ├── ping/
│   │   │   └── route.ts
│   │   │
│   │   └── rebuild/
│   │       └── route.ts
│   │
│   ├── auth/                       # 인증 페이지
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── board/                      # 게시판 페이지
│   │   └── [slug]/
│   │       ├── [postID]/
│   │       │   ├── comment/
│   │       │   │   └── [commentID]/
│   │       │   │       └── edit/
│   │       │   │           └── page.tsx
│   │       │   ├── edit/
│   │       │   │   └── page.tsx
│   │       │   └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   │
│   ├── messages/                   # 메시지 페이지
│   │   └── page.tsx
│   │
│   ├── mypage/                     # 마이페이지
│   │   └── page.tsx
│   │
│   ├── performance/                # 공연 정보 페이지
│   │   └── [Id]/
│   │       └── page.tsx
│   │
│   ├── ranking/                    # 랭킹 페이지
│   │   └── page.tsx
│   │
│   ├── apple-icon.tsx              # Apple 아이콘
│   ├── favicon.ico                 # 파비콘
│   ├── fonts.ts                    # 폰트 설정
│   ├── globals.css                 # 전역 스타일
│   ├── icon.tsx                    # 아이콘 컴포넌트
│   ├── layout.tsx                  # 루트 레이아웃
│   └── page.tsx                    # 홈페이지
│
├── components/                     # React 컴포넌트
│   ├── achievements/               # 업적 관련
│   │   ├── achievement-badge.tsx
│   │   └── achievements-list.tsx
│   │
│   ├── admin/                      # 관리자 컴포넌트
│   │   ├── board-level-adjust.tsx
│   │   └── user-points-adjust.tsx
│   │
│   ├── auth/                       # 인증 컴포넌트
│   │   └── terms-agreement.tsx
│   │
│   ├── board/                      # 게시판 컴포넌트
│   │   ├── comment-section.tsx
│   │   ├── comment-vote-buttons.tsx
│   │   ├── comments-client.tsx
│   │   ├── level-badge.tsx
│   │   ├── new-post-form.tsx
│   │   ├── post-actions-bar.tsx
│   │   ├── post-content.tsx
│   │   ├── post-vote-buttons.tsx
│   │   ├── posts-list.tsx
│   │   ├── rich-text-editor.tsx
│   │   ├── search-filter.tsx
│   │   └── user-badge.tsx
│   │
│   ├── icons/                      # 아이콘 컴포넌트
│   │   └── NicknameIcon.tsx
│   │
│   ├── messages/                   # 메시지 컴포넌트
│   │   ├── blocked-users-manager.tsx
│   │   ├── messages-list.tsx
│   │   └── send-message-button.tsx
│   │
│   ├── mypage/                     # 마이페이지 컴포넌트
│   │   └── notifications-list.tsx
│   │
│   ├── ui/                         # UI 컴포넌트 (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── popover.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── virtual-list.tsx
│   │
│   ├── auth-provider.tsx           # 인증 프로바이더
│   ├── calendar-client.tsx         # 캘린더 클라이언트
│   ├── favorites-list.tsx          # 즐겨찾기 목록
│   ├── online-tracker.tsx          # 온라인 사용자 추적
│   ├── site-footer.tsx             # 사이트 푸터
│   ├── site-header.tsx             # 사이트 헤더
│   └── theme-provider.tsx          # 테마 프로바이더
│
├── data/                           # 데이터 파일
│   ├── 2026kbo.json               # 2026 KBO 데이터 (JSON)
│   ├── 2026kbo.txt                # 2026 KBO 데이터 (텍스트)
│   ├── merged-backup.json         # 병합 백업 데이터
│   ├── merged-live.json           # 병합 라이브 데이터
│   ├── yes-debug.json             # YES 디버그 데이터
│   └── yes-raw.html               # YES 원본 HTML
│
├── lib/                            # 유틸리티 및 라이브러리
│   ├── tiptap-extensions/         # TipTap 확장
│   │   ├── font-family.ts
│   │   ├── font-size.ts
│   │   └── text-align-persist.ts
│   │
│   ├── achievements.ts            # 업적 로직
│   ├── admin.ts                   # 관리자 기능
│   ├── aggregate.ts               # 집계 기능
│   ├── api-client.ts              # API 클라이언트
│   ├── api-response.ts            # API 응답 타입
│   ├── auth.ts                    # 인증 로직
│   ├── badges.ts                  # 배지 시스템
│   ├── baseCrawler.ts             # 크롤러 베이스
│   ├── env.ts                     # 환경 변수
│   ├── events.ts                  # 이벤트 처리
│   ├── html-sanitize.ts           # HTML 정화
│   ├── image-compress.ts          # 이미지 압축
│   ├── inter.ts                   # Inter 티켓팅 크롤러
│   ├── level.ts                   # 레벨 시스템
│   ├── link.ts                    # Link 티켓팅 크롤러
│   ├── melon.ts                   # 멜론 티켓팅 크롤러
│   ├── permissions.ts             # 권한 관리
│   ├── points.ts                  # 포인트 시스템
│   ├── prisma.ts                  # Prisma 클라이언트
│   ├── ranking.ts                 # 랭킹 시스템
│   ├── rate-limit.ts              # Rate limiting
│   ├── redis-cache.ts             # Redis 캐시
│   ├── redis.ts                   # Redis 클라이언트
│   ├── role.ts                    # 역할 관리
│   ├── types.ts                   # TypeScript 타입
│   ├── utils.ts                   # 유틸리티 함수
│   ├── validate.ts                # 검증 로직
│   ├── yes.ts                     # YES 티켓팅 크롤러
│   └── zod-shared.ts              # Zod 스키마 공유
│
├── prisma/                         # Prisma 데이터베이스
│   ├── migrations/                # 마이그레이션 파일
│   │   ├── 20251221075321_init/
│   │   │   └── migration.sql
│   │   ├── 20251222054045_add_vote_system/
│   │   │   └── migration.sql
│   │   ├── 20251222084135_add_vote_counters/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma              # Prisma 스키마
│   └── seed.ts                    # 시드 데이터
│
├── public/                         # 정적 파일
│   ├── fonts/                     # 폰트 파일
│   │   ├── KBO-Dia-Gothic_bold.woff
│   │   ├── KBO-Dia-Gothic_light.woff
│   │   └── KBO-Dia-Gothic_medium.woff
│   │
│   ├── icons/                     # 아이콘 파일
│   │   └── custom/
│   │       └── phoenix/           # 피닉스 아이콘
│   │           ├── phoenix_stage_1.svg
│   │           ├── phoenix_stage_2.svg
│   │           ├── phoenix_stage_3.svg
│   │           ├── phoenix_stage_4.svg
│   │           ├── phoenix_stage_5.svg
│   │           ├── phoenix_stage_6.svg
│   │           ├── phoenix_stage_7.svg
│   │           └── phoenix_stage_8.svg
│   │
│   ├── file.svg
│   ├── globe.svg
│   ├── inter.ico                   # Inter 티켓팅 파비콘
│   ├── kbo.ico                     # KBO 파비콘
│   ├── link.ico                    # Link 티켓팅 파비콘
│   ├── melon.ico                   # 멜론 티켓팅 파비콘
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── yes.ico                     # YES 티켓팅 파비콘
│
├── scripts/                        # 스크립트 파일
│   ├── backfill-vote-counters.js   # 투표 카운터 백필
│   ├── build-2026kbo-json.ts       # 2026 KBO JSON 빌드
│   ├── local-cron.js               # 로컬 크론 작업
│   ├── seed-phoenix-icons.ts       # 피닉스 아이콘 시드
│   └── set-admin.ts                # 관리자 설정
│
├── build-all-errors.txt           # 빌드 에러 로그 (전체)
├── build-errors.txt               # 빌드 에러 로그
├── DEPLOYMENT.md                   # 배포 문서
├── POSTGRES_MIGRATION.md           # PostgreSQL 마이그레이션 문서
├── RAILWAY_BUILD_FIX.md            # Railway 빌드 수정 문서
├── RAILWAY_POSTGRES_DEPLOYMENT.md  # Railway PostgreSQL 배포 문서
├── README.md                       # 프로젝트 README
├── README_ENV_SETUP.md             # 환경 설정 README
├── README_LOCAL_SETUP.md           # 로컬 설정 README
├── SYNC_LOCKFILE.md                # Lockfile 동기화 문서
└── PROJECT_TREE.md                 # 프로젝트 트리 (이 파일)
```

## 주요 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL (Prisma ORM)
- **캐싱**: Redis (ioredis)
- **인증**: NextAuth.js
- **UI**: React 19, Tailwind CSS, shadcn/ui, TipTap
- **배포**: Vercel, Railway

## 주요 기능

- 게시판 시스템 (게시글, 댓글, 투표)
- 사용자 인증 및 권한 관리
- 포인트 및 레벨 시스템
- 업적 및 배지 시스템
- 메시지 및 알림 시스템
- 티켓팅 정보 크롤링 (Inter, Link, Melon, YES)
- 관리자 기능
- 랭킹 시스템
