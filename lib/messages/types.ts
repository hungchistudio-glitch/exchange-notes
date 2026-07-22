import type { DailyNewsCard } from "@/lib/types/dailyNews";

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  shared_article: DailyNewsCard | null;
};

export type AttachmentIdentificationResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: "people" | "objects" | "actions" | "other";
};
