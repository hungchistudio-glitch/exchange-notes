"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import YumiRingOverlay from "@/components/home/yumi/YumiRingOverlay";
import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import CommandDeck from "@/components/cosmic/CommandDeck";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import HomeModePortal from "./HomeModePortal";
import { InterfaceModeProvider, useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { LexiconSearchProvider } from "@/contexts/LexiconSearchContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";

import FloatingCookieField from "./yumi/FloatingCookieField";
import { reviewWords } from "./yumi/reviewWords";
import { buildAvailableCookies } from "@/lib/pet/moodEngine";
import homeStyles from "./StandardHome.module.css";
import { onHomeSearchDismiss } from "@/lib/home/homeMoments";

function ReviewSearch({ onAnswerChange }: { onAnswerChange: (value: boolean) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => onHomeSearchDismiss(() => {
    setQuery("");
    onAnswerChange(false);
  }), [onAnswerChange]);
  return <>
    <input aria-label="Search preview" value={query} placeholder="Search or add a word"
      onChange={event => { setQuery(event.target.value); onAnswerChange(Boolean(event.target.value)); }}
      style={{ width: "100%", height: 60, padding: "0 24px", border: "1px solid #dfe5d5", borderRadius: 35, background: "white", fontSize: 16 }} />
    {query && <div data-home-search-results="" style={{ background: "white", borderRadius: 28, padding: 28, marginTop: 20, textAlign: "left" }}>
      <small>搜尋過場預覽</small><p style={{ fontSize: 28, marginTop: 12 }}>{query}</p>
      <p>輕點 Yumi 回到主頁；拖曳她仍可打開選單。</p>
    </div>}
  </>;
}

/** Local geometry and selection only; the review does not load an account. */
function StandardPreview() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("");
  const [fed, setFed] = useState<string[]>([]);
  const cookies = useMemo(() => buildAvailableCookies(reviewWords, fed), [fed]);
  return <>
        <div ref={stageRef} className={homeStyles.surface} style={{ position: "relative", minHeight: "100svh" }}>
          <YumiRingOverlay stageRef={stageRef}
            onChooseDestination={destination => setSelected(destination.label)}
            meta={{ greeting: "Good afternoon", place: "New York", date: "Thu, October 1", time: "4:05 PM" }}
            notices={{ unread: 0, friendRequests: 0, reviewDue: 12 }}
            field={({ onAnswerChange }) => <ReviewSearch onAnswerChange={onAnswerChange} />}
            lines={{ primary: fed.length ? `Yumi · ${fed.length} cookies` : "Yumi is curious.", secondary: "Preview" }}>
            <div data-yumi-figure style={{ position: "absolute", width: 144, height: 144, left: "calc(50% - 72px)", top: "calc(42svh - 72px)" }}>
              <ExchangeNotesMark />
            </div>
            <FloatingCookieField cookies={cookies} items={reviewWords} stageRef={stageRef} onFeed={cookie => setFed(previous => [...previous, cookie.id])} />
          </YumiRingOverlay>
          {selected && <output aria-live="polite" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 60, padding: "10px 18px", border: "1px solid #ffffffb8", borderRadius: 20, background: "#eef7f2eb", color: "#173e3b", whiteSpace: "nowrap", pointerEvents: "none" }}>
            已選擇：{selected} · 手勢預覽
          </output>}
        </div>
  </>;
}

function PreviewShell() {
  const { isCosmic } = useInterfaceMode();
  return <><HomeModePortal />{isCosmic ? <CommandDeck /> : <StandardPreview />}<ModeTransitionStage /></>;
}

function Frame() {
  return <InterfaceModeProvider initialMode="standard" preview>
    <LearningLanguageProvider initialLearningLanguage="es" initialNativeLanguage="zh-TW">
      <VocabularyProvider><LexiconSearchProvider><PreviewShell /></LexiconSearchProvider></VocabularyProvider>
    </LearningLanguageProvider>
  </InterfaceModeProvider>;
}

export default function StandardHomeReview({ frame }: { frame: boolean }) {
  const [size, setSize] = useState([390, 844]);
  if (frame) return <Frame />;
  return <main style={{ padding: 16, background: "#dededb", minHeight: "100vh" }}>
    <h1>Liquid glass · 環形選單預覽</h1>
    <p>沿著外圍圓環拖曳，放手選取。此預覽會顯示選取結果，方便反覆試用。</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBlock: 12 }}>
      {[[375, 667], [390, 844], [430, 932], [1280, 900]].map(([w, h]) =>
        <button type="button" key={w} onClick={() => setSize([w, h])} aria-pressed={size[0] === w}
          style={{ padding: 10, background: size[0] === w ? "#b3ddcf" : "white" }}>{w} × {h}</button>)}
    </div>
    <iframe title="Liquid glass preview" src="/standard-home-review?frame=1"
      style={{ display: "block", border: "1px solid #aaa", width: size[0], height: size[1], background: "#f4f1ea" }} />
  </main>;
}
