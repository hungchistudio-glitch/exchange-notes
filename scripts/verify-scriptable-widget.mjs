import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const widgetPath = join(projectRoot, "scriptable/ExchangeNotesYumiWidget.js");
const source = readFileSync(widgetPath, "utf8");

class Size {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class WidgetNode {
  constructor(type, value = null) {
    this.type = type;
    this.value = value;
    this.children = [];
  }

  addStack() {
    const node = new WidgetNode("stack");
    this.children.push(node);
    return node;
  }

  addText(value) {
    const node = new WidgetNode("text", value);
    this.children.push(node);
    return node;
  }

  addImage(value) {
    const node = new WidgetNode("image", value);
    this.children.push(node);
    return node;
  }

  addSpacer(value = null) {
    const node = new WidgetNode("spacer", value);
    this.children.push(node);
    return node;
  }

  setPadding(top, leading, bottom, trailing) {
    this.padding = [top, leading, bottom, trailing];
  }

  layoutHorizontally() {}
  layoutVertically() {}
  centerAlignContent() {}
  topAlignContent() {}
  applyFittingContentMode() {}
  applyFillContentMode() {}
}

class ListWidget extends WidgetNode {
  constructor() {
    super("widget");
  }
}

function noOpProxy(target = {}) {
  return new Proxy(target, {
    get(object, property) {
      if (property === "getImage") return () => ({ mockImage: true });
      if (property in object) return object[property];
      return () => {};
    },
  });
}

class DrawContext {
  constructor() {
    return noOpProxy(this);
  }
}

class Path {
  constructor() {
    return noOpProxy(this);
  }
}

class Color {
  constructor(hex, alpha = 1) {
    this.hex = hex;
    this.alpha = alpha;
  }

