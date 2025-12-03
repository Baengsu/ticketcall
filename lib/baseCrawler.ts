// lib/baseCrawler.ts
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TicketCallBot/0.1";

// GET HTML
export async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
    },
  });

  if (!res.ok) {
    throw new Error(`HTML 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const $ = cheerio.load(text);
  return { html: text, $ };
}

// ✅ POST HTML (YES24 axList 에 사용)
export async function fetchHtmlPost(url: string, body: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`HTML POST 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const $ = cheerio.load(text);
  return { html: text, $ };
}

// JSON (ticketlink 등에서 사용)
export async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
    },
  });

  if (!res.ok) {
    throw new Error(`JSON 요청 실패: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

// XML (필요한 경우)
export async function fetchXml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
    },
  });

  if (!res.ok) {
    throw new Error(`XML 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const xml = await parseStringPromise(text);
  return xml;
}
