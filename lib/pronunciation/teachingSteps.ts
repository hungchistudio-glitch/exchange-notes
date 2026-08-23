import type { PhoneticFeatures } from "./yumiRig";
import type { LocalizedText } from "./localizedText";

// Turns a sound's `phonetics` into the four-step "Mouth / Tongue / Airflow /
// Voice" captions the Yumi Teaching Stage walks through.
//
// This used to reuse each sound's authored `guidance` array (the same
// array the "How to say it" section renders directly below) whenever a
// matching point existed, only falling back to a generated phrase when
// guidance didn't cover a group. That meant Yumi's steps and "How to say
// it" often showed the exact same sentence twice on one card — the
// duplication flagged in the Pronunciation Lab redesign brief (sections 5
// and 6: Yumi's captions should be short and distinct, "How to say it"
// keeps the fuller explanation, and the two shouldn't repeat each other.
//
// So this is now phonetics-only and deliberately terse (2-5 words) —
// guaranteed to never collide with the longer authored `guidance`/`tip`
// text, and it needs no separate hand-authored caption per sound since
// `phonetics` already fully describes the articulation.
export type TeachingStepKey = "mouth" | "tongue" | "airflow" | "voice";

export type TeachingStep = {
  key: TeachingStepKey;
  text: LocalizedText;
};

function mouthCaption(features: PhoneticFeatures): LocalizedText {
  if (features.lipRounding === "strongly_rounded" || features.lipRounding === "rounded") {
    return { english: "Rounded, pushed forward", "traditional-chinese": "嘴唇收圓、微微前突" };
  }
  if (features.jawOpening < 0.1) {
    return { english: "Lips gently closed", "traditional-chinese": "雙唇輕輕閉合" };
  }
  if (features.jawOpening < 0.3) {
    return { english: "Jaw slightly open", "traditional-chinese": "下巴微微打開" };
  }
  return { english: "Jaw open, relaxed", "traditional-chinese": "下巴打開、放鬆" };
}

const TONGUE_ZONE_CAPTION: Record<string, LocalizedText> = {
  alveolar_ridge: { english: "Near the ridge behind your teeth", "traditional-chinese": "靠近上齒齦" },
  postalveolar_zone: { english: "Just behind the ridge", "traditional-chinese": "齒齦稍後方" },
  hard_palate: { english: "Touches the hard palate", "traditional-chinese": "碰到硬顎" },
  soft_palate: { english: "Touches the soft palate", "traditional-chinese": "碰到軟顎" },
  velum: { english: "Touches the soft palate", "traditional-chinese": "碰到軟顎" },
  upper_teeth: { english: "Near your upper teeth", "traditional-chinese": "靠近上齒" },
  lower_teeth: { english: "Near your lower teeth", "traditional-chinese": "靠近下齒" },
  upper_lip: { english: "Touches your upper lip", "traditional-chinese": "碰到上唇" },
  lower_lip: { english: "Touches your lower lip", "traditional-chinese": "碰到下唇" },
};

function tongueCaption(features: PhoneticFeatures): LocalizedText {
  if (features.contactZone === "none" || features.tongueRegion === "neutral") {
    return { english: "Resting in the middle", "traditional-chinese": "自然放在中央" };
  }
  return (
    TONGUE_ZONE_CAPTION[features.contactZone] ?? {
      english: "Reaches toward the roof of your mouth",
      "traditional-chinese": "朝上顎移動",
    }
  );
}

function airflowCaption(features: PhoneticFeatures): LocalizedText {
  switch (features.manner) {
    case "stop":
      return { english: "Blocked, then released", "traditional-chinese": "先阻塞，再釋放" };
    case "tap":
      return { english: "One quick flick", "traditional-chinese": "輕輕彈一下" };
    case "trill":
      return { english: "Blown into a vibration", "traditional-chinese": "用氣流吹到振動" };
    case "fricative":
      return { english: "Through a narrow gap", "traditional-chinese": "從窄縫中通過" };
    case "affricate":
      return { english: "Blocked, then a hiss", "traditional-chinese": "先阻塞，再摩擦" };
    case "nasal":
      return { english: "Through the nose", "traditional-chinese": "從鼻腔流出" };
    case "lateral":
      return { english: "Around the tongue's sides", "traditional-chinese": "從舌頭兩側流出" };
    case "approximant":
      return { english: "Flows smoothly, no friction", "traditional-chinese": "平順流動，沒有摩擦" };
    default:
      return { english: "Flows freely and openly", "traditional-chinese": "自由順暢地通過" };
  }
}

function voiceCaption(features: PhoneticFeatures): LocalizedText {
  return features.voiced
    ? { english: "Vocal cords vibrate", "traditional-chinese": "聲帶振動" }
    : { english: "No vibration, just air", "traditional-chinese": "不振動，只有氣流" };
}

const CAPTIONS: Record<TeachingStepKey, (f: PhoneticFeatures) => LocalizedText> = {
  mouth: mouthCaption,
  tongue: tongueCaption,
  airflow: airflowCaption,
  voice: voiceCaption,
};

const STEP_ORDER: TeachingStepKey[] = ["mouth", "tongue", "airflow", "voice"];

export function deriveTeachingSteps(phonetics: PhoneticFeatures): TeachingStep[] {
  return STEP_ORDER.map((key) => ({ key, text: CAPTIONS[key](phonetics) }));
}
