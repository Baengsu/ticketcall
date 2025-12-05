```
ticketcall
├─ app
│  ├─ api
│  │  ├─ auth
│  │  │  ├─ register
│  │  │  │  └─ route.ts
│  │  │  └─ [...nextauth]
│  │  │     └─ route.ts
│  │  ├─ board
│  │  │  ├─ post
│  │  │  │  └─ route.ts
│  │  │  └─ [slug]
│  │  │     ├─ posts
│  │  │     │  └─ route.ts
│  │  │     └─ write
│  │  │        └─ page.tsx
│  │  ├─ debug
│  │  │  └─ yes
│  │  │     └─ route.ts
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
│  │        └─ page.tsx
│  ├─ favicon.ico
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components
│  ├─ auth-provider.tsx
│  ├─ board
│  │  ├─ new-post-form.tsx
│  │  └─ write-form.tsx
│  ├─ calendar-client.tsx
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
│  ├─ inter.ts
│  ├─ link.ts
│  ├─ melon.ts
│  ├─ prisma.ts
│  ├─ types.ts
│  ├─ utils.ts
│  └─ yes.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ prisma
│  ├─ migrations
│  │  ├─ 20251205104656_add_board_models2
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  └─ schema.prisma
├─ prisma.config.bak
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
└─ tsconfig.json

```