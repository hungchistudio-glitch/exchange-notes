"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  Languages,
  Mic,
  Pause,
  PenLine,
  Play,
  Send,
  Sparkles,
} from "lucide-react";

import Link from "next/link";
import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import Yumi3DFigure from "@/components/yumi3d/Yumi3DFigure";
import useTranslation from "@/hooks/i18n/useTranslation";
import { track } from "@/lib/analytics/track";
import {
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";
import { loadTranslations } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";
import {
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguageMeta,
  learningLanguageList,
} from "@/lib/languages";
import { markChosenBeforeSignIn } from "@/lib/preferences/pendingChoices";

import styles from "./LandingPage.module.css";

type LandingCopy = TranslationDictionary["landing"];

// Every ordinary entry uses the branded Google button on the login page.
// The Supabase redirect button is reserved for that page's recovery flow.
function LandingLoginLink({
  label,
  analyticsEvent,
  analyticsSource,
  className,
}: {
  label: string;
  analyticsEvent: "landing_primary_cta_click" | "landing_final_cta_click";
  analyticsSource: "navigation" | "hero" | "final";
  className: string;
}) {
  return (
    <Link
      href="/login"
      onClick={() => track(analyticsEvent, { source: analyticsSource })}
      className={`flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-85 ${className}`}
    >
      {label}
    </Link>
  );
}

const LANGUAGE_OPTIONS = (
  Object.keys(INTERFACE_LANGUAGE_CODE) as InterfaceLanguage[]
)
  .filter((value) => getInterfaceLanguageMeta(value).availableAsInterface)
  .map((value) => ({ value, meta: getInterfaceLanguageMeta(value) }));

function LandingLanguagePicker({
  copy,
  language,
}: {
  copy: LandingCopy["languagePicker"];
  language: InterfaceLanguage;
}) {
  const requestRef = useRef(0);
  const [switchingTo, setSwitchingTo] = useState<InterfaceLanguage | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function selectLanguage(value: InterfaceLanguage) {
    if (value === language) return;

    const request = ++requestRef.current;
    setSwitchingTo(value);
    setLoadError(false);

    try {
      /*
       * The setting dispatches synchronously. Fetch the small dictionary
       * chunk first so the whole introduction changes in one paint rather
       * than briefly suspending after the reader chooses a language.
       */
      await loadTranslations(value);
      if (request !== requestRef.current) return;
      setInterfaceLanguage(value);
      /*
       * This page is only ever rendered signed out — a signed-in reader is
       * redirected to /home before it — so a pick here is unambiguously a
       * choice made before signing in, and the account sync must not quietly
       * replace it with whatever was stored last time.
       */
      markChosenBeforeSignIn("interfaceLanguage");
    } catch (error) {
      if (request === requestRef.current) setLoadError(true);
      console.error("Could not load the selected interface language.", error);
    } finally {
      if (request === requestRef.current) setSwitchingTo(null);
    }
  }

  return (
    <fieldset className={styles.languagePicker} aria-label={copy.ariaLabel}>
      <legend className="sr-only">{copy.ariaLabel}</legend>
      <div className={styles.languagePickerLabel}>
        <Languages size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>{copy.label}</span>
      </div>
      <div className={styles.languageOptions}>
        {LANGUAGE_OPTIONS.map(({ value, meta }) => {
          const selected = value === language;
          const switching = value === switchingTo;

          return (
            <button
              key={value}
              type="button"
              lang={meta.htmlLang}
              dir={meta.direction}
              aria-pressed={selected}
              aria-busy={switching || undefined}
              onPointerEnter={() => void loadTranslations(value).catch(() => undefined)}
              onFocus={() => void loadTranslations(value).catch(() => undefined)}
              onClick={() => void selectLanguage(value)}
              className={styles.languageOption}
            >
              <span aria-hidden="true">{meta.badge}</span>
              {meta.endonym}
            </button>
          );
        })}
      </div>
      {loadError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {copy.loadError}
        </p>
      ) : null}
    </fieldset>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className={styles.sectionCopy}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      <p className={styles.sectionDescription}>{description}</p>
    </div>
  );
}

