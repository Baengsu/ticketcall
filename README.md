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

# 숙제
    - 공연 일정 관심 표시 / 찜하기
    - 공연 알림 레벨 태그
    - 게시판 검색 / 필터
    - 관리자에서 유저 목록 / 권한 변경
    - 관리자에서 크롤링 상태 모니터링(사이트별)
    - 신고 시스템
    - 알림 & 배지 느낌 기능
    - 오늘 / 이번주 예매 오픈 알림 블럭
    - 필터 가능한 캘린더
    - 예매 링크 바로가기 / 복수 링크 우선순위
    - 다크 모드 토글 (유저별 저장 가능)
    - 내 활동 간단 통계
```
ticketcall
├─ app
│  ├─ admin
│  │  ├─ etc-events
│  │  │  └─ page.tsx
│  │  ├─ page.tsx
│  │  ├─ reports
│  │  │  └─ page.tsx
│  │  └─ users
│  │     ├─ page.tsx
│  │     └─ [userId]
│  │        └─ page.tsx
│  ├─ api
│  │  ├─ admin
│  │  │  ├─ posts-summary
│  │  │  │  └─ route.ts
│  │  │  └─ rebuild-logs
│  │  │     └─ route.ts
│  │  ├─ auth
│  │  │  ├─ register
│  │  │  │  └─ route.ts
│  │  │  └─ [...nextauth]
│  │  │     └─ route.ts
│  │  ├─ board
│  │  │  ├─ comment
│  │  │  │  └─ route.ts
│  │  │  ├─ pin
│  │  │  │  └─ route.ts
│  │  │  ├─ post
│  │  │  │  └─ route.ts
│  │  │  └─ [slug]
│  │  │     └─ posts
│  │  │        └─ route.ts
│  │  ├─ debug
│  │  │  └─ yes
│  │  │     └─ route.ts
│  │  ├─ debug-events
│  │  │  └─ route.ts
│  │  ├─ notifications
│  │  │  └─ unread-count
│  │  │     └─ route.ts
│  │  ├─ online-count
│  │  │  └─ route.ts
│  │  ├─ ping
│  │  │  └─ route.ts
│  │  └─ rebuild
│  │     └─ route.ts
│  ├─ auth
│  │  ├─ login
│  │  │  └─ page.tsx
│  │  └─ register
│  │     └─ page.tsx
│  ├─ board
│  │  └─ [slug]
│  │     ├─ new
│  │     │  └─ page.tsx
│  │     ├─ page.tsx
│  │     └─ [postID]
│  │        ├─ comment
│  │        │  └─ [commentID]
│  │        │     └─ edit
│  │        │        └─ page.tsx
│  │        ├─ edit
│  │        │  └─ page.tsx
│  │        └─ page.tsx
│  ├─ favicon.ico
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ mypage
│  │  └─ page.tsx
│  ├─ page.tsx
│  └─ performance
│     └─ [Id]
│        └─ page.tsx
├─ components
│  ├─ auth-provider.tsx
│  ├─ board
│  │  ├─ comment-section.tsx
│  │  ├─ comments-client.tsx
│  │  └─ new-post-form.tsx
│  ├─ calendar-client.tsx
│  ├─ online-tracker.tsx
│  ├─ site-header.tsx
│  └─ ui
│     ├─ button.tsx
│     ├─ card.tsx
│     ├─ input.tsx
│     ├─ popover.tsx
│     ├─ table.tsx
│     └─ tabs.tsx
├─ components.json
├─ data
│  ├─ merged-backup.json
│  ├─ merged-live.json
│  ├─ yes-debug.json
│  └─ yes-raw.html
├─ eslint.config.mjs
├─ lib
│  ├─ aggregate.ts
│  ├─ auth.ts
│  ├─ baseCrawler.ts
│  ├─ events.ts
│  ├─ inter.ts
│  ├─ link.ts
│  ├─ melon.ts
│  ├─ prisma.ts
│  ├─ redis.ts
│  ├─ types.ts
│  ├─ utils.ts
│  └─ yes.ts
├─ middleware.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ prisma
│  ├─ migrations
│  │  ├─ 20251205135358_init_board_models
│  │  │  └─ migration.sql
│  │  ├─ 20251205135938_init_board_with_comments
│  │  │  └─ migration.sql
│  │  ├─ 20251209121255_add_rebuild_log
│  │  │  └─ migration.sql
│  │  ├─ 20251209122519_add_post_is_pinned
│  │  │  └─ migration.sql
│  │  ├─ 20251209123624_add_post_is_hidden
│  │  │  └─ migration.sql
│  │  ├─ 20251209125553_add_admin_reply_report_notification
│  │  │  └─ migration.sql
│  │  ├─ 20251210104752_add_etc_event
│  │  │  └─ migration.sql
│  │  ├─ 20251210112005_name_add_user_ban
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  └─ schema.prisma
├─ prisma.config.bak
├─ projecttree.md
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ inter.ico
│  ├─ link.ico
│  ├─ melon.ico
│  ├─ next.svg
│  ├─ vercel.svg
│  ├─ window.svg
│  └─ yes.ico
├─ README.md
└─ tsconfig.json

```