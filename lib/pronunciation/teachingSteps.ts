import type { PhoneticFeatures } from "./yumiRig";
import type { LocalizedText } from "./localizedText";

// Turns a sound's existing `guidance` array (already bilingual, already
// authored per sound) into the four-step "Mouth / Tongue / Airflow / Voice"
// teaching sequence the Yumi Teaching Stage walks through, instead of
// authoring an entirely separate ~600-sentence script from scratch.
//
// Scope note: not every sound's guidance array actually has a point for
// all four groups — vowels rarely spell out "vocal cords vibrate" since
// it's always true, and lip-only consonants (p/b/m) rarely mention the
// tongue. Rather than leaving a step blank (which would make the 4-step
// walkthrough inconsistent from card to card), any missing group is filled
// with a short, deterministic sentence derived from the sound's existing
// `phonetics` data (manner/place/voiced/etc.) — not hand-authored per
// sound, but a small fixed set of templates. This keeps every sound
// walkable through all four steps without a multi-day content-authoring
// pass; real per-sound sentences (where we have them) always take priority
// over a generated default.

export type TeachingStepKey = "mouth" | "tongue" | "airflow" | "voice";

export type TeachingStep = {
  key: TeachingStepKey;
  text: LocalizedText;
  /** True when this step's text came from a real authored guidance point
   * rather than a generated phonetics-based default. */
  authored: boolean;
};

type GuidanceLike = { label: LocalizedText; text: LocalizedText };

// The 9 Chinese labels every guidance point in englishSounds.ts /
// zhuyinSounds.ts is authored under — used as the bucketing key since it's
// stable regardless of interface language.
const LABEL_TO_STEP: Record<string, TeachingStepKey> = {
  嘴唇: "mouth",
  嘴型: "mouth",
  舌位: "tongue",
  滑動: "tongue",
  氣流: "airflow",
  發音方式: "airflow",
  聲帶: "voice",
  // "長度" (length) and "重點提示" (note) don't map to a rig dimension —
  // fold them into whichever adjacent step is most relevant so the detail
  // isn't lost, biased toward mouth/tongue since that's usually what they
  // qualify (e.g. "音拉長" describes how the mouth shape is held).
  長度: "mouth",
  重點提示: "tongue",
};

function joinLocalized(a: LocalizedText, b: LocalizedText): LocalizedText {
  return {
    english: `${a.english} ${b.english}`,
    "traditional-chinese": `${a["traditional-chinese"]}，${b["traditional-chinese"]}`,
  };
}

function defaultMouthStep(features: PhoneticFeatures): LocalizedText {
  if (features.lipRounding === "strongly_rounded" || features.lipRounding === "rounded") {
    return {
      english: "Lips round and push slightly forward.",
      "traditional-chinese": "嘴唇收圓並微微前突。",
    };
  }
  if (features.jawOpening < 0.1) {
    return { english: "Lips stay gently closed.", "traditional-chinese": "雙唇輕輕閉合。" };
  }
  if (features.jawOpening < 0.3) {
    return {
      english: "Jaw opens slightly, lips relaxed.",
      "traditional-chinese": "下巴微微打開，嘴唇放鬆。",
    };
  }
  return {
    english: "Jaw opens more, mouth relaxed and open.",
    "traditional-chinese": "下巴打開較多，嘴巴放鬆張開。",
  };
}

