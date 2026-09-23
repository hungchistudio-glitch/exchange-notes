"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Camera, Globe2, Mail, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import InfoLanguagePicker from "./InfoLanguagePicker";
import styles from "./InfoPage.module.css";

export type InfoPageKind = "about" | "community" | "privacy";
export const INFO_CONTACT_EMAIL = "hungchistudio@gmail.com";
const PAGES: InfoPageKind[] = ["about", "community", "privacy"];
const FEATURE_ICONS = [Camera, MessagesSquare, BookOpen];

export default function InfoPage({ page, publicView = false }: { page: InfoPageKind; publicView?: boolean }) {
  const { t, language } = useTranslation();
  const copy = t.info;
  const root = publicView ? "" : "/profile";
  const backHref = page === "about" ? (publicView ? "/" : "/profile/help") : `${root}/about`;
  const backLabel = page === "about" ? (publicView ? copy.nav.home : copy.nav.back) : copy.nav.about;
  const sections = page === "privacy" ? copy.privacy.sections : copy.community.rules;

  return (
    <main className={styles.page} lang={getInterfaceLanguageMeta(language).htmlLang}>
      <div className={styles.shell}>
        <header className={styles.toolbar}>
          <Link href={backHref} className={styles.back}>
            <ArrowLeft size={18} aria-hidden="true" /><span>{backLabel}</span>
          </Link>
          <InfoLanguagePicker publicView={publicView} />
        </header>

        <article className={styles.article}>
          <div className={styles.eyebrow}><span aria-hidden="true" />Exchange Notes</div>
          <h1>{copy.nav[page]}</h1>

          {page === "about" ? (
            <>
              <section className={styles.hero} aria-label={copy.about.tagline}>
                <div className={styles.yumi} aria-hidden="true">
                  <ExchangeNotesMark
                    upperLidClassName="yumi-blink-upper"
                    lowerLidClassName="yumi-blink-lower"
                  />
                </div>
                <h2 className={styles.tagline}>{copy.about.tagline}</h2>
                <p className={styles.greeting}>{copy.about.greeting}</p>
              </section>

              <section className={styles.prose}>
                <h2>{copy.about.storyTitle}</h2>
                {copy.about.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>

              <section className={styles.features}>
                <h2>{copy.about.featuresTitle}</h2>
                <div className={styles.featureGrid}>
                  {copy.about.features.map((feature, index) => {
                    const Icon = FEATURE_ICONS[index];
                    return <div key={feature.title} className={styles.feature}>
                      <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                      <h3>{feature.title}</h3><p>{feature.body}</p>
                    </div>;
                  })}
                </div>
              </section>

              <section className={`${styles.prose} ${styles.ai}`}>
                <Sparkles size={22} aria-hidden="true" />
                <h2>{copy.about.ai.title}</h2><p>{copy.about.ai.body}</p>
              </section>
              <p className={styles.closing}>{copy.about.closing}</p>
            </>
          ) : (
            <>
              <p className={styles.intro}>{copy[page].intro}</p>
              {page === "privacy" && <aside className={styles.notice} aria-label={copy.privacy.status}>
                <ShieldCheck size={22} aria-hidden="true" />
                <strong>{copy.privacy.status}</strong><p>{copy.privacy.notice}</p>
              </aside>}
              <div className={styles.sections}>
                {sections.map((section, index) => <section key={section.title} className={styles.prose}>
                  <span className={styles.sectionNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h2>{section.title}</h2><p>{section.body}</p>
                </section>)}
              </div>
              <p className={styles.contactIntro}>{copy[page].contact}</p>
            </>
          )}

          <footer className={styles.footer}>
            <p className={styles.planet}><Globe2 size={17} aria-hidden="true" />{copy.about.planet}</p>
            <a className={styles.email} href={`mailto:${INFO_CONTACT_EMAIL}`}>
              <Mail size={17} aria-hidden="true" /><span><span className={styles.contactLabel}>{copy.nav.contact}</span>{INFO_CONTACT_EMAIL}</span>
            </a>
            <nav className={styles.related} aria-label={copy.nav.related}>
              {PAGES.filter((kind) => kind !== page).map((kind) => <Link key={kind} href={`${root}/${kind}`}>
                <span>{copy.nav[kind]}</span><ArrowUpRight size={18} aria-hidden="true" />
              </Link>)}
            </nav>
          </footer>
        </article>
      </div>
    </main>
  );
}
