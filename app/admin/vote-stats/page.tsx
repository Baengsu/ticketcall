// 16.1 app/admin/vote-stats/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// 20.1
type SearchParams = Record<string, string | string[] | undefined>;

function rangeToFrom(range: string) {
  const now = new Date();
  if (range === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null; // all
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};

  const session = await getServerSession(authOptions);
  const userId = String((session as any)?.user?.id || "");

  if (!userId) redirect("/auth/login");

  const me = (await prisma.user.findUnique({ where: { id: userId } })) as any;
  const isAdmin = !!(me?.isAdmin || me?.role === "ADMIN");
  if (!isAdmin) redirect("/");

  const rangeRaw = sp?.range;
  const range = (Array.isArray(rangeRaw) ? rangeRaw[0] : rangeRaw) || "7d";
  const from = rangeToFrom(range);

  const postWhere = from ? { createdAt: { gte: from } } : {};
  const commentWhere = from ? { createdAt: { gte: from } } : {};

  const [totals, topPosts, topComments] = await Promise.all([
    Promise.all([
      prisma.post.count({ where: postWhere }),
      prisma.comment.count({ where: commentWhere }),
      prisma.postVote.count({ where: from ? { createdAt: { gte: from } } : {} }),
      prisma.commentVote.count({ where: from ? { createdAt: { gte: from } } : {} }),
    ]).then(([posts, comments, postVotes, commentVotes]) => ({
      posts,
      comments,
      postVotes,
      commentVotes,
      totalVotes: postVotes + commentVotes,
    })),

    prisma.post.findMany({
      where: postWhere,
      orderBy: [{ voteScore: "desc" }, { upCount: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        upCount: true,
        downCount: true,
        voteScore: true,
      },
    }),

    prisma.comment.findMany({
      where: commentWhere,
      orderBy: [{ voteScore: "desc" }, { upCount: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        createdAt: true,
        upCount: true,
        downCount: true,
        voteScore: true,
      },
    }),
  ]);

  const base = "/admin/vote-stats";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Vote Stats</h1>

        <div className="flex gap-2">
          <Link href={`${base}?range=24h`}><Button size="sm" variant={range === "24h" ? "default" : "outline"}>24h</Button></Link>
          <Link href={`${base}?range=7d`}><Button size="sm" variant={range === "7d" ? "default" : "outline"}>7d</Button></Link>
          <Link href={`${base}?range=30d`}><Button size="sm" variant={range === "30d" ? "default" : "outline"}>30d</Button></Link>
          <Link href={`${base}?range=all`}><Button size="sm" variant={range === "all" ? "default" : "outline"}>all</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Posts</div><div className="text-lg font-semibold">{totals.posts}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Comments</div><div className="text-lg font-semibold">{totals.comments}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Post Votes</div><div className="text-lg font-semibold">{totals.postVotes}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Comment Votes</div><div className="text-lg font-semibold">{totals.commentVotes}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Votes</div><div className="text-lg font-semibold">{totals.totalVotes}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="font-semibold">Top Posts</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Up</TableHead>
                <TableHead className="text-right">Down</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPosts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell className="max-w-[520px] truncate">{p.title}</TableCell>
                  <TableCell className="text-right">{p.voteScore}</TableCell>
                  <TableCell className="text-right">{p.upCount}</TableCell>
                  <TableCell className="text-right">{p.downCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="font-semibold">Top Comments</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Up</TableHead>
                <TableHead className="text-right">Down</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topComments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell className="text-right">{c.voteScore}</TableCell>
                  <TableCell className="text-right">{c.upCount}</TableCell>
                  <TableCell className="text-right">{c.downCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

