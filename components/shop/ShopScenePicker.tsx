"use client";

import {
  Check,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Flower2,
  Leaf,
  MoonStar,
  Snowflake,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Scene, SceneChoice } from "@/lib/shop/atmosphere";
import { SCENE_CHOICES } from "@/lib/shop/atmosphere";

import styles from "./YumiShop.module.css";

const SKY_ICONS = {
  storm: CloudLightning,
  snow: Snowflake,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  fog: CloudFog,
  leaves: Leaf,
  flowers: Flower2,
  cloudyNight: CloudMoon,
  night: MoonStar,
  overcast: Cloud,
  partly: CloudSun,
  sun: Sun,
} satisfies Record<string, LucideIcon>;

/** Which icon says what the sky is doing now. */
export function sceneIcon(scene: Scene): keyof typeof SKY_ICONS {
  if (scene.lightning) return "storm";
  if (scene.precipitation === "snow") return "snow";
  if (scene.precipitation === "rain") return "rain";
  if (scene.precipitation === "drizzle") return "drizzle";
  if (scene.fog) return "fog";
  if (scene.drifter === "leaves") return "leaves";
  if (scene.drifter === "butterflies" || scene.drifter === "petals") return "flowers";
  if (scene.sky === "night") return scene.clouds >= 2 ? "cloudyNight" : "night";
  if (scene.sky === "overcast") return "overcast";
  if (scene.clouds >= 2) return "partly";
  return "sun";
}

/** From a station in orbit, the scenes that are the weather on Earth below. */
export const ORBIT_CHOICES: readonly SceneChoice[] = ["auto", "clear", "rain", "snow", "stars"];

const CHOICE_ICONS: Record<SceneChoice, LucideIcon> = {
  auto: Sparkles,
  clear: Sun,
  rain: CloudRain,
  snow: Snowflake,
  leaves: Leaf,
  butterflies: Flower2,
  stars: MoonStar,
};

/**
 * The sky's key, beside the mode switch on the stand.
 *
 * Says what the sky is doing (the weather where the reader is, or the scene
 * they chose) and opens a short list: follow the weather, or keep one sky.
 */
export default function ShopScenePicker({
  scene,
  choice,
  current,
  choices = SCENE_CHOICES,
  names,
  label,
  onChoose,
}: {
  scene: Scene;
  choice: SceneChoice;
  /** What the key says: "Light rain 18°C", "Autumn", "Falling leaves". */
  current: string;
  /** Which scenes the list offers; all of them unless told. */
  choices?: readonly SceneChoice[];
  names: Record<SceneChoice, string>;
  label: string;
  onChoose: (choice: SceneChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const Icon = SKY_ICONS[sceneIcon(scene)];

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.scenePicker}>
      <button
        type="button"
        className={styles.sceneKey}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${label}: ${current}`}
        onClick={() => setOpen(value => !value)}
      >
        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
        <span>{current}</span>
      </button>
      {open && (
        <div className={styles.sceneMenu} role="group" aria-label={label}>
          {choices.map(option => {
            const OptionIcon = CHOICE_ICONS[option];
            return (
              <button
                key={option}
                type="button"
                className={styles.sceneOption}
                aria-pressed={choice === option}
                onClick={() => { onChoose(option); setOpen(false); }}
              >
                <OptionIcon size={16} strokeWidth={1.9} aria-hidden="true" />
                <span>{names[option]}</span>
                {choice === option && <Check size={15} strokeWidth={2.2} aria-hidden="true" className={styles.sceneCheck} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
