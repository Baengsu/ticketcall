"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

type PostItem = {
  id: number;
  title: string;
  author?: { id: string; name: string | null } | null;
  createdAt: Date;
  _count: { comments: number };
  isPinned?: boolean;
  isHidden?: boolean;
  viewCount?: number;
};

interface SearchFilterProps {
  posts: PostItem[];
  onFilteredPostsChange?: (filtered: PostItem[]) => void;
}

export default function SearchFilter({
  posts,
  onFilteredPostsChange,
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }

    const query = searchQuery.toLowerCase().trim();
    return posts.filter((post) => {
      const titleMatch = post.title.toLowerCase().includes(query);
      const authorMatch = post.author?.name
        ?.toLowerCase()
        .includes(query);
      return titleMatch || authorMatch;
    });
  }, [posts, searchQuery]);

  // 부모 컴포넌트에 필터링된 결과 전달
  useMemo(() => {
    if (onFilteredPostsChange) {
      onFilteredPostsChange(filteredPosts);
    }
  }, [filteredPosts, onFilteredPostsChange]);

  return (
    <div className="mb-4">
      <Input
        type="text"
        placeholder="제목 또는 작성자로 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />
      {searchQuery && (
        <p className="text-xs text-muted-foreground mt-2">
          {filteredPosts.length}개의 게시글을 찾았습니다.
        </p>
      )}
    </div>
  );
}
