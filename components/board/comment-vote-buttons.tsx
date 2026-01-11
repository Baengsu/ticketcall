// 31.1 components/board/comment-vote-buttons.tsx
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

export default function CommentVoteButtons(props: {
  commentId: number;
  initialUp?: number;
  initialDown?: number;
  initialScore?: number;
  initialMyVote?: number;
  className?: string;
}) {
  const {
    commentId,
    initialUp = 0,
    initialDown = 0,
    initialScore = 0,
    initialMyVote = 0,
    className,
  } = props;

  const [state, setState] = React.useState<VoteState>({
    up: initialUp,
    down: initialDown,
    score: initialScore,
    myVote: initialMyVote,
  });
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    // if parent rerenders with different initial values (e.g., after navigation), resync
    setState({
      up: initialUp,
      down: initialDown,
      score: initialScore,
      myVote: initialMyVote,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentId]);

  const vote = async (value: 1 | -1) => {
    if (pending) return;
    setPending(true);

    // optimistic update (simple)
    const prev = state;
    let next = { ...state };

    if (state.myVote === value) {
      // toggle off
      next.myVote = 0;
      if (value === 1) {
        next.up = Math.max(0, next.up - 1);
        next.score = next.score - 1;
      } else {
        next.down = Math.max(0, next.down - 1);
        next.score = next.score + 1;
      }
    } else if (state.myVote === 0) {
      // new vote
      next.myVote = value;
      if (value === 1) {
        next.up = next.up + 1;
        next.score = next.score + 1;
      } else {
        next.down = next.down + 1;
        next.score = next.score - 1;
      }
    } else {
      // switch vote
      next.myVote = value;
      if (value === 1) {
        next.up = next.up + 1;
        next.down = Math.max(0, next.down - 1);
        next.score = next.score + 2;
      } else {
        next.down = next.down + 1;
        next.up = Math.max(0, next.up - 1);
        next.score = next.score - 2;
      }
    }

    setState(next);

    try {
      const server = await apiJson<VoteState>("/api/board/comment/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, value }),
      });
      setState(server);
    } catch (e: any) {
      setState(prev);
      alert(e?.message ?? "Vote failed");
    } finally {
      setPending(false);
    }
  };

  const upActive = state.myVote === 1;
  const downActive = state.myVote === -1;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        size="sm"
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
        size="sm"
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

      <span className="text-xs text-muted-foreground">
        점수 <span className="tabular-nums">{state.score}</span>
      </span>
    </div>
  );
}
