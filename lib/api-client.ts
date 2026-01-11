// 29.1 lib/api-client.ts
export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error?: string; message?: string };

export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  let j: any = null;

  try {
    j = await res.json();
  } catch {
    j = null;
  }

  // supports both {ok:true,data:{...}} and legacy {...}
  const payload = j?.data ?? j;

  const message =
    j?.error ||
    j?.message ||
    (typeof payload?.error === "string" ? payload.error : null) ||
    "Request failed";

  if (!res.ok) {
    throw new Error(message);
  }

  if (j && j.ok === false) {
    throw new Error(message);
  }

  return payload as T;
}