function defaultTongueStep(features: PhoneticFeatures): LocalizedText {
  if (features.contactZone === "none" || features.tongueRegion === "neutral") {
    return {
      english: "Tongue rests naturally in the middle of the mouth — it isn't doing the main work here.",
      "traditional-chinese": "舌頭自然放在口腔中央，這個音主要不是靠舌頭。",
    };
  }
  const zoneLabel: Record<string, LocalizedText> = {
    alveolar_ridge: { english: "the ridge behind your upper teeth", "traditional-chinese": "上齒齦" },
    postalveolar_zone: { english: "just behind the ridge, toward the hard palate", "traditional-chinese": "齒齦稍後、靠近硬顎的地方" },
    hard_palate: { english: "the hard palate", "traditional-chinese": "硬顎" },
    soft_palate: { english: "the soft palate", "traditional-chinese": "軟顎" },
    velum: { english: "the soft palate", "traditional-chinese": "軟顎" },
    upper_teeth: { english: "the back of your upper teeth", "traditional-chinese": "上齒背" },
    lower_teeth: { english: "your lower teeth", "traditional-chinese": "下齒" },
    upper_lip: { english: "your upper lip", "traditional-chinese": "上唇" },
    lower_lip: { english: "your lower lip", "traditional-chinese": "下唇" },
  };
  const zone = zoneLabel[features.contactZone] ?? {
    english: "the roof of your mouth",
    "traditional-chinese": "上顎",
  };
  return {
    english: `Tongue reaches toward ${zone.english}.`,
    "traditional-chinese": `舌頭朝${zone["traditional-chinese"]}移動。`,
  };
}

function defaultAirflowStep(features: PhoneticFeatures): LocalizedText {
  switch (features.manner) {
    case "stop":
      return {
        english: "Air is briefly blocked, then released all at once.",
        "traditional-chinese": "氣流先被短暫阻塞，再一次釋放。",
      };
    case "fricative":
      return {
        english: "Air keeps moving through a narrow gap the whole time.",
        "traditional-chinese": "氣流持續從一個窄縫中通過。",
      };
    case "affricate":
      return {
        english: "Air is blocked first, then released as a brief hiss.",
        "traditional-chinese": "氣流先被阻塞，接著轉為短促的摩擦音。",
      };
    case "nasal":
      return {
        english: "Air redirects through the nose instead of the mouth.",
        "traditional-chinese": "氣流改從鼻腔而不是口腔流出。",
      };
    case "lateral":
      return {
        english: "Air flows out around the sides of the tongue.",
        "traditional-chinese": "氣流從舌頭兩側流出。",
      };
    case "approximant":
      return {
        english: "Air flows smoothly past the tongue, without friction.",
        "traditional-chinese": "氣流平順地從舌頭旁邊通過，沒有摩擦。",
      };
    default:
      return {
        english: "Air flows freely and openly through the mouth.",
        "traditional-chinese": "氣流自由順暢地通過口腔。",
      };
  }
}

function defaultVoiceStep(features: PhoneticFeatures): LocalizedText {
  return features.voiced
    ? {
        english: "Vocal cords vibrate the whole time you make this sound.",
        "traditional-chinese": "發這個音時，聲帶全程振動。",
      }
    : {
        english: "Vocal cords stay still — only air moves, no vibration.",
        "traditional-chinese": "聲帶保持不動——只有氣流通過，不振動。",
      };
}

const DEFAULTS: Record<TeachingStepKey, (f: PhoneticFeatures) => LocalizedText> = {
  mouth: defaultMouthStep,
  tongue: defaultTongueStep,
  airflow: defaultAirflowStep,
  voice: defaultVoiceStep,
};

const STEP_ORDER: TeachingStepKey[] = ["mouth", "tongue", "airflow", "voice"];

export function deriveTeachingSteps(
  guidance: GuidanceLike[],
  phonetics: PhoneticFeatures,
): TeachingStep[] {
  const byStep = new Map<TeachingStepKey, LocalizedText>();

  for (const point of guidance) {
    const stepKey = LABEL_TO_STEP[point.label["traditional-chinese"]];
    if (!stepKey) continue;

    const existing = byStep.get(stepKey);
    byStep.set(stepKey, existing ? joinLocalized(existing, point.text) : point.text);
  }

  return STEP_ORDER.map((key) => {
    const authoredText = byStep.get(key);
    return {
      key,
      text: authoredText ?? DEFAULTS[key](phonetics),
      authored: Boolean(authoredText),
    };
  });
}
