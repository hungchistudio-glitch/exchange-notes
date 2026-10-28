"use client";

import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { createWordReview, NotReviewerError, WORDS_PER_CELL, type ReviewStatus, type ReviewWord, type WordReview } from "@/lib/hangyumi/review";
import { LEVELS, type HangyumiLevel } from "@/lib/hangyumi/rules";
import { fill } from "@/lib/i18n/format";
import { INTERFACE_LANGUAGE_CODE, LANGUAGE_CODES, getLanguage, getLanguageName, type LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/client";

import styles from "./HangyumiReview.module.css";

/* =========================================================
   Approving Hangyumi's words (Chi: "我撰寫草稿 + 你在審閱頁核准")

   One language and level at a time, the 30 words drafted for it. Each can
   be approved, rejected, or put back to draft; the drafts in view can be
   approved together. A level shows how many approved words it still
   lacks: the game never fills a short level from another one.
   ========================================================= */

type Phase = "loading" | "ready" | "denied" | "error";

export default function HangyumiWordReview({ review: given }: { review?: WordReview }) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.hangyumi.reviewPage;
  const review = useMemo(() => given ?? createWordReview(createClient()), [given]);
  const own = INTERFACE_LANGUAGE_CODE[interfaceLanguage];

  const [phase, setPhase] = useState<Phase>("loading");
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [level, setLevel] = useState<HangyumiLevel>("B1");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    review.list().then(list => {
      if (cancelled) return;
      setWords(list);
      setPhase("ready");
    }, error => {
      if (!cancelled) setPhase(error instanceof NotReviewerError ? "denied" : "error");
    });
    return () => { cancelled = true; };
  }, [review]);

  const counts = useMemo(() => {
    const tally = { approved: 0, draft: 0, rejected: 0 };
    for (const word of words) tally[word.status] += 1;
    return tally;
  }, [words]);

  const approvedIn = (lang: LanguageCode, lvl: HangyumiLevel) =>
    words.filter(word => word.language === lang && word.level === lvl && word.status === "approved").length;

  const shown = words.filter(word => word.language === language && word.level === level);
  const drafts = shown.filter(word => word.status === "draft");

  async function mark(ids: string[], status: ReviewStatus) {
    if (!ids.length) return;
    setSaving(true);
    setFailed(false);
    const before = words;
    setWords(list => list.map(word => (ids.includes(word.id) ? { ...word, status } : word)));
    try {
      await review.set(ids, status);
    } catch {
      setWords(before);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link href="/hangyumi" className={styles.back} aria-label={copy.play} title={copy.play}>
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        <h1>{copy.title}</h1>
      </header>

      {phase === "loading" && <p className={styles.note} aria-busy="true">…</p>}
      {phase === "denied" && <p className={styles.note}>{copy.onlyReviewers}</p>}
      {phase === "error" && <p className={styles.note}>{copy.failed}</p>}

      {phase === "ready" && (
        <>
          <p className={styles.note}>{copy.intro}</p>
          <p className={styles.counts}>{fill(copy.counts, counts)}</p>

          <div className={styles.tabs} role="tablist" aria-label={t.hangyumi.title}>
            {LANGUAGE_CODES.map(code => (
              <button key={code} type="button" role="tab" aria-selected={code === language} className={styles.tab} onClick={() => setLanguage(code)}>
                {getLanguageName(code, interfaceLanguage)}
              </button>
            ))}
          </div>

          <div className={styles.cells}>
            {LEVELS.map(lvl => {
              const approved = approvedIn(language, lvl);
              const short = Math.max(0, WORDS_PER_CELL - approved);
              return (
                <button key={lvl} type="button" className={styles.cell} aria-pressed={lvl === level} onClick={() => setLevel(lvl)}>
                  <strong>{lvl}</strong>
                  <span>{approved}/{WORDS_PER_CELL}</span>
                  <small data-short={short > 0 ? "true" : "false"}>{short > 0 ? fill(copy.missingCell, { count: short }) : copy.complete}</small>
                </button>
              );
            })}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.approveAll} disabled={!drafts.length || saving} onClick={() => void mark(drafts.map(word => word.id), "approved")}>
              {fill(copy.approveAll, { count: drafts.length })}
            </button>
            <span className={styles.status} aria-live="polite">{saving ? copy.saving : failed ? copy.failed : ""}</span>
          </div>

          <ul className={styles.list}>
            {shown.map(word => (
              <li key={word.id} className={styles.word} data-status={word.status}>
                <div className={styles.wordHead}>
                  <span className={styles.answer} lang={getLanguage(word.language).htmlLang}>{word.answer}</span>
                  <span className={styles.pos}>{t.hangyumi.partsOfSpeech[word.partOfSpeech] ?? word.partOfSpeech}</span>
                  <span className={styles.chip}>{copy.statuses[word.status]}</span>
                </div>
                <p className={styles.clue} lang={getLanguage(own).htmlLang}>{word.clues[own] ?? word.clues.en}</p>
                <details className={styles.more}>
                  <summary>{copy.clues} · {copy.source}</summary>
                  <dl>
                    {LANGUAGE_CODES.filter(code => code !== own).map(code => (
                      <div key={code}>
                        <dt>{getLanguage(code).badge}</dt>
                        <dd lang={getLanguage(code).htmlLang}>{word.clues[code]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.source}>{word.source}</p>
                </details>
                <div className={styles.wordActions}>
                  {word.status !== "approved" && (
                    <button type="button" className={styles.approve} disabled={saving} onClick={() => void mark([word.id], "approved")}>
                      <Check size={16} aria-hidden="true" /> {copy.approve}
                    </button>
                  )}
                  {word.status !== "rejected" && (
                    <button type="button" className={styles.reject} disabled={saving} onClick={() => void mark([word.id], "rejected")}>
                      <X size={16} aria-hidden="true" /> {copy.reject}
                    </button>
                  )}
                  {word.status !== "draft" && (
                    <button type="button" className={styles.undo} disabled={saving} onClick={() => void mark([word.id], "draft")}>
                      <RotateCcw size={15} aria-hidden="true" /> {copy.undo}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