type JourneyCopy = LandingCopy["hero"]["journey"];

/** The friend's reply, with the word they offered set apart in its language. */
function ReplyWithWord({ journey }: { journey: JourneyCopy }) {
  const { reply, replyWord, replyLang } = journey.exchange;
  const at = reply.indexOf(replyWord);
  if (at < 0) return <>{reply}</>;

  return (
    <>
      {reply.slice(0, at)}
      <mark lang={replyLang}>{replyWord}</mark>
      {reply.slice(at + replyWord.length)}
    </>
  );
}

/*
 * One phrase's journey, in three cards.
 *
 * The hero used to show a journal: a sentence about the light on the walk
 * home, a voice wave, a ginkgo leaf. None of it was about language, and none
 * of it was the thing this app exists for, which its About page says in one
 * line — exchange a phrase, discover another way of seeing (Chi, 2026-10-15:
 * make the hero mean something). So the hero shows exactly that, with one
 * real phrase: kept with the moment it was met, read with Yumi for meaning,
 * tone and culture, then sent to a friend from somewhere else who reads it
 * their own way. Every reader meets a phrase from a language that is not
 * their own; each language's copy chooses it (see journey in lib/i18n).
 */
function KeepCard({ journey }: { journey: JourneyCopy }) {
  const { keep } = journey;

  return (
    <article className={styles.journeyCard}>
      <header className={styles.journeyHeader}>
        <span className={styles.journeyBadge}>
          <Bookmark size={13} aria-hidden="true" /> {keep.label}
        </span>
        <span className={styles.journeySource}>
          <Camera size={13} aria-hidden="true" /> {keep.source}
        </span>
      </header>

      <div
        className={styles.journeyPhrase}
        data-long={journey.phrase.length > 8 ? "true" : undefined}
      >
        <strong lang={journey.phraseLang}>{journey.phrase}</strong>
        <span lang={journey.phraseLang}>{journey.reading}</span>
      </div>

      <figure className={styles.journeyWhy}>
        <figcaption>{keep.whyLabel}</figcaption>
        <p>{keep.why}</p>
      </figure>

      {/* How a phrase can be kept; this one was photographed. */}
      <div className={styles.journeyModes} aria-hidden="true">
        <span>
          <PenLine size={12} /> {keep.write}
        </span>
        <span>
          <Mic size={12} /> {keep.voice}
        </span>
        <span data-active="true">
          <Camera size={12} /> {keep.camera}
        </span>
      </div>
    </article>
  );
}

function UnderstandCard({ journey }: { journey: JourneyCopy }) {
  const { understand } = journey;

  return (
    <article className={styles.journeyCard}>
      <header className={styles.journeyHeader}>
        <span className={styles.journeyBadge}>
          <Sparkles size={13} aria-hidden="true" /> {understand.label}
        </span>
      </header>

      <p className={styles.journeyPhraseSmall}>
        <strong lang={journey.phraseLang}>{journey.phrase}</strong>
        <span lang={journey.phraseLang}>{journey.reading}</span>
      </p>

      <dl className={styles.journeyReading}>
        <div>
          <dt>{understand.meaningLabel}</dt>
          <dd>{understand.meaning}</dd>
        </div>
        <div>
          <dt>{understand.toneLabel}</dt>
          <dd>{understand.tone}</dd>
        </div>
        <div>
          <dt>{understand.cultureLabel}</dt>
          <dd>{understand.culture}</dd>
        </div>
      </dl>

      <p className={styles.journeyEquivalent}>
        <span>{understand.equivalentLabel}</span>
        <strong>{understand.equivalent}</strong>
      </p>
    </article>
  );
}

