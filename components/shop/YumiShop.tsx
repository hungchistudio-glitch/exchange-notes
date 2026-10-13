"use client";

import { ArrowLeft, BookmarkPlus, Check, Globe, Layers, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import AppLanguageSheet, { prefetchAppLanguages } from "@/components/settings/AppLanguageSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import useOnline from "@/hooks/useOnline";
import { announceHomeMoment } from "@/lib/home/homeMoments";
import { fill, plural } from "@/lib/i18n/format";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import {
  SHOP_COUNTRIES,
  itemsFor,
  ownedOnly,
  sameOutfit,
  shopItem,
  toggleInOutfit,
  unownedIn,
  type ShopCategory,
  type ShopCountry,
  type ShopItem,
  type YumiOutfit,
} from "@/lib/shop/catalog";
import { getDeviceTimeZone } from "@/lib/push/deviceTimeZone";
import { QUIET_SCENE, dayPartAt, formatTemperature, sceneFor, seasonAt } from "@/lib/shop/atmosphere";
import {
  getQuarterHour,
  getSceneChoice,
  getServerQuarterHour,
  getServerSceneChoice,
  setSceneChoice,
  subscribeToQuarterHour,
  subscribeToSceneChoice,
  useShopWeather,
} from "@/lib/shop/useShopWeather";
import { ENERGY_LANDED_EVENT, ENERGY_PER_USD, SUPPLY_PACKS_USD } from "@/lib/shop/energy";
import { markScrolling } from "@/lib/shop/scrollQuiet";
import { ShopClosedError, type ShopWallet, type WardrobeState } from "@/lib/shop/wallet";
import { setWornOutfit } from "@/lib/shop/wornOutfit";

import EnergyCookie from "./EnergyCookie";
import EnergyReward from "./EnergyReward";
import ShopScenePicker, { ORBIT_CHOICES } from "./ShopScenePicker";
import ShopStage from "./ShopStage";
import ShopThumb from "./ShopThumb";
import styles from "./YumiShop.module.css";

/* =========================================================
   The Yumi shop

   Chi's Yumi Atelier (2026-10-12): a stand with Yumi on it, the catalogue
   under it, and a bar at the bottom for the piece in hand. Tapping a piece
   tries it on, free, and tapping it again takes it off; nothing is charged
   until the reader confirms a purchase, and nothing they have not bought
   reaches the Yumi on their home screen.

   Three outfits are in play, and keeping them apart is most of this file:

     worn    what she has on, saved; what the home screen shows
     draft   what she has on here, while the reader tries things
     owned   what the reader may save into `worn`

   "Reset outfit" puts the draft back to what is worn. Buying a piece puts
   it on and saves the outfit straight away, because that is why it was
   bought. "Put on" saves the owned part of the draft; anything not yet
   bought stays in the fitting room and is said to.
   ========================================================= */

const CATEGORIES: ShopCategory[] = ["featured", "eyes", "materials", "wear", "small", "owned"];

/** How small the stand gets as the catalogue scrolls; YumiShop.module.css agrees. */
const STAND_SMALLEST = 0.6;

const EMPTY_STATE: WardrobeState = { earned: 0, paid: 0, spent: 0, balance: 0, owned: [], outfit: {} };


type Availability = "loading" | "open" | "closed" | "failed";

export default function YumiShop({
  wallet,
  isCosmic,
  onToggleMode,
  preview = false,
}: {
  wallet: ShopWallet;
  isCosmic: boolean;
  onToggleMode: () => void;
  preview?: boolean;
}) {
  const { t, language, locale } = useTranslation();
  const copy = t.shop;
  const router = useRouter();
  const online = useOnline();

  const [state, setState] = useState<WardrobeState>(EMPTY_STATE);
  const [availability, setAvailability] = useState<Availability>("loading");
  const [draft, setDraft] = useState<YumiOutfit>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<ShopCategory>("featured");
  const [country, setCountry] = useState<ShopCountry | "all">("all");
  const [confirming, setConfirming] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [supplyOpen, setSupplyOpen] = useState(false);
  /** Bumped when cookies land, to make the balance answer. */
  const [landedKey, setLandedKey] = useState(0);
  /** The review screen's look at the cookie-landing card. */
  const [demoReward, setDemoReward] = useState(0);

  // ------------------------------------------------------------ the sky
  const { weather } = useShopWeather();
  const sceneChoice = useSyncExternalStore(subscribeToSceneChoice, getSceneChoice, getServerSceneChoice);
  /* The hour moves the sky (morning, day, dusk, night). Null on the server,
     which does not know the reader's clock: a quiet sky until it does. */
  const quarter = useSyncExternalStore(subscribeToQuarterHour, getQuarterHour, getServerQuarterHour);
  const scene = useMemo(
    () => (quarter === null ? QUIET_SCENE : sceneFor(sceneChoice, weather, new Date(quarter))),
    [sceneChoice, weather, quarter],
  );
  const sky = t.shop.sky;
  const skyNow = sceneChoice !== "auto"
    ? sky.choices[sceneChoice]
    : weather
      ? `${sky.conditions[weather.condition]}${weather.temperature === null ? "" : ` ${formatTemperature(weather.temperature, getDeviceTimeZone())}`}`
      : quarter === null
        ? sky.label
        : dayPartAt(new Date(quarter)) === "night"
          ? sky.night
          : sky.seasons[seasonAt(new Date(quarter))];
  const pageRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const signRef = useRef<HTMLHeadingElement>(null);

  /* The signboard swings in a breath of wind (Chi, 2026-10-13): once on
     arrival, when the page is scrolled, and now and then on its own. A
     transform on its own layer, a damped swing about the rods — nothing the
     stand or the scroll has to wait for. */
  useEffect(() => {
    const sign = signRef.current;
    if (!sign || typeof sign.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: Animation | null = null;
    let lastSwing = 0;
    const swing = (strength: number) => {
      const now = performance.now();
      if (now - lastSwing < 1400) return;
      lastSwing = now;
      current?.cancel();
      const a = 3.2 * strength;
      current = sign.animate(
        [-1.2, -1.2 + a, -1.2 - a * 0.6, -1.2 + a * 0.32, -1.2 - a * 0.14, -1.2]
          .map(deg => ({ transform: `rotate(${deg}deg)` })),
        { duration: 1900, easing: "ease-in-out" },
      );
    };
    const arrive = window.setTimeout(() => swing(1), 350);
    let breeze = 0;
    const nextBreeze = () => {
      breeze = window.setTimeout(() => { swing(0.45 + Math.random() * 0.35); nextBreeze(); }, 9000 + Math.random() * 12000);
    };
    nextBreeze();
    const scroller: HTMLElement | Window =
      document.querySelector<HTMLElement>("[data-app-scroll-viewport]") ?? window;
    const onScroll = () => swing(0.55);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(arrive);
      window.clearTimeout(breeze);
      scroller.removeEventListener("scroll", onScroll);
      current?.cancel();
    };
  }, []);

  // ----------------------------------------------------------- loading
  useEffect(() => {
    let cancelled = false;
    wallet.load()
      .then(loaded => {
        if (cancelled) return;
        setState(loaded);
        setDraft(loaded.outfit);
        setAvailability("open");
        if (!preview) setWornOutfit(loaded.outfit);
      })
      .catch(error => {
        if (cancelled) return;
        setAvailability(error instanceof ShopClosedError ? "closed" : "failed");
      });
    return () => { cancelled = true; };
  }, [wallet, preview, attempt]);

  /* Cookies earned elsewhere (a word saved in another tab, a review round
     passed) land while the shop is open: read the balance again and let it
     answer the card that announced them. */
  useEffect(() => {
    const landed = () => {
      setLandedKey(key => key + 1);
      if (preview) return;
      void wallet.load().then(setState).catch(() => {});
    };
    window.addEventListener(ENERGY_LANDED_EVENT, landed);
    return () => window.removeEventListener(ENERGY_LANDED_EVENT, landed);
  }, [wallet, preview]);

  useEffect(() => {
    if (!demoReward) return;
    const timer = window.setTimeout(() => setDemoReward(0), 2600);
    return () => window.clearTimeout(timer);
  }, [demoReward]);

  // --------------------------------------------------------- catalogue
  const shown = useMemo(
    () => itemsFor(category, country, new Set(state.owned)),
    [category, country, state.owned],
  );


  // ------------------------------------------------- the stand shrinking
  /* The stand shrinks as one picture (Chi, 2026-10-13: "原比例縮放"): a
     scale from its top, following the finger down to 60%, while its 3D
     canvas keeps its size. Where the browser can tie that to the scroll
     itself (CSS scroll-driven animations, YumiShop.module.css) this only
     says when the faded keys stop taking taps; elsewhere it also sets the
     scale, once a frame. Nothing here re-renders. */
  useEffect(() => {
    const top = topRef.current;
    if (!top) return;
    // The app's one scrolling viewport (AppViewport), or the window on a review screen.
    const scroller: HTMLElement | Window =
      document.querySelector<HTMLElement>("[data-app-scroll-viewport]") ?? window;
    const read = () => (scroller instanceof Window ? scroller.scrollY : scroller.scrollTop);
    const tied = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    let frame = 0;
    const apply = () => {
      frame = 0;
      const stage = top.querySelector<HTMLElement>(`.${styles.stage}`);
      // Side by side, the stand has its own column and never shrinks.
      const span = window.innerWidth >= 900 || !stage ? 0 : stage.offsetHeight * (1 - STAND_SMALLEST);
      const shrink = span > 0 ? Math.min(1, Math.max(0, read() / span)) : 0;
      if (!tied) top.style.setProperty("--shrink", shrink.toFixed(3));
      top.dataset.shrunk = shrink > 0.5 ? "true" : "false";
    };
    const onScroll = () => {
      markScrolling();
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // ------------------------------------------------------------ derived
  const owned = useMemo(() => new Set(state.owned), [state.owned]);
  const worn = state.outfit;
  const selected = shopItem(selectedId);
  const draftChanged = !sameOutfit(draft, worn);
  const unowned = unownedIn(draft, owned);
  const canTrade = availability === "open" && online && !busy;
  const name = (item: ShopItem) => item.names[language];
  const cookies = (count: number) => plural(count, locale, copy.cookiesOne, copy.cookiesOther, { count });

  // ------------------------------------------------------------ actions
  function tryOn(item: ShopItem) {
    setSelectedId(item.id);
    // The tour's try-on step waits for a piece going on, not coming off.
    if (draft[item.slot] !== item.id) announceHomeMoment("shop-tried");
    setDraft(current => toggleInOutfit(current, item));
  }

  function resetOutfit() {
    setDraft(worn);
  }

  async function save(outfit: YumiOutfit, after: WardrobeState, message: string) {
    const saved = await wallet.wear(ownedOnly(outfit, new Set(after.owned)));
    setState(saved);
    if (!preview) setWornOutfit(saved.outfit);
    setNotice(message);
  }

  async function putOn() {
    if (!canTrade) return;
    setBusy(true);
    try {
      await save(draft, state, copy.saved);
    } catch {
      setNotice(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  async function buy(item: ShopItem) {
    setConfirming(null);
    if (!canTrade) return;
    setBusy(true);
    try {
      const result = await wallet.buy(item.id);
      setState(result.state);
      if (result.status === "insufficient") {
        setNotice(plural(item.price - result.state.balance, locale, copy.shortOne, copy.shortOther, {
          count: item.price - result.state.balance,
        }));
        return;
      }
      const withItem = { ...draft, [item.slot]: item.id };
      setDraft(withItem);
      setCelebrateKey(key => key + 1);
      await save(withItem, result.state, fill(copy.bought, { item: name(item) }));
    } catch {
      setNotice(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  /* The display language is one setting with Settings' (Chi, 2026-10-12):
     this key opens the very sheet Settings opens. */
  function openLanguages() {
    prefetchAppLanguages(language);
    setLanguageOpen(true);
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/home");
  }

  // -------------------------------------------------------- bottom bar
  let primary: { label: string; onClick?: () => void; disabled: boolean; done?: boolean };
  let shortBy = 0;
  if (selected && !owned.has(selected.id) && draft[selected.slot] === selected.id) {
    shortBy = Math.max(0, selected.price - state.balance);
    primary = {
      label: copy.buy,
      onClick: () => setConfirming(selected),
      disabled: !canTrade || shortBy > 0,
    };
  } else if (draftChanged) {
    primary = { label: copy.putOn, onClick: putOn, disabled: !canTrade || sameOutfit(ownedOnly(draft, owned), worn) };
  } else {
    primary = { label: copy.wearingNow, disabled: true, done: true };
  }

  const status =
    availability === "closed" ? copy.closed
      : availability === "failed" ? copy.failed
        : !online ? copy.offline
          : null;

  return (
    <div ref={pageRef} className={styles.page}>
      <div ref={topRef} className={styles.top} data-shrunk="false">
        <header className={styles.header}>
          <button type="button" className={styles.iconKey} aria-label={copy.goBack} onClick={goBack}>
            <ArrowLeft size={20} strokeWidth={1.9} aria-hidden="true" />
          </button>
          {/* The shop's signboard (Chi, 2026-10-13: "商店招牌的設計感"), since
              the same day the nameplate of a station in orbit: a dark
              lacquered plate on two rods, the name lit in gilt, and where
              the station is under it. */}
          <div className={styles.signArea}>
            <h1 ref={signRef} className={styles.sign}>
              <span className={styles.signHooks} aria-hidden="true" />
              <span className={styles.signName}>{copy.title}</span>
              <span className={styles.signOrbit} aria-hidden="true">
                <span className={styles.signLights}><i /><i /><i /></span>
                {copy.station.orbit}
              </span>
            </h1>
          </div>
          <div className={styles.tools}>
            <button
              type="button"
              className={styles.language}
              aria-label={`${copy.language}: ${getInterfaceLanguageMeta(language).endonym}`}
              onClick={openLanguages}
            >
              <Globe size={16} strokeWidth={1.8} aria-hidden="true" />
              <span aria-hidden="true">{getInterfaceLanguageMeta(language).badge}</span>
            </button>
            <button
              type="button"
              className={styles.balance}
              aria-haspopup="dialog"
              aria-label={`${cookies(state.balance)}. ${copy.energy.open}`}
              onClick={() => setSupplyOpen(true)}
            >
              {landedKey > 0 && <span key={landedKey} className={styles.balancePulse} aria-hidden="true" />}
              <EnergyCookie className={styles.balanceCookie} />
              <span aria-hidden="true">{availability === "loading" ? "…" : state.balance.toLocaleString(locale)}</span>
            </button>
          </div>
        </header>

        <ShopStage
          outfit={draft}
          isCosmic={isCosmic}
          scene={scene}
          celebrateKey={celebrateKey}
          corner={
            <>
              <ShopScenePicker
                scene={scene}
                choice={sceneChoice}
                current={skyNow}
                choices={ORBIT_CHOICES}
                names={sky.choices}
                label={sky.label}
                onChoose={setSceneChoice}
              />
              <button
                type="button"
                className={styles.roundKey}
                aria-label={isCosmic ? copy.toStandard : copy.toCosmic}
                onClick={onToggleMode}
              >
                {isCosmic ? <Sun size={18} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={18} strokeWidth={1.8} aria-hidden="true" />}
              </button>
            </>
          }
          labels={{
            stage: copy.stage,
            hint: copy.hint,
            front: copy.front,
            side: copy.side,
            back: copy.backView,
            views: copy.views,
            resetView: copy.resetView,
            zoomIn: copy.zoomIn,
            zoomOut: copy.zoomOut,
            unavailable: copy.stageUnavailable,
          }}
        />
      </div>

      <section className={styles.catalog} aria-label={copy.title}>
        {preview && <p className={styles.previewBadge}>{copy.preview}</p>}

        <div className={styles.tabs}>
          {CATEGORIES.map(key => (
            <button key={key} type="button" className={styles.tab} aria-pressed={category === key} onClick={() => setCategory(key)}>
              {copy.categories[key]}
            </button>
          ))}
        </div>
        <div className={`${styles.tabs} ${styles.countries}`}>
          {(["all", ...SHOP_COUNTRIES] as const).map(key => (
            <button key={key} type="button" className={styles.chip} aria-pressed={country === key} onClick={() => setCountry(key)}>
              {copy.countries[key]}
            </button>
          ))}
        </div>

        {status && (
          <p className={styles.status} role="status">
            {status}
            {availability === "failed" && (
              <button
                type="button"
                className={styles.retry}
                onClick={() => { setAvailability("loading"); setAttempt(n => n + 1); }}
              >
                {copy.retry}
              </button>
            )}
          </p>
        )}

        {shown.length === 0 ? (
          <p className={styles.empty}>{category === "owned" ? copy.emptyOwned : copy.empty}</p>
        ) : (
          <ul className={styles.grid}>
            {shown.map(item => {
              const trying = draft[item.slot] === item.id;
              const wearing = worn[item.slot] === item.id;
              return (
                <li key={item.id}>
                  <button type="button" className={styles.card} aria-pressed={trying} onClick={() => tryOn(item)}>
                    <ShopThumb item={item} className={styles.thumb} />
                    {(trying || wearing) && (
                      <span className={styles.tag} data-wearing={wearing && trying ? "true" : "false"}>
                        {wearing && trying ? copy.wearing : copy.tryingOn}
                      </span>
                    )}
                    <span className={styles.cardName}>{name(item)}</span>
                    <span className={styles.price}>
                      {owned.has(item.id)
                        ? <><Check size={13} strokeWidth={2.2} aria-hidden="true" />{copy.ownedBadge}</>
                        : <><EnergyCookie className={styles.priceCookie} />{item.price}</>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className={styles.footnote}>{copy.howEarned}</p>
      </section>

      <footer className={styles.bar}>
        <div className={styles.barItem}>
          {selected ? (
            <>
              <ShopThumb item={selected} className={styles.barThumb} />
              <span className={styles.barText}>
                <span className={styles.barName}>{name(selected)}</span>
                <span className={styles.barPrice}>
                  {owned.has(selected.id)
                    ? copy.ownedBadge
                    : shortBy > 0
                      ? plural(shortBy, locale, copy.shortOne, copy.shortOther, { count: shortBy })
                      : <><EnergyCookie className={styles.priceCookie} />{selected.price} · {copy.freeTryOn}</>}
                </span>
              </span>
            </>
          ) : (
            <span className={styles.barPrompt}>{copy.selectPrompt}</span>
          )}
        </div>
        <div className={styles.barActions}>
          <button type="button" className={styles.secondary} disabled={!draftChanged || busy} onClick={resetOutfit}>
            {copy.resetOutfit}
          </button>
          {shortBy > 0 && !preview ? (
            // Words are saved from the home screen's search and camera.
            <Link href="/home" className={styles.primary}>{copy.saveWords}</Link>
          ) : (
            <button
              type="button"
              className={styles.primary}
              data-done={primary.done ? "true" : "false"}
              disabled={primary.disabled}
              onClick={primary.onClick}
              aria-busy={busy}
            >
              {primary.done && <Check size={16} strokeWidth={2.2} aria-hidden="true" />}
              {primary.label}
            </button>
          )}
        </div>
        {draftChanged && unowned.length > 0 && !(selected && unowned.length === 1 && unowned[0].id === selected.id) && (
          <p className={styles.barNote}>{copy.unownedNote}</p>
        )}
      </footer>

      {/* Energy supply: where cookies come from, and the packs paid supply
          will sell (Chi, 2026-10-13: US$1 = 33). Nothing can be bought here
          yet; the packs say so. */}
      <BottomSheet open={supplyOpen} onClose={() => setSupplyOpen(false)} title={copy.energy.wallet}>
        <div className={styles.supply}>
          <div className={styles.supplyBalance}>
            <EnergyCookie className={styles.supplyCookie} />
            <span className={styles.supplyCount}>{state.balance.toLocaleString(locale)}</span>
            <span className={styles.supplyCaption}>{copy.energy.balance}</span>
          </div>
          <dl className={styles.supplySplit}>
            <div>
              <dt>{copy.energy.fromLearning}</dt>
              <dd>{state.earned.toLocaleString(locale)}</dd>
            </div>
            <div>
              <dt>{copy.energy.fromSupply}</dt>
              <dd>{state.paid.toLocaleString(locale)}</dd>
            </div>
          </dl>

          <section className={styles.supplySection} aria-labelledby="supply-how">
            <h3 id="supply-how" className={styles.supplyHeading}>{copy.energy.howTitle}</h3>
            <ul className={styles.supplyRules}>
              <li>
                <BookmarkPlus size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{copy.energy.ruleSave}</span>
                <strong><EnergyCookie className={styles.priceCookie} />+1</strong>
              </li>
              <li>
                <Layers size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{copy.energy.ruleReview}</span>
                <strong><EnergyCookie className={styles.priceCookie} />+3</strong>
              </li>
            </ul>
          </section>

          <section className={styles.supplySection} aria-labelledby="supply-packs">
            <div className={styles.supplyHeadingRow}>
              <h3 id="supply-packs" className={styles.supplyHeading}>{copy.energy.packsTitle}</h3>
              <span className={styles.supplyRate}>{copy.energy.rate}</span>
            </div>
            <ul className={styles.supplyPacks}>
              {SUPPLY_PACKS_USD.map(usd => (
                <li key={usd} className={styles.supplyPack}>
                  <span className={styles.packCookies} aria-hidden="true">
                    {Array.from({ length: usd }, (_, i) => <EnergyCookie key={i} className={styles.packCookie} />)}
                  </span>
                  <span className={styles.packAmount}>{(usd * ENERGY_PER_USD).toLocaleString(locale)}</span>
                  <span className={styles.packPrice}>US${usd}</span>
                  <span className={styles.packSoon}>{copy.energy.soon}</span>
                </li>
              ))}
            </ul>
            <p className={styles.supplyStory}>{copy.energy.story}</p>
            <p className={styles.supplyNote}>{copy.energy.future}</p>
          </section>

          <p className={styles.supplyBoundary}>{copy.energy.separate}</p>

          {preview && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => { setSupplyOpen(false); setDemoReward(key => key + 1); setLandedKey(key => key + 1); }}
            >
              {copy.energy.previewReward}
            </button>
          )}
        </div>
      </BottomSheet>
      {demoReward > 0 && <EnergyReward key={demoReward} amount={ENERGY_PER_USD} label={copy.energy.rewardPaid} />}

      <AppLanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />

      <BottomSheet
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming ? fill(copy.confirmTitle, { item: name(confirming) }) : copy.buy}
      >
        {confirming && (
          <div className={styles.confirm}>
            <p className={styles.confirmFlow} aria-hidden="true">
              <EnergyCookie className={styles.balanceCookie} />
              <span>{state.balance}</span>
              <span className={styles.confirmArrow}>→</span>
              <span>{state.balance - confirming.price}</span>
            </p>
            <p className={styles.confirmBody}>
              {fill(copy.confirmBody, { price: confirming.price, after: state.balance - confirming.price })}
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondary} onClick={() => setConfirming(null)}>{copy.cancel}</button>
              <button type="button" className={styles.primary} disabled={!canTrade} onClick={() => void buy(confirming)}>
                {copy.confirmBuy}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <p className={styles.toast} role="status" aria-live="polite" data-shown={notice ? "true" : "false"}>
        {notice}
      </p>
    </div>
  );
}
