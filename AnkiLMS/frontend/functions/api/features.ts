import { Env, jsonResponse } from "./_utils";

const FEATURE_KEYS = [
  "classes", "hangul", "lessons", "flashcards", "topics", "dictation", "shadowing", "listen",
  "games", "aiSpeaking", "topik", "missions", "leaderboard", "achievements", "community", "chat",
  "feedback", "rewards", "referrals", "pricing", "profile", "ankiImport",
] as const;

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const entries = await Promise.all(FEATURE_KEYS.map(async (key) => {
      const value = await env.SESSIONS.get(`haechivn:feature:${key}`);
      return [key, value === "false" ? false : true] as const;
    }));
    return jsonResponse({ features: Object.fromEntries(entries) });
  } catch {
    return jsonResponse({ error: "Không tải được cấu hình tính năng." }, 503);
  }
};
