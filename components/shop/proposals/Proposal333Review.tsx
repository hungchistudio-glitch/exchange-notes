"use client";

import { ArrowDown, ArrowUpRight, Check, Globe, Moon, RotateCcw, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { InterfaceLanguage } from "@/lib/appPreferences";
import { getInterfaceLanguageMeta, INTERFACE_LANGUAGE_CODE } from "@/lib/languages";
import { QUIET_SCENE } from "@/lib/shop/atmosphere";
import type { YumiOutfit } from "@/lib/shop/catalog";
import { PROPOSALS_333, type Proposal333 } from "@/lib/shop/proposals/catalog333";
import { COPY_333 } from "@/lib/shop/proposals/copy333";
import { PREVIEW_333 } from "@/lib/yumi3d/proposal333";

import ShopStage, { type ShopStageLabels } from "../ShopStage";
import styles from "./Proposal333Review.module.css";

/* =========================================================
   Station 33 · 333 — the design review (app/yumi-333-review)

   The 113 proposed pieces (58 Orbital Atelier, 55 Deep Space Treasures)
   as a list, and the ten built so far worn on the real Yumi through the
   shop's own stage and rig (lib/yumi3d/proposal333.ts). Nothing here is in
   the catalogue: no cookies, no wardrobe, no prices saved — the stage
   accepts these ids only because this page passes PREVIEW_333 in.

   On a phone the stage stays pinned at the top while the reader picks
   pieces below it, so each try-on is seen without scrolling back up.
   ========================================================= */

const LANGUAGES = Object.keys(INTERFACE_LANGUAGE_CODE) as InterfaceLanguage[];
const PROTOTYPES = PROPOSALS_333.filter((item) => item.prototype);
const COUNTS = { all: 113, orbital: 58, space: 55 } as const;
const INITIAL: YumiOutfit = {
  material: "p333-orbital-sashiko",
  earrings: "p333-orbital-zellige",
  necklace: "p333-orbital-atlas",
};

export default function Proposal333Review({ stageLabels }: { stageLabels: Record<InterfaceLanguage, ShopStageLabels> }) {
  const [language, setLanguage] = useState<InterfaceLanguage>("traditional-chinese");
  const [cosmic, setCosmic] = useState(false);
  const [outfit, setOutfit] = useState<YumiOutfit>(INITIAL);
  const [solo, setSolo] = useState(false);
  const [collection, setCollection] = useState<"all" | "orbital" | "space">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(PROTOTYPES[0]);
  const workbench = useRef<HTMLElement>(null);
  const copy = COPY_333[language];

  /* The page's own day/night switch drives the shared Cosmic tokens; the
     reader's own setting comes back when they leave. */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-interface-mode");
    return () => {
      if (previous === null) root.removeAttribute("data-interface-mode");
      else root.setAttribute("data-interface-mode", previous);
    };
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-interface-mode", cosmic ? "yumi-cosmic" : "standard");
  }, [cosmic]);

  function wear(item: Proposal333) {
    setSelected(item);
    setOutfit((current) => {
      if (solo) return { [item.slot]: item.id };
      const next = { ...current };
      if (next[item.slot] === item.id) delete next[item.slot];
      else next[item.slot] = item.id;
      return next;
    });
  }

  function tryFromList(item: Proposal333) {
    wear(item);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    workbench.current?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
  }

  const needle = query.toLocaleLowerCase();
  const list = PROPOSALS_333.filter(
    (item) =>
      (collection === "all" || item.collection === collection) &&
      item.names[language].toLocaleLowerCase().includes(needle),
  );
  const worn = PROTOTYPES.filter((item) => outfit[item.slot] === item.id);

  return (
    <main className={styles.page} data-night={cosmic} lang={INTERFACE_LANGUAGE_CODE[language]}>
      <header className={styles.header}>
        <a className={styles.brand} href="/yumi-shop-review">
          <span className={styles.coin}>33</span>
          <span>
            STATION 33<small>ATELIER / DESIGN STUDIES</small>
          </span>
        </a>
        <div className={styles.controls}>
          <label className={styles.language}>
            <Globe size={16} aria-hidden="true" />
            <span className={styles.sr}>{copy.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as InterfaceLanguage)}>
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {getInterfaceLanguageMeta(code).endonym}
                </option>
              ))}
            </select>
          </label>
          <button type="button" aria-label={cosmic ? copy.day : copy.night} onClick={() => setCosmic((value) => !value)}>
            {cosmic ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>COLLECTION STUDY / 2026 — 333</p>
          <h1>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        <div className={styles.manifest}>
          <p>
            220 <span>＋</span> 113 <span>＝</span> <strong>333</strong>
          </p>
          <small>{copy.note}</small>
          <a href="#catalogue">
            {copy.list} <ArrowDown size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section ref={workbench} className={styles.workbench} aria-label={copy.prototypes}>
        <div className={styles.stageColumn}>
          <div className={styles.stageWrap}>
            <ShopStage
              outfit={outfit}
              isCosmic={cosmic}
              labels={stageLabels[language]}
              scene={QUIET_SCENE}
              celebrateKey={0}
              previewCollection={PREVIEW_333}
            />
          </div>
          <div className={styles.standTools}>
            <div role="group" aria-label={copy.prototypes}>
              <button type="button" aria-pressed={!solo} onClick={() => setSolo(false)}>
                {copy.mix}
              </button>
              <button
                type="button"
                aria-pressed={solo}
                onClick={() => {
                  setSolo(true);
                  setOutfit({ [selected.slot]: selected.id });
                }}
              >
                {copy.solo}
              </button>
            </div>
            <button type="button" title={copy.reset} aria-label={copy.reset} onClick={() => setOutfit({})}>
              <RotateCcw size={17} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.worn} aria-live="polite">
            <span>{worn.length ? copy.wearing : copy.empty}</span>
            {worn.map((item) => (
              <span key={item.id} className={styles.tag}>
                {item.names[language]}
              </span>
            ))}
          </div>
          {language === "traditional-chinese" ? (
            <aside className={styles.design}>
              <small>{copy.story}</small>
              <h3>{selected.names[language]}</h3>
              <p>{selected.brief}</p>
            </aside>
          ) : null}
        </div>

        <div className={styles.samples}>
          <div className={styles.sectionTitle}>
            <h2>{copy.prototypes}</h2>
            <span>10 / 113</span>
          </div>
          {(["orbital", "space"] as const).map((series) => (
            <section key={series} className={styles.series}>
              <h3>
                <span>{series === "orbital" ? "01" : "02"}</span>
                {copy[series]}
                <small>＋{COUNTS[series]}</small>
              </h3>
              <div className={styles.pieces}>
                {PROTOTYPES.filter((item) => item.collection === series).map((item) => {
                  const active = outfit[item.slot] === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => wear(item)}
                      className={styles.piece}
                    >
                      <span className={styles.swatch} style={{ background: item.tone }} aria-hidden="true">
                        {item.slot === "material" ? "C" : "✧"}
                      </span>
                      <span>
                        <strong>{item.names[language]}</strong>
                        <small>
                          {item.price} {copy.price}
                        </small>
                      </span>
                      {active ? <Check size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section id="catalogue" className={styles.catalogue}>
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>THE COMPLETE EDIT</p>
            <h2>{copy.list}</h2>
          </div>
          <a href="/station33-333-proposal.md" download>
            {copy.download}
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
        <div className={styles.filters}>
          <div role="group" aria-label={copy.list}>
            {(["all", "orbital", "space"] as const).map((key) => (
              <button key={key} type="button" aria-pressed={collection === key} onClick={() => setCollection(key)}>
                {copy[key]} <small>{COUNTS[key]}</small>
              </button>
            ))}
          </div>
          <input
            aria-label={copy.search}
            placeholder={copy.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className={styles.resultCount} aria-live="polite">
          {list.length} {copy.count}
        </p>
        <div className={styles.list}>
          {list.map((item, index) => (
            <article key={item.id}>
              <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.dot} style={{ background: item.tone }} aria-hidden="true" />
              <div>
                <small>{copy[item.collection]}</small>
                <h3>{item.names[language]}</h3>
                {language === "traditional-chinese" ? <p>{item.brief}</p> : null}
                <small>
                  {item.price} {copy.price}
                </small>
              </div>
              {item.prototype ? (
                <button type="button" className={styles.tryLink} onClick={() => tryFromList(item)}>
                  {copy.ready}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </button>
              ) : (
                <span className={styles.draft}>{copy.draft}</span>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