function ExchangeCard({ journey }: { journey: JourneyCopy }) {
  const { exchange } = journey;

  return (
    <article className={styles.journeyCard}>
      <header className={styles.journeyHeader}>
        <span className={styles.journeyBadge}>
          <Send size={13} aria-hidden="true" /> {exchange.label}
        </span>
      </header>

      <div className={styles.journeyRoute}>
        <span className={styles.journeyChip} lang={journey.phraseLang}>
          {journey.phrase}
        </span>
        <span className={styles.journeyArrow} aria-hidden="true" />
        <span className={styles.journeyFriend}>
          <span className={styles.journeyAvatar} aria-hidden="true">
            {exchange.friend.charAt(0)}
          </span>
          <span>
            {exchange.sentTo}
            <strong>{exchange.friend}</strong>
          </span>
        </span>
      </div>

      <blockquote className={styles.journeyReply}>
        <ReplyWithWord journey={journey} />
      </blockquote>

      <p className={styles.journeyInsight}>
        <Sparkles size={13} aria-hidden="true" /> {exchange.insight}
      </p>
    </article>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function HeroJourney({
  copy,
  step,
  onStepChange,
}: {
  copy: LandingCopy;
  step: number;
  onStepChange: (step: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(true);
  const swipeStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const tour = copy.hero.tour;
  const journey = copy.hero.journey;
  const steps = [
    {
      title: tour.keepTitle,
      description: tour.keepDescription,
    },
    {
      title: tour.understandTitle,
      description: tour.understandDescription,
    },
    {
      title: tour.exchangeTitle,
      description: tour.exchangeDescription,
    },
  ] as const;

  useEffect(() => {
    if (paused || reducedMotion) return;

    const timer = window.setInterval(() => {
      onStepChange((step + 1) % steps.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [onStepChange, paused, reducedMotion, step, steps.length]);

  function chooseStep(nextStep: number) {
    setPaused(true);
    onStepChange((nextStep + steps.length) % steps.length);
  }

  return (
    <section
      className={styles.heroTour}
      aria-label={tour.ariaLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          chooseStep(step - 1);
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          chooseStep(step + 1);
        }
      }}
    >
      <div
        className={styles.heroTourCopy}
        aria-atomic="true"
        aria-live={paused ? "polite" : "off"}
      >
        <p>
          {tour.stepLabel
            .replace("{current}", String(step + 1))
            .replace("{total}", String(steps.length))}
        </p>
        <h2>{steps[step].title}</h2>
        <span>{steps[step].description}</span>
      </div>

      <div className={styles.journeyStage}>
        <div
          className={styles.heroTourViewport}
          data-testid="hero-tour-viewport"
          onPointerDown={(event) => {
            if (
              (event.pointerType !== "touch" && event.pointerType !== "pen") ||
              !event.isPrimary
            ) {
              return;
            }

            swipeStart.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = swipeStart.current;
            swipeStart.current = null;

            if (!start || start.pointerId !== event.pointerId) return;

            event.currentTarget.releasePointerCapture?.(event.pointerId);

            const deltaX = event.clientX - start.x;
            const deltaY = event.clientY - start.y;
            if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) {
              return;
            }

            chooseStep(step + (deltaX < 0 ? 1 : -1));
          }}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          {steps.map((item, itemIndex) => {
            const relative = (itemIndex - step + steps.length) % steps.length;
            const positionClass =
              relative === 0
                ? styles.heroTourCardActive
                : relative === 1
                  ? styles.heroTourCardNext
                  : styles.heroTourCardPrevious;

            return (
              <div
                key={item.title}
                className={`${styles.heroTourCard} ${positionClass}`}
                aria-hidden={itemIndex !== step}
              >
                {itemIndex === 0 ? <KeepCard journey={journey} /> : null}
                {itemIndex === 1 ? <UnderstandCard journey={journey} /> : null}
                {itemIndex === 2 ? <ExchangeCard journey={journey} /> : null}
              </div>
            );
          })}
        </div>

        {/*
          The 3D Yumi stands over the cards for all three steps — the first
          thing a stranger meets — turnable, her eye pullable. A sibling of the
          viewport rather than inside it, so a drag on her turns her and never
          also swipes the step.
        */}
        <div className={styles.journeyYumi} aria-hidden="true">
          <Yumi3DFigure fill={0.42} />
        </div>
      </div>

      <div className={styles.heroTourControls}>
        <button
          type="button"
          aria-label={tour.previous}
          onClick={() => chooseStep(step - 1)}
        >
          <ArrowLeft size={17} aria-hidden="true" />
        </button>
        <div className={styles.heroTourDots}>
          {steps.map((item, itemIndex) => (
            <button
              key={item.title}
              type="button"
              aria-current={itemIndex === step ? "step" : undefined}
              aria-label={tour.goToStep
                .replace("{step}", String(itemIndex + 1))
                .replace("{title}", item.title)}
              onClick={() => chooseStep(itemIndex)}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={tour.next}
          onClick={() => chooseStep(step + 1)}
        >
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        {!reducedMotion ? (
          <button
            type="button"
            aria-label={paused ? tour.play : tour.pause}
            aria-pressed={!paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? (
              <Play size={16} aria-hidden="true" />
            ) : (
              <Pause size={16} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function NotePreview({
  copy,
  interfaceLang,
}: {
  copy: LandingCopy["notes"];
  interfaceLang: string;
}) {
  return (
    <div className={styles.notePreview} aria-label={copy.previewAriaLabel}>
      <div className={styles.noteDate}>{copy.date}</div>
      <p className={styles.noteText} lang="en">
        {copy.original}
      </p>
      <div className={styles.noteRule} />
      <p className={styles.noteTextTranslation} lang={interfaceLang}>
        {copy.translation}
      </p>
      <div className={styles.noteFooter}>
        <Bookmark size={15} aria-hidden="true" />
        <span>{copy.privateNote}</span>
      </div>
    </div>
  );
}

function ExchangePreview({ copy }: { copy: LandingCopy["exchange"] }) {
  return (
    <div className={styles.exchangePreview} aria-label={copy.previewAriaLabel}>
      <div className={styles.exchangeStop}>
        <span className={styles.exchangeDot} aria-hidden="true" />
        <p>{copy.sender}</p>
        <span>{copy.senderCaption}</span>
      </div>
      <div className={styles.exchangePath} aria-hidden="true">
        <span />
      </div>
      <article className={styles.travelCard}>
        <Send size={16} aria-hidden="true" />
        <p lang="zh-Hant">{copy.word}</p>
        <span>{copy.reading}</span>
        <small>{copy.meaning}</small>
      </article>
      <div
        className={`${styles.exchangePath} ${styles.exchangePathLast}`}
        aria-hidden="true"
      >
        <span />
      </div>
      <div className={styles.exchangeStop}>
        <span
          className={`${styles.exchangeDot} ${styles.exchangeDotWarm}`}
          aria-hidden="true"
        />
        <p>{copy.receiver}</p>
        <span>{copy.receiverCaption}</span>
      </div>
    </div>
  );
}

function YumiPreview({
  copy,
  interfaceLang,
}: {
  copy: LandingCopy["yumi"];
  interfaceLang: string;
}) {
  return (
    <div className={styles.yumiPreview} aria-label={copy.previewAriaLabel}>
      {/*
        The one place on this page a stranger can touch her before signing
        up: turn her, pull her eye, let it snap back. Only the 3D Yumi is
        ever drawn here; until her chunk lands the box holds the shared
        loader, so a stranger never meets the old flat Yumi first.
      */}
      <div className={styles.yumiStage}>
        <Yumi3DFigure />
      </div>
      <div className={styles.yumiMessage}>
        <p lang={interfaceLang}>{copy.message}</p>
        <span lang={interfaceLang === "en" ? "zh-Hant" : "en"}>
          {copy.translation}
        </span>
      </div>
      <div className={styles.reviewChip}>
        <span className={styles.reviewWord}>{copy.reviewWord}</span>
        <span>{copy.reviewHint}</span>
      </div>
    </div>
  );
}

type LensFeature = "menu" | "target";

/*
 * What the camera does, shown rather than listed.
 *
 * Two features that are both "point it at something", and are otherwise
 * nothing alike: one reads a whole printed document and keeps its shape, the
 * other reads exactly one rectangle out of a crowded frame. They share a
 * panel because a reader deciding whether this app is for them is asking one
 * question — can it read the thing in front of me — and gets both answers.
 *
 * The previews are drawn here rather than borrowed from the real screens.
 * MenuOverlayView and TargetOverlay want a scanned document and a live camera
 * between them, and neither belongs in the bundle of a page that has to paint
 * before anyone has signed in.
 */
function LensShowcase({ copy }: { copy: LandingCopy["lens"] }) {
  const [feature, setFeature] = useState<LensFeature>("menu");

  const features: ReadonlyArray<{
    key: LensFeature;
    label: string;
    blurb: string;
    cosmic?: boolean;
  }> = [
    { key: "menu", label: copy.menu.label, blurb: copy.menu.blurb, cosmic: true },
    { key: "target", label: copy.target.label, blurb: copy.target.blurb },
  ];

  const details =
    feature === "menu"
      ? [copy.menu.detailOne, copy.menu.detailTwo, copy.menu.detailThree]
      : [copy.target.detailOne, copy.target.detailTwo, copy.target.detailThree];

  return (
    <div className={styles.lensExperience}>
      <div
        className={styles.lensStage}
        aria-live="polite"
        aria-label={copy.previewAriaLabel}
      >
        {feature === "menu" ? (
          <MenuScanPreview copy={copy.menu} />
        ) : (
          <TargetFocusPreview copy={copy.target} />
        )}
      </div>

      <div className={styles.lensPanel}>
        <div className={styles.lensButtons} aria-label={copy.pickerAriaLabel}>
          {features.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFeature(item.key)}
              aria-pressed={feature === item.key}
              className={styles.lensButton}
            >
              <span className={styles.lensButtonLabel}>
                {item.label}
                {item.cosmic && (
                  <span className={styles.lensCosmicTag}>
                    {copy.cosmicBadge}
                  </span>
                )}
              </span>
              <small>{item.blurb}</small>
            </button>
          ))}
        </div>

        <ul className={styles.lensDetails}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/*
 * A menu, read and kept in place.
 *
 * Deliberately shows the printed line above the translation rather than
 * instead of it — that ordering is the feature. The price is repeated exactly
 * as a menu would print it, because "point at this on the real menu" only
 * works if the app did not tidy it into a number.
 */
function MenuScanPreview({ copy }: { copy: LandingCopy["lens"]["menu"] }) {
  return (
    <div className={styles.menuScan}>
      <div className={`${styles.menuRow} ${styles.menuRowLit}`}>
        <div>
          <p className={styles.menuSource} lang="zh-Hant">
            {copy.demoSource}
          </p>
          <p className={styles.menuName}>{copy.demoName}</p>
          <p className={styles.menuIpa}>{copy.demoIpa}</p>
        </div>
        <span className={styles.menuPrice}>{copy.demoPrice}</span>
      </div>

      <div className={styles.menuRow}>
        <div>
          <p className={styles.menuSource} lang="zh-Hant">
            {copy.demoSecondSource}
          </p>
          <p className={styles.menuName}>{copy.demoSecondName}</p>
        </div>
        <span className={styles.menuPrice}>{copy.demoSecondPrice}</span>
      </div>

      <p className={styles.menuConfidence}>{copy.demoConfidence}</p>
    </div>
  );
}

/*
 * A viewfinder with more than one thing in it.
 *
 * The candidates are thin and unfilled and the chosen one is marked at its
 * corners, which is how the real overlay draws them — selection is never
 * carried by colour alone there, and a marketing preview that invented a
 * different rule would be teaching the wrong thing.
 */
function TargetFocusPreview({
  copy,
}: {
  copy: LandingCopy["lens"]["target"];
}) {
  return (
    <div className={styles.viewfinder}>
      <span className={`${styles.targetBox} ${styles.targetBoxA}`}>
        <span className="sr-only">{copy.demoCandidate}</span>
      </span>
      <span className={`${styles.targetBox} ${styles.targetBoxB}`}>
        <span className="sr-only">{copy.demoCandidate}</span>
      </span>

      <span className={`${styles.targetBox} ${styles.targetChosen}`}>
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <span className={styles.targetTag}>{copy.demoSelected}</span>
      </span>

      <p className={styles.targetResult}>{copy.demoResult}</p>
    </div>
  );
}

export default function LandingPage() {
  const viewTrackedRef = useRef(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const { t, language } = useTranslation();
  const copy = t.landing;
  const interfaceLang = getInterfaceLanguageMeta(language).htmlLang;

  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    track("landing_view");
  }, []);

  return (
    <main id="top" className={styles.page}>
      <nav className={styles.nav} aria-label={copy.navigation.ariaLabel}>
        <a
          href="#top"
          className={styles.brand}
          aria-label={copy.navigation.homeAriaLabel}
        >
          <ExchangeNotesLogo className={styles.logo} decorative />
          <span>Exchange Notes</span>
        </a>
        <div className={styles.navCta}>
          <LandingLoginLink
            label={copy.navigation.start}
            analyticsEvent="landing_primary_cta_click"
            analyticsSource="navigation"
            className={styles.navButton}
          />
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="landing-hero-title">
        <div className={styles.heroCopy}>
          <LandingLanguagePicker
            copy={copy.languagePicker}
            language={language}
          />
          <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
          {/* The About page's own first line, which is what this app is for. */}
          <h1 id="landing-hero-title">{copy.hero.title}</h1>
          <p className={styles.heroIntro}>{copy.hero.intro}</p>
          <div className={styles.heroCta}>
            <LandingLoginLink
              label={copy.hero.cta}
              analyticsEvent="landing_primary_cta_click"
              analyticsSource="hero"
              className={styles.primaryButton}
            />
          </div>
          <p className={styles.heroPromise}>{copy.hero.promise}</p>
        </div>
        <HeroJourney
          copy={copy}
          step={tutorialStep}
          onStepChange={setTutorialStep}
        />
      </section>

      <section
        className={`${styles.storySection} ${styles.storySectionFirst}`}
        aria-labelledby="landing-notes-title"
      >
        <SectionHeading
          eyebrow={copy.notes.eyebrow}
          id="landing-notes-title"
          title={copy.notes.title}
          description={copy.notes.description}
        />
        <NotePreview copy={copy.notes} interfaceLang={interfaceLang} />
      </section>

      <section
        className={`${styles.storySection} ${styles.storyReverse}`}
        aria-labelledby="landing-exchange-title"
      >
        <SectionHeading
          eyebrow={copy.exchange.eyebrow}
          id="landing-exchange-title"
          title={copy.exchange.title}
          description={copy.exchange.description}
        />
        <ExchangePreview copy={copy.exchange} />
      </section>

      <section
        className={styles.storySection}
        aria-labelledby="landing-yumi-title"
      >
        <SectionHeading
          eyebrow={copy.yumi.eyebrow}
          id="landing-yumi-title"
          title={copy.yumi.title}
          description={copy.yumi.description}
        />
        <YumiPreview copy={copy.yumi} interfaceLang={interfaceLang} />
      </section>

      <section
        className={styles.moodSection}
        aria-labelledby="landing-lens-title"
      >
        <div className={styles.moodHeading}>
          <p className={styles.eyebrow}>{copy.lens.eyebrow}</p>
          <h2 id="landing-lens-title">{copy.lens.title}</h2>
          <p>{copy.lens.subtitle}</p>
        </div>
        <LensShowcase copy={copy.lens} />
      </section>

      <section
        className={styles.closing}
        aria-labelledby="landing-closing-title"
      >
        <ExchangeNotesLogo className={styles.closingLogo} decorative />
        <h2 id="landing-closing-title">
          {copy.closing.title}
          <span>{copy.closing.titleSecond}</span>
        </h2>
        <p>{copy.closing.description}</p>
        <div className={styles.finalCta}>
          <LandingLoginLink
            label={copy.closing.cta}
            analyticsEvent="landing_final_cta_click"
            analyticsSource="final"
            className={styles.primaryButton}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Exchange Notes</span>
        {/* Google's consent screen links this footer's two pages, and its
            brand review checks the home page links them back. */}
        <div className={styles.footerLinks}>
          <Link href="/privacy">{t.info.nav.privacy}</Link>
          <Link href="/terms">{t.info.nav.terms}</Link>
        </div>
        <span>{learningLanguageList()}</span>
      </footer>
    </main>
  );
}
