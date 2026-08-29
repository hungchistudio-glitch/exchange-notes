"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Camera,
  Check,
  Heart,
  Image as ImageIcon,
  Languages,
  Leaf,
  Link2,
  Mic,
  PenLine,
  Send,
  Sparkles,
} from "lucide-react";

import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import YumiMark from "@/components/vocabulary/pet/YumiMark";
import useTranslation from "@/hooks/i18n/useTranslation";
import { track } from "@/lib/analytics/track";
import {
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";
import { loadTranslations } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";
import type { TranslationDictionary } from "@/lib/i18n/types";
import {
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguageMeta,
} from "@/lib/languages";
import type { YumiMood } from "@/lib/pet/types";

import styles from "./LandingPage.module.css";

type LandingCopy = TranslationDictionary["landing"];
type CaptureMode = "write" | "voice" | "camera";

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

  async function selectLanguage(value: InterfaceLanguage) {
    if (value === language) return;

    const request = ++requestRef.current;
    setSwitchingTo(value);

    try {
      /*
       * The setting dispatches synchronously. Fetch the small dictionary
       * chunk first so the whole introduction changes in one paint rather
       * than briefly suspending after the reader chooses a language.
       */
      await loadTranslations(value);
      if (request !== requestRef.current) return;
      setInterfaceLanguage(value);
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
              onPointerEnter={() => void loadTranslations(value)}
              onFocus={() => void loadTranslations(value)}
              onClick={() => void selectLanguage(value)}
              className={styles.languageOption}
            >
              <span aria-hidden="true">{meta.badge}</span>
              {meta.endonym}
            </button>
          );
        })}
      </div>
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

