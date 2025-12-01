// lib/baseCrawler.ts
import * as cheerio from "cheerio";
import { parseStringPromise } from "xml2js";

export async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TicketCallBot/0.1",
    },
  });

  if (!res.ok) {
    throw new Error(`HTML 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const $ = cheerio.load(text);
  return { html: text, $ };
}

export async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`JSON 요청 실패: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function fetchXml(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`XML 요청 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const xml = await parseStringPromise(text);
  return xml;
}