  static clear() {
    return new Color("#000000", 0);
  }
}

class LinearGradient {}

const Font = {
  boldSystemFont: (size) => ({ weight: "bold", size }),
  semiboldSystemFont: (size) => ({ weight: "semibold", size }),
  systemFont: (size) => ({ weight: "regular", size }),
};

const SFSymbol = {
  named: (name) => ({ image: { symbolName: name } }),
};

const fileManager = {
  joinPath: (...parts) => parts.join("/"),
  libraryDirectory: () => "/mock-library",
  fileExists: () => false,
  readString: () => "",
  writeString: () => {},
};

const FileManager = {
  local: () => fileManager,
};

const URLScheme = {
  forRunningScript: () => "scriptable:///run/ExchangeNotesYumiWidget",
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const testableSource = source.replace("await main();", "");
assert.notEqual(testableSource, source, "Widget entry point was not found");

const loadWidgetModule = new AsyncFunction(
  "Color",
  "DrawContext",
  "FileManager",
  "Font",
  "LinearGradient",
  "ListWidget",
  "Path",
  "Point",
  "Rect",
  "SFSymbol",
  "Size",
  "URLScheme",
  `${testableSource}\nreturn { appLinks, buildWidget, normalizeSnapshot, speechDeepLink, widgetScriptActionUrl };`,
);

const widgetModule = await loadWidgetModule(
  Color,
  DrawContext,
  FileManager,
  Font,
  LinearGradient,
  ListWidget,
  Path,
  Point,
  Rect,
  SFSymbol,
  Size,
  URLScheme,
);

const baseUrl = "https://exchange-notes.example";
const expectedLinks = {
  home: `${baseUrl}/`,
  vocabulary: `${baseUrl}/vocabulary`,
  addWord: `${baseUrl}/vocabulary?widgetAction=add-word`,
  capture: `${baseUrl}/capture?source=camera&from=widget`,
  profile: `${baseUrl}/profile`,
};

assert.deepEqual(widgetModule.appLinks(`${baseUrl}/`), expectedLinks);
assert.match(widgetModule.appLinks("").home, /^scriptable:\/\/\//);
assert.equal(
  widgetModule.speechDeepLink("hello world", "en-US", baseUrl),
  `${baseUrl}/speak?language=en-US&text=hello%20world`,
);
assert.equal(
  widgetModule.speechDeepLink("你好", "zh-TW", baseUrl),
  `${baseUrl}/speak?language=zh-TW&text=${encodeURIComponent("你好")}`,
);
assert.equal(
  widgetModule.speechDeepLink("hola", "es-ES", baseUrl),
  `${baseUrl}/speak?language=es-ES&text=hola`,
);
assert.equal(
  widgetModule.speechDeepLink("bonjour", "fr-FR", baseUrl),
  `${baseUrl}/speak?language=fr-FR&text=bonjour`,
);
assert.equal(
  widgetModule.speechDeepLink("ciao", "it-IT", baseUrl),
  `${baseUrl}/speak?language=it-IT&text=ciao`,
);

const payload = {
  cookieCount: 2,
  cookieGoal: 3,
  primaryText: "hola",
  secondaryText: "bonjour",
  primaryLanguage: "es",
  secondaryLanguage: "fr",
  primaryPronunciation: "/ˈola/",
  secondaryPronunciation: "/bɔ̃.ʒuʁ/",
  englishWord: "",
  traditionalChineseWord: "",
  pinyin: "",
  zhuyin: "",
  words: [
    {
      id: "word-1",
      primaryText: "hola",
      secondaryText: "bonjour",
      primaryLanguage: "es",
      secondaryLanguage: "fr",
      primaryPronunciation: "/ˈola/",
      secondaryPronunciation: "/bɔ̃.ʒuʁ/",
      englishWord: "",
      traditionalChineseWord: "",
      pinyin: "",
      zhuyin: "",
    },
    {
      id: "word-2",
      primaryText: "gracias",
      secondaryText: "merci",
      primaryLanguage: "es",
      secondaryLanguage: "fr",
      primaryPronunciation: "/ˈɡɾa.sjas/",
      secondaryPronunciation: "/mɛʁ.si/",
      englishWord: "",
      traditionalChineseWord: "",
      pinyin: "",
      zhuyin: "",
    },
  ],
  interfaceLanguage: "spanish",
  learningLanguage: "english",
  moodKey: "excited",
  localizedText: {
    headline: "Yumi ready",
    hint: "Keep learning",
    emptyWord: "Add a word",
    cookieUnit: "cookies",
  },
};

const model = {
  state: "ready",
  source: "network",
  baseUrl,
  snapshot: {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    payload,
  },
  error: "",
};

function allNodes(root) {
  return [root, ...root.children.flatMap(allNodes)];
}

function nodeForUrl(widget, url) {
  return allNodes(widget).find((node) => node.url === url);
}

function assertSize(node, width, height, label) {
  assert.ok(node, `${label} is missing`);
  assert.deepEqual(node.size, new Size(width, height), `${label} has the wrong size`);
}

const previousMediumUrl = widgetModule.widgetScriptActionUrl("previous-word", "medium");
const nextMediumUrl = widgetModule.widgetScriptActionUrl("next-word", "medium");
const previousLargeUrl = widgetModule.widgetScriptActionUrl("previous-word", "large");
const nextLargeUrl = widgetModule.widgetScriptActionUrl("next-word", "large");
const primarySpeechUrl = widgetModule.speechDeepLink("hola", "es-ES", baseUrl);
const secondarySpeechUrl = widgetModule.speechDeepLink("bonjour", "fr-FR", baseUrl);

const smallWidget = widgetModule.buildWidget(model, "small");
assert.equal(smallWidget.url, expectedLinks.home);
assert.deepEqual(smallWidget.padding, [12, 12, 12, 12]);
assertSize(nodeForUrl(smallWidget, expectedLinks.addWord), 62, 40, "Small add-word button");
assertSize(nodeForUrl(smallWidget, expectedLinks.capture), 62, 40, "Small camera button");

const mediumWidget = widgetModule.buildWidget(model, "medium");
assert.equal(mediumWidget.url, expectedLinks.home);
assert.deepEqual(mediumWidget.padding, [12, 12, 12, 12]);
assertSize(nodeForUrl(mediumWidget, expectedLinks.addWord), 28, 28, "Medium add-word button");
assertSize(nodeForUrl(mediumWidget, expectedLinks.capture), 28, 28, "Medium camera button");
assertSize(nodeForUrl(mediumWidget, previousMediumUrl), 27, 27, "Medium previous button");
assertSize(nodeForUrl(mediumWidget, nextMediumUrl), 27, 27, "Medium next button");
assertSize(nodeForUrl(mediumWidget, primarySpeechUrl), 34, 34, "Medium Spanish audio button");
assertSize(nodeForUrl(mediumWidget, secondarySpeechUrl), 34, 34, "Medium French audio button");

const largeWidget = widgetModule.buildWidget(model, "large");
assert.equal(largeWidget.url, expectedLinks.home);
assert.deepEqual(largeWidget.padding, [14, 14, 14, 14]);
assertSize(nodeForUrl(largeWidget, expectedLinks.addWord), 42, 42, "Large add-word button");
assertSize(nodeForUrl(largeWidget, expectedLinks.capture), 42, 42, "Large camera button");
assertSize(nodeForUrl(largeWidget, previousLargeUrl), 34, 34, "Large previous button");
assertSize(nodeForUrl(largeWidget, nextLargeUrl), 34, 34, "Large next button");
assertSize(nodeForUrl(largeWidget, primarySpeechUrl), 52, 52, "Large Spanish audio button");
assertSize(nodeForUrl(largeWidget, secondarySpeechUrl), 52, 52, "Large French audio button");

const upgradedLegacySnapshot = widgetModule.normalizeSnapshot({
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  payload: {
    ...payload,
    primaryText: undefined,
    secondaryText: undefined,
    primaryLanguage: undefined,
    secondaryLanguage: undefined,
    primaryPronunciation: undefined,
    secondaryPronunciation: undefined,
    englishWord: "hello world",
    traditionalChineseWord: "你好",
    pinyin: "nǐ hǎo",
    zhuyin: "ㄋㄧˇ ㄏㄠˇ",
    words: [{
      id: "legacy",
      englishWord: "hello world",
      traditionalChineseWord: "你好",
      pinyin: "nǐ hǎo",
      zhuyin: "ㄋㄧˇ ㄏㄠˇ",
    }],
    interfaceLanguage: "traditional-chinese",
    learningLanguage: "english",
  },
});
assert.equal(upgradedLegacySnapshot.schemaVersion, 2);
assert.equal(upgradedLegacySnapshot.payload.words[0].primaryLanguage, "en");
assert.equal(upgradedLegacySnapshot.payload.words[0].secondaryLanguage, "zh-TW");

/*
 * Every route the widget deep-links to, and the file that serves it.
 *
 * "/" moved in 5d4df4d: the protected root became app/(protected)/home and
 * "/" is now the public landing, which redirects a signed-in reader to
 * /home. The widget's link is still correct — this map was not, and this
 * check has been failing on the stale path ever since rather than on
 * anything to do with the widget.
 */
const routeFiles = {
  "/": "app/(public)/page.tsx",
  "/vocabulary": "app/(protected)/vocabulary/page.tsx",
  "/capture": "app/(protected)/capture/page.tsx",
  "/profile": "app/(protected)/profile/page.tsx",
  "/speak": "app/(public)/speak/page.tsx",
};

for (const [route, routeFile] of Object.entries(routeFiles)) {
  assert.ok(existsSync(join(projectRoot, routeFile)), `${route} does not have a page`);
}

const vocabularyPage = readFileSync(
  join(projectRoot, routeFiles["/vocabulary"]),
  "utf8",
);
const capturePage = readFileSync(
  join(projectRoot, routeFiles["/capture"]),
  "utf8",
);
const speakPage = readFileSync(join(projectRoot, routeFiles["/speak"]), "utf8");
const speakClient = readFileSync(
  join(projectRoot, "components/speak/SpeakPageClient.tsx"),
  "utf8",
);

assert.match(
  vocabularyPage,
  /(?:normalizedWidgetAction|widgetAction)\s*===\s*["']add-word["']/,
);
assert.match(
  vocabularyPage,
  /(?:normalizedWidgetAction|widgetAction)\s*===\s*["']open-word["']/,
);
assert.match(vocabularyPage, /openWidgetWordId/);
assert.match(capturePage, /searchParams\.get\(["']source["']\)/);
/*
 * What the widget needs is that the page still honours ?source=camera. The
 * assertion used to spell the variable out — /source\s*===\s*"camera"/ — and
 * broke when it was renamed to sourceParam, which is a rename and not a
 * regression. Matching the comparison rather than the identifier keeps the
 * check about the behaviour the widget depends on.
 */
assert.match(capturePage, /===\s*["']camera["']/);
// The /speak page used to compare the query value against "zh-TW" and
// default everything else to English. It now resolves any language the app
// knows — including the speech tags this widget actually sends — so the
// assertion is about that resolution rather than about the old two-way
// comparison. The deep links above still exercise both real values.
assert.match(speakPage, /resolveLanguageCode\(requestedLanguage\)/);
assert.match(speakClient, /speak\(text, meta\.speechTag/);
assert.doesNotMatch(source, /exchangenotes:\/\//);

console.log("PASS: Scriptable widget syntax loaded");
console.log("PASS: Small, medium, and large widget layouts built with equal outer padding");
console.log("PASS: Add word, camera, previous, next, Spanish audio, and French audio targets verified");
console.log("PASS: Schema-v1 widget cache upgrades safely to five-language schema v2");
console.log("PASS: Every HTTPS destination has a matching Next.js page and action handler");
