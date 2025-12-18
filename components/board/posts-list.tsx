"use client";

import { useState } from "react";
import SearchFilter from "./search-filter";

interface Post {
  id: number;
  title: string;
  author?: { id: string; name: string | null } | null;
  createdAt: Date;
  _count: { comments: number };
  isPinned?: boolean;
  isHidden?: boolean;
  viewCount?: number;
}

interface PostsListProps {
  posts: Post[];
  slug: string;
  currentUserId?: string;
  isAdmin: boolean;
  isNotice: boolean;
  isSuggest: boolean;
}

export default function PostsList({
  posts,
  slug,
  currentUserId,
  isAdmin,
  isNotice,
  isSuggest,
}: PostsListProps) {
  const [filteredPosts, setFilteredPosts] = useState(posts);

  // 건의사항 제목 마스킹용
  function maskTitle(title: string): string {
    if (!title) return "";
    const len = Math.min(title.length, 10);
    return "*".repeat(Math.max(3, len));
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg font-medium text-muted-foreground mb-2">
          아직 글이 없습니다
        </p>
        <p className="text-sm text-muted-foreground">
          첫 번째 글을 작성해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchFilter posts={posts} onFilteredPostsChange={setFilteredPosts} />

      <div className="space-y-2">
        {filteredPosts.map((post) => {
          const isAuthor = currentUserId === post.author?.id;
          const rawTitle = post.title;
          const commentCount = post._count.comments;
          const DONE_PREFIX = "[완료] ";
          let displayTitle = rawTitle;
          const isPinned = post.isPinned;
          const isHidden = post.isHidden;

          // 건의사항 제목 마스킹 로직
          if (isSuggest && !isAdmin && !isAuthor) {
            if (rawTitle.startsWith(DONE_PREFIX)) {
              displayTitle =
                DONE_PREFIX +
                maskTitle(rawTitle.slice(DONE_PREFIX.length));
            } else {
              displayTitle = maskTitle(rawTitle);
            }
          }

          // 공지 게시판에서 상단 고정된 글이면 [공지] 표시
          if (isNotice && isPinned) {
            displayTitle = `[공지] ${displayTitle}`;
          }

          // 관리자에게는 숨김 글에 [숨김] 표시
          if (isAdmin && isHidden) {
            displayTitle = `[숨김] ${displayTitle}`;
          }

          return (
            <a
              key={post.id}
              href={`/board/${slug}/${post.id}`}
              className="block p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {isPinned && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        공지
                      </span>
                    )}
                    {isHidden && isAdmin && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        숨김
                      </span>
                    )}
                    <h3 className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {displayTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {post.author?.name ?? "익명"}
                    </span>
                    <span>·</span>
                    <time>
                      {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      👁️ {post.viewCount ?? 0}
                    </span>
                    {commentCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-primary font-medium">
                          💬 {commentCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                  →
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