function MomentPreview({
  copy,
  mode,
  labels,
}: {
  copy: LandingCopy["hero"]["preview"];
  mode: CaptureMode;
  labels: Record<CaptureMode, string>;
}) {
  return (
    <div
      className={styles.momentPreview}
      aria-label={copy.ariaLabel}
      aria-live="polite"
    >
      <div className={styles.momentPreviewHeader}>
        <span>
          <Sparkles size={14} aria-hidden="true" /> Yumi
        </span>
        <span>{labels[mode]}</span>
      </div>

      <div className={styles.momentPreviewBody}>
        {mode === "write" ? (
          <article className={styles.writePreview}>
            <div className={styles.previewEyebrow}>
              <PenLine size={14} aria-hidden="true" /> {copy.writeEyebrow}
            </div>
            <p>{copy.writeSample}</p>
            <span className={styles.recognitionStatus}>
              <Check size={13} aria-hidden="true" /> {copy.writeStatus}
            </span>
          </article>
        ) : null}

        {mode === "voice" ? (
          <article className={styles.voicePreview}>
            <div className={styles.previewEyebrow}>
              <Mic size={14} aria-hidden="true" /> {copy.voiceEyebrow}
            </div>
            <div className={styles.voiceWave} aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <p>{copy.voiceSample}</p>
            <span className={styles.recognitionStatus}>
              <Sparkles size={13} aria-hidden="true" /> {copy.voiceStatus}
            </span>
          </article>
        ) : null}

        {mode === "camera" ? (
          <article className={styles.cameraPreview}>
            <div className={styles.previewEyebrow}>
              <Camera size={14} aria-hidden="true" /> {copy.cameraEyebrow}
            </div>
            <div className={styles.cameraScene} aria-hidden="true">
              <div className={styles.cameraGlow} />
              <div className={styles.cameraFocus}>
                <Leaf size={48} strokeWidth={1.4} />
              </div>
              <span className={styles.cameraCornerOne} />
              <span className={styles.cameraCornerTwo} />
              <span className={styles.cameraCornerThree} />
              <span className={styles.cameraCornerFour} />
            </div>
            <div className={styles.cameraResult}>
              <span className={styles.recognitionStatus}>
                <Sparkles size={13} aria-hidden="true" /> {copy.cameraStatus}
              </span>
              <strong>{copy.cameraSubject}</strong>
              <p>{copy.cameraDescription}</p>
            </div>
          </article>
        ) : null}
      </div>

      <div className={styles.memoryLinks}>
        <span className={styles.memoryLinksLabel}>
          <Link2 size={13} aria-hidden="true" /> {copy.memoryLinks}
        </span>
        <div>
          <span>
            <PenLine size={12} aria-hidden="true" /> {copy.thought}
          </span>
          <span>
            <Heart size={12} aria-hidden="true" /> {copy.feeling}
          </span>
          <span>
            <ImageIcon size={12} aria-hidden="true" /> {copy.image}
          </span>
        </div>
      </div>
    </div>
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
      <div className={styles.yumiStage}>
        <YumiMark
          mood="curious"
          isWaking={false}
          isEating={false}
          growthStage={0}
          crownEarned={false}
        />
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

function MoodShowcase({ copy }: { copy: LandingCopy["moods"] }) {
  const [selectedMood, setSelectedMood] = useState<YumiMood>("curious");
  const moods: ReadonlyArray<{ mood: YumiMood; label: string }> = [
    { mood: "curious", label: copy.curious },
    { mood: "happy", label: copy.happy },
    { mood: "excited", label: copy.excited },
    { mood: "proud", label: copy.proud },
    { mood: "missingYou", label: copy.missingYou },
  ];
  const selectedLabel =
    moods.find((item) => item.mood === selectedMood)?.label ?? copy.curious;

  return (
    <div className={styles.moodExperience}>
      <div
        className={styles.moodYumi}
        aria-live="polite"
        aria-label={copy.previewAriaLabel}
      >
        <YumiMark
          mood={selectedMood}
          isWaking={false}
          isEating={false}
          growthStage={0}
          crownEarned={false}
        />
        <span className="sr-only">
          {fill(copy.selectedAriaLabel, { mood: selectedLabel })}
        </span>
      </div>
      <div className={styles.moodButtons} aria-label={copy.pickerAriaLabel}>
        {moods.map((item) => (
          <button
            key={item.mood}
            type="button"
            onClick={() => setSelectedMood(item.mood)}
            aria-pressed={selectedMood === item.mood}
            className={styles.moodButton}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const viewTrackedRef = useRef(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("write");
  const { t, language } = useTranslation();
  const copy = t.landing;
  const interfaceLang = getInterfaceLanguageMeta(language).htmlLang;
  const captureLabels: Record<CaptureMode, string> = {
    write: copy.hero.write,
    voice: copy.hero.voice,
    camera: copy.hero.camera,
  };

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
          <GoogleLoginButton
            label={copy.navigation.start}
            submittingLabel={copy.navigation.opening}
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
          <h1 id="landing-hero-title">{copy.hero.title}</h1>
          <p className={styles.heroIntro}>{copy.hero.intro}</p>
          <p className={styles.heroDescription}>{copy.hero.description}</p>
          <p className={styles.heroMantra}>{copy.hero.mantra}</p>
          <div
            className={styles.captureModes}
            aria-label={copy.hero.modeAriaLabel}
          >
            {(
              [
                ["write", PenLine],
                ["voice", Mic],
                ["camera", Camera],
              ] as const
            ).map(([mode, Icon]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={captureMode === mode}
                onClick={() => setCaptureMode(mode)}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                {captureLabels[mode]}
              </button>
            ))}
          </div>
          <div className={styles.heroCta}>
            <GoogleLoginButton
              label={copy.hero.cta}
              submittingLabel={copy.hero.ctaLoading}
              analyticsEvent="landing_primary_cta_click"
              analyticsSource="hero"
              className={styles.primaryButton}
            />
          </div>
        </div>
        <MomentPreview
          copy={copy.hero.preview}
          mode={captureMode}
          labels={captureLabels}
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
        aria-labelledby="landing-moods-title"
      >
        <div className={styles.moodHeading}>
          <p className={styles.eyebrow}>{copy.moods.eyebrow}</p>
          <h2 id="landing-moods-title">{copy.moods.title}</h2>
          <p>{copy.moods.subtitle}</p>
        </div>
        <MoodShowcase copy={copy.moods} />
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
          <GoogleLoginButton
            label={copy.closing.cta}
            submittingLabel={copy.closing.ctaLoading}
            analyticsEvent="landing_final_cta_click"
            analyticsSource="final"
            className={styles.primaryButton}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Exchange Notes</span>
        <span>English · 繁體中文 · Español · Français · Italiano</span>
      </footer>
    </main>
  );
}
