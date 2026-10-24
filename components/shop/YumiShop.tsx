"use client";

import { ArrowLeft, BookmarkPlus, Check, ChevronRight, Globe, Layers, Moon, SlidersHorizontal, Sun, X } from "lucide-react";
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
  sameOutfit,
  shopItem,
  toggleInOutfit,
  unownedIn,
  type ShopCountry,
  type ShopItem,
  type YumiOutfit,
} from "@/lib/shop/catalog";
import { COLLECTION03_COPY, type ShopCollection } from "@/lib/shop/collection03Presentation";
import {
  SHOP_DEPARTMENTS,
  browseShop,
  collectionOf,
  departmentFor,
  isNewArrival,
  outfitToKeep,
  shelfPicks,
  type ShopDepartment,
} from "@/lib/shop/browsing";
import { QUIET_SCENE, sceneFor } from "@/lib/shop/atmosphere";
import {
  getQuarterHour,
  getSceneChoice,
  getServerQuarterHour,
  getServerSceneChoice,
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
import ShopStage from "./ShopStage";
import ShopCollectionSwitch, { SHOP_COLLECTION_TILES } from "./ShopCollectionSwitch";
import ShopIntroduction from "./ShopIntroduction";
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

   Owned pieces save when tapped, including an explicit removal. Unbought
   trials never replace saved clothing. Writes are single-flight, and the
   back key waits for an active save. A failed save leaves the trial visible
   with a retry action instead of pretending it was persisted.
   ========================================================= */

/** How small the stand gets as the catalogue scrolls; YumiShop.module.css agrees. */
const STAND_SMALLEST = 0.6;

/** How many pieces a shelf shows before "See all". */
const SHELF_SIZE = 12;
const NEW_SHELF_SIZE = 16;

const EMPTY_STATE: WardrobeState = { earned: 0, paid: 0, spent: 0, balance: 0, owned: [], outfit: {} };


type Availability = "loading" | "open" | "closed" | "failed";

export default function YumiShop({
  wallet,
  isCosmic,
  onToggleMode,
  preview = false,
  startCollection = "all",
}: {
  wallet: ShopWallet;
  isCosmic: boolean;
  onToggleMode: () => void;
  preview?: boolean;
  startCollection?: ShopCollection;
}) {
  const { t, language, locale } = useTranslation();
  const copy = t.shop;
  const collectionCopy = COLLECTION03_COPY[language];
  const [collection, setCollection] = useState<ShopCollection>(startCollection);
  const router = useRouter();
  const online = useOnline();

  const [state, setState] = useState<WardrobeState>(EMPTY_STATE);
  const [availability, setAvailability] = useState<Availability>("loading");
  const [draft, setDraft] = useState<YumiOutfit>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<ShopDepartment | "all">("all");
  const [country, setCountry] = useState<ShopCountry | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const leaving = useRef(false);
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pendingWrite = useRef<Promise<boolean> | null>(null);
  const wardrobeRevision = useRef(0);
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
  const pageRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const signRef = useRef<HTMLHeadingElement>(null);

  // The brass sign responds to collection choices only; no idle timer or
  // scroll listener. Its animation never changes the stage's dimensions.
  useEffect(() => {
    const sign = signRef.current;
    if (!sign?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = sign.animate(
      [{ transform: "rotate(-1.2deg)" }, { transform: "rotate(1deg)" }, { transform: "rotate(-1.2deg)" }],
      { duration: 650, easing: "cubic-bezier(.22,.7,.3,1)" },
    );
    return () => animation.cancel();
  }, [collection]);

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
      const revision = wardrobeRevision.current;
      void wallet.load().then(loaded => {
        if (revision === wardrobeRevision.current && !pendingWrite.current) setState(loaded);
      }).catch(() => {});
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
  const groups = useMemo(() => browseShop({
    department: category, country, collection, newOnly, ownedOnly: onlyOwned, owned: new Set(state.owned),
  }), [category, country, collection, newOnly, onlyOwned, state.owned]);
  const shownCount = groups.reduce((count, group) => count + group.items.length, 0);
  const filterCount = Number(country !== "all");
  /* The shop window (Chi, 2026-10-24: "先看櫥窗，再看全部"): with no
     department chosen, each department shows a shelf of its range, the new
     arrivals first, and "See all" opens the department's full grid. */
  const showcase = !onlyOwned && !newOnly && category === "all";
  const newShelf = useMemo(
    () => showcase ? shelfPicks(groups.flatMap(group => group.items).filter(isNewArrival), NEW_SHELF_SIZE, item => departmentFor(item.slot)) : [],
    [showcase, groups],
  );
  const newCount = useMemo(() => groups.reduce((count, group) => count + group.items.filter(isNewArrival).length, 0), [groups]);

  /* A choice made from the stuck navigation, far down the page, brings its
     results up to meet it rather than leaving the reader in the middle of
     something that is no longer there. */
  function browse(change: () => void) {
    change();
    requestAnimationFrame(() => {
      const results = resultsRef.current;
      const under = navRef.current?.getBoundingClientRect().bottom ?? 0;
      if (results && results.getBoundingClientRect().top < under) results.scrollIntoView({ block: "start" });
    });
  }
  /* The chosen department's tab, brought into the strip's view: "See all"
     can choose one that is scrolled off its end. Only the strip scrolls. */
  useEffect(() => {
    const strip = navRef.current?.querySelector<HTMLElement>(`.${styles.tabs}`);
    const tab = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !tab) return;
    const left = tab.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + tab.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: left - (strip.clientWidth - tab.offsetWidth) / 2 });
    }
  }, [category, newOnly]);

  function chooseDepartment(key: ShopDepartment | "all") {
    browse(() => { setCategory(key); setNewOnly(false); });
  }
  function chooseView(owned: boolean) {
    browse(() => { setOnlyOwned(owned); setCategory("all"); setCountry("all"); setCollection("all"); setNewOnly(false); });
  }

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
  function runWrite(work: () => Promise<void>) {
    if (pendingWrite.current) return pendingWrite.current;
    wardrobeRevision.current += 1;
    setBusy(true);
    const task = (async () => {
      try {
        await work();
        return true;
      } catch {
        setNotice(copy.failed);
        return false;
      } finally {
        wardrobeRevision.current += 1;
        pendingWrite.current = null;
        setBusy(false);
      }
    })();
    pendingWrite.current = task;
    return task;
  }

  function tryOn(item: ShopItem) {
    if (pendingWrite.current || availability !== "open") return;
    setSelectedId(item.id);
    if (draft[item.slot] !== item.id) announceHomeMoment("shop-tried");
    const next = toggleInOutfit(draft, item);
    if (!owned.has(item.id)) {
      // Taking a trial off reveals the saved item underneath, if there was one.
      if (draft[item.slot] === item.id && worn[item.slot]) next[item.slot] = worn[item.slot];
      setDraft(next);
      return;
    }
    setDraft(next);
    if (!online) { setNotice(copy.offline); return; }
    const keep = { ...worn };
    if (next[item.slot]) keep[item.slot] = next[item.slot];
    else delete keep[item.slot];
    void runWrite(() => save(keep, state, copy.saved));
  }

  function resetOutfit() {
    setDraft(worn);
  }

  async function save(outfit: YumiOutfit, after: WardrobeState, message: string) {
    const saved = await wallet.wear(outfitToKeep(outfit, after.outfit, new Set(after.owned)));
    setState(saved);
    if (!preview) setWornOutfit(saved.outfit);
    setNotice(message);
  }

  function putOn() {
    if (!canTrade) return;
    void runWrite(() => save(draft, state, copy.saved));
  }

  function buy(item: ShopItem) {
    setConfirming(null);
    if (!canTrade || pendingWrite.current) return;
    void runWrite(async () => {
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
    });
  }

  /* The display language is one setting with Settings' (Chi, 2026-10-12):
     this key opens the very sheet Settings opens. */
  function openLanguages() {
    prefetchAppLanguages(language);
    setLanguageOpen(true);
  }

  async function goBack() {
    if (leaving.current) return;
    leaving.current = true;
    if (pendingWrite.current && !(await pendingWrite.current)) { leaving.current = false; return; }
    if (window.history.length > 1) router.back();
    else router.push("/home");
  }

  // -------------------------------------------------------- bottom bar
  let primary: { label: string; action?: "buy" | "save"; disabled: boolean; done?: boolean };
  let shortBy = 0;
  if (selected && !owned.has(selected.id) && draft[selected.slot] === selected.id) {
    shortBy = Math.max(0, selected.price - state.balance);
    primary = {
      label: copy.buy,
      action: "buy",
      disabled: !canTrade || shortBy > 0,
    };
  } else if (!sameOutfit(outfitToKeep(draft, worn, owned), worn)) {
    primary = { label: copy.putOn, action: "save", disabled: !canTrade || sameOutfit(outfitToKeep(draft, worn, owned), worn) };
  } else {
    const isWearing = !!selected && worn[selected.slot] === selected.id;
    primary = { label: isWearing ? copy.wearingNow : copy.browse.notWorn, disabled: true, done: isWearing };
  }

  const keeperMessage = busy ? copy.boutique.saving
    : selected && draft[selected.slot] === selected.id
      ? fill(worn[selected.slot] === selected.id ? copy.boutique.wearing : copy.boutique.trying, { item: name(selected) })
      : selected ? copy.boutique.removed : copy.boutique.welcome;

  const status =
    availability === "closed" ? copy.closed
      : availability === "failed" ? copy.failed
        : !online ? copy.offline
          : null;

  /** One piece: its picture on its collection's light, the new mark, what
   * it costs or that it is owned. Tapping tries it on, or takes it off. */
  function card(item: ShopItem) {
    const trying = draft[item.slot] === item.id;
    const wearing = worn[item.slot] === item.id;
    return (
      <button
        type="button"
        className={styles.card}
        data-collection={collectionOf(item)}
        data-coach-target="shop-item"
        aria-pressed={trying}
        disabled={busy || availability !== "open"}
        onClick={() => tryOn(item)}
      >
        <ShopThumb item={item} className={styles.thumb} />
        {isNewArrival(item) && !trying && !wearing && <span className={styles.newBadge}>{collectionCopy.newItem}</span>}
        {(trying || wearing) && (
          <span className={styles.tag} data-wearing={wearing ? "true" : "false"}>
            {wearing ? copy.wearing : copy.tryingOn}
          </span>
        )}
        <span className={styles.cardName}>{name(item)}</span>
        <span className={styles.price}>
          {owned.has(item.id)
            ? <><Check size={13} strokeWidth={2.2} aria-hidden="true" />{copy.ownedBadge}</>
            : <><EnergyCookie className={styles.priceCookie} />{item.price}</>}
        </span>
      </button>
    );
  }

  return (
    <div ref={pageRef} className={styles.page}>
      <div ref={topRef} className={styles.top} data-shrunk="false">
        <header className={styles.header}>
          <button type="button" className={styles.iconKey} aria-label={copy.goBack} onClick={() => void goBack()}>
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
        <ShopIntroduction openLabel={copy.boutique.openStory} closeLabel={copy.boutique.closeStory}>
          <aside className={styles.keeperNote} aria-label={copy.boutique.curator}>
            <span className={styles.keeperLabel}>{copy.boutique.curator}</span>
            <p role="status">{keeperMessage}</p>
          </aside>
          {/* The station's story: the coin tells it, the tiles below choose. */}
          <div className={styles.story}>
            <h2>{copy.boutique.title}</h2>
            <p>{copy.boutique.intro}</p>
            <ul>
              {SHOP_COLLECTION_TILES.map(({ id }) => (
                <li key={id} data-collection={id}>
                  <strong>{collectionCopy.labels[id]}</strong>
                  <span>{copy.boutique.stories[id]}</span>
                </li>
              ))}
            </ul>
          </div>
        </ShopIntroduction>

        <div className={styles.catalogToolbar}>
          <div className={styles.wardrobeSwitch} role="group" aria-label={copy.title}>
            <button type="button" aria-pressed={!onlyOwned} onClick={() => chooseView(false)}>{copy.browse.shopView}</button>
            <button type="button" aria-pressed={onlyOwned} onClick={() => chooseView(true)}>{copy.browse.wardrobe}<span>{state.owned.length}</span></button>
          </div>
          <button
            type="button"
            className={styles.filterKey}
            aria-label={copy.browse.filters}
            title={copy.browse.filters}
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={18} strokeWidth={1.7} aria-hidden="true" />
            {filterCount > 0 && <span className={styles.filterCount}>{filterCount}</span>}
          </button>
        </div>

        {!onlyOwned && (
          <ShopCollectionSwitch
            collection={collection}
            onChoose={next => browse(() => setCollection(next))}
            copy={copy.boutique}
            labels={collectionCopy.labels}
            locale={locale}
          />
        )}

        {/* Stuck under the shrunk stand, so a department is one tap away
            from anywhere in the catalogue. */}
        <nav ref={navRef} className={styles.nav} aria-label={copy.browse.all}>
          <div className={styles.tabs} role="group" aria-label={copy.browse.all}>
            {(["all", ...SHOP_DEPARTMENTS] as const).map(key => (
              <button key={key} type="button" className={styles.tab} aria-pressed={!newOnly && category === key} onClick={() => chooseDepartment(key)}>
                {key === "all" ? copy.browse.all : copy.browse.departments[key]}
              </button>
            ))}
          </div>
        </nav>

        <div ref={resultsRef} className={styles.results} data-new-only={newOnly}>
          <div className={styles.summary}>
            <h2 className={styles.catalogSummary}>
              {newOnly ? copy.browse.newArrivals
                : category === "all" ? (onlyOwned ? copy.browse.wardrobe : copy.browse.all)
                  : copy.browse.departments[category]}
              {" "}<span>{shownCount}</span>
            </h2>
            {newOnly && (
              <button
                type="button"
                className={styles.clearNew}
                aria-label={`${copy.browse.clearNew}: ${copy.browse.newArrivals}`}
                onClick={() => browse(() => setNewOnly(false))}
              >
                {copy.browse.newArrivals} · {shownCount.toLocaleString(locale)}
                <X size={14} strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
            <p className={styles.wearHint} role="status">{busy ? copy.browse.saving : copy.browse.autoSave}</p>
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

          {shownCount === 0 ? (
            <p className={styles.empty}>{onlyOwned ? copy.emptyOwned : copy.empty}</p>
          ) : showcase ? (
            <>
              {newShelf.length > 0 && (
                <section aria-labelledby="shop-shelf-new" className={styles.shelf} data-new="true">
                  <header className={styles.shelfHeading}>
                    <h3 id="shop-shelf-new">
                      {copy.browse.newArrivals} <span>{newCount}</span>
                      <small>{copy.browse.newArrivalsNote}</small>
                    </h3>
                    <button type="button" className={styles.seeAll} onClick={() => browse(() => setNewOnly(true))}>
                      {fill(copy.browse.seeAll, { count: newCount.toLocaleString(locale) })}
                      <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </header>
                  <ul className={styles.shelfRow}>{newShelf.map(item => <li key={item.id}>{card(item)}</li>)}</ul>
                </section>
              )}
              {groups.map(group => (
                <section key={group.key} aria-labelledby={`shop-department-${group.key}`} className={styles.shelf}>
                  <header className={styles.shelfHeading}>
                    <h3 id={`shop-department-${group.key}`}>{copy.browse.departments[group.key]} <span>{group.items.length}</span></h3>
                    {group.items.length > SHELF_SIZE && (
                      <button type="button" className={styles.seeAll} onClick={() => chooseDepartment(group.key)}>
                        {fill(copy.browse.seeAll, { count: group.items.length.toLocaleString(locale) })}
                        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </header>
                  <ul className={styles.shelfRow}>
                    {shelfPicks(group.items, SHELF_SIZE).map(item => <li key={item.id}>{card(item)}</li>)}
                  </ul>
                </section>
              ))}
            </>
          ) : (
            groups.map(group => (
              <section key={group.key} aria-labelledby={`shop-department-${group.key}`} className={styles.department}>
                <h3 id={`shop-department-${group.key}`} className={styles.departmentHeading}>
                  {copy.browse.departments[group.key]} <span>{group.items.length}</span>
                </h3>
                <ul className={styles.grid}>{group.items.map(item => <li key={item.id}>{card(item)}</li>)}</ul>
              </section>
            ))
          )}
        </div>

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
        {(selected || draftChanged) && <div className={styles.barActions}>
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
              onClick={() => { if (primary.action === "buy" && selected) setConfirming(selected); else if (primary.action === "save") putOn(); }}
              aria-busy={busy}
            >
              {primary.done && <Check size={16} strokeWidth={2.2} aria-hidden="true" />}
              {busy ? copy.browse.saving : primary.label}
            </button>
          )}
        </div>}
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

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={copy.browse.filters}>
            <div className={`${styles.supply} ${styles.filterPanel}`}>
              <label>{copy.browse.country}
                <select value={country} onChange={event => setCountry(event.target.value as ShopCountry | "all")}>
                  {(["all", ...SHOP_COUNTRIES] as const).map(key => <option key={key} value={key}>{copy.countries[key]}</option>)}
                </select>
              </label>
              <button type="button" className={styles.secondary} disabled={!filterCount} onClick={() => setCountry("all")}>{copy.browse.clear}</button>
            </div>
      </BottomSheet>

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
