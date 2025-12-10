// C:\ticketcall\app\api\notifications\unread-count\route.ts
// app/api/notifications/unread-count/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.id) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const count = await prisma.notification.count({
    where: {
      userId: user.id,
      read: false,
    },
  });

  return NextResponse.json({ count }, { status: 200 });
}
