// 30.3 components/board/post-actions-bar.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api-client";

type VoteState = {
  up: number;
  down: number;
  score: number;
  myVote: number; // 1 | -1 | 0
};

export default function PostActionsBar(props: { postId: number }) {
  const { postId } = props;

  const [state, setState] = React.useState<VoteState>({
    up: 0,
    down: 0,
    score: 0,
    myVote: 0,
  });
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    apiJson<VoteState>(`/api/board/post/vote?postId=${postId}`)
      .then((s) => mounted && setState(s))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [postId]);

  const vote = async (value: 1 | -1) => {
    if (pending) return;
    setPending(true);

    try {
      const next = await apiJson<VoteState>("/api/board/post/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, value }),
      });
      setState(next);
    } catch (e: any) {
      alert(e?.message ?? "Vote failed");
    } finally {
      setPending(false);
    }
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Copy failed");
    }
  };

  const upActive = state.myVote === 1;
  const downActive = state.myVote === -1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:sticky md:top-16 md:bottom-auto md:left-auto md:right-auto">
      <div className="bg-background/85 backdrop-blur border-t md:border md:rounded-xl shadow-sm">
        <div className="mx-auto max-w-5xl px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => vote(1)}
              className={
                upActive
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-600 hover:text-white"
                  : "text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20"
              }
            >
              추천 <span className="ml-1 tabular-nums">{state.up}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => vote(-1)}
              className={
                downActive
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-600 hover:text-white"
                  : "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              }
            >
              비추천 <span className="ml-1 tabular-nums">{state.down}</span>
            </Button>

            <span className="text-xs text-muted-foreground ml-1">
              점수 <span className="tabular-nums">{state.score}</span>
            </span>
          </div>

          <Button type="button" variant="outline" onClick={onShare}>
            {copied ? "복사됨" : "공유"}
          </Button>
        </div>
      </div>
    </div>
  );
}

