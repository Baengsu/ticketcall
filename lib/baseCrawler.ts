// lib/baseCrawler.ts
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TicketCallBot/0.1",
};

// GET + HTML
export async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
  });

  if (!res.ok) {
    throw new Error(`HTML 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const $ = cheerio.load(text);
  return { html: text, $ };
}

// ✅ 새로 추가: POST + HTML (form-data 전송용)
export async function fetchHtmlPost(
  url: string,
  body: string,
  extraHeaders?: Record<string, string>,
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      ...extraHeaders,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`HTML(POST) 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const $ = cheerio.load(text);
  return { html: text, $ };
}

// JSON
export async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`JSON 요청 실패: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

// XML
export async function fetchXml(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`XML 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const xml = await parseStringPromise(text);
  return xml;
}
