"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type Props = {
  postId: number;
  initialUp: number;
  initialDown: number;
  initialMyVote?: number; // 1 | -1 | 0
};

function applyOptimistic(
  up: number,
  down: number,
  myVote: number,
  click: 1 | -1
) {
  let nextUp = up;
  let nextDown = down;
  let nextMyVote = myVote;

  if (myVote === 0) {
    nextMyVote = click;
    if (click === 1) nextUp += 1;
    else nextDown += 1;
  } else if (myVote === click) {
    nextMyVote = 0;
    if (click === 1) nextUp -= 1;
    else nextDown -= 1;
  } else {
    // switch
    nextMyVote = click;
    if (click === 1) {
      nextUp += 1;
      nextDown -= 1;
    } else {
      nextDown += 1;
      nextUp -= 1;
    }
  }

  return {
    up: Math.max(0, nextUp),
    down: Math.max(0, nextDown),
    myVote: nextMyVote,
  };
}

export default function PostVoteButtons({
  postId,
  initialUp,
  initialDown,
  initialMyVote,
}: Props) {
  const [up, setUp] = useState(initialUp ?? 0);
  const [down, setDown] = useState(initialDown ?? 0);
  const [myVote, setMyVote] = useState<number>(initialMyVote ?? 0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const vote = async (value: 1 | -1) => {
    if (loading) return;

    setMsg("");
    const prev = { up, down, myVote };
    const optimistic = applyOptimistic(up, down, myVote, value);

    setUp(optimistic.up);
    setDown(optimistic.down);
    setMyVote(optimistic.myVote);

    setLoading(true);
    try {
      const res = await fetch("/api/board/post/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, value }),
      });

      if (!res.ok) {
        // 26.1 error parsing
        let err = "Vote failed";
        try {
          const j = await res.json();
          err = j?.error || j?.message || err;
        } catch {}
        setUp(prev.up);
        setDown(prev.down);
        setMyVote(prev.myVote);
        setMsg(err);
        return;
      }

      // 26.1 components/board/post-vote-buttons.tsx (inside vote() after res.ok)
      const j = await res.json();
      const payload = j?.data ?? j; // supports {ok:true,data:{...}} and legacy {...}
      setUp(payload.up ?? optimistic.up);
      setDown(payload.down ?? optimistic.down);
      setMyVote(payload.myVote ?? optimistic.myVote);
    } finally {
      setLoading(false);
    }
  };

  const upActive = myVote === 1;
  const downActive = myVote === -1;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => vote(1)}
          className={`rounded-full px-3 gap-1 ${
            upActive
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
              : "border-blue-600 text-blue-600 hover:bg-blue-50"
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          추천 <span className="font-semibold">{up}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => vote(-1)}
          className={`rounded-full px-3 gap-1 ${
            downActive
              ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white"
              : "border-red-600 text-red-600 hover:bg-red-50"
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
          비추천 <span className="font-semibold">{down}</span>
        </Button>
      </div>

      {msg ? <p className="text-xs text-red-600">{msg}</p> : null}
    </div>
  );
}
