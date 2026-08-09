// Exchange Notes — Yumi iPhone Widget
//
// Run this script once inside the Scriptable app to configure:
// 1. Your deployed Exchange Notes URL.
// 2. The private token created in Exchange Notes Settings.
//
// The token is stored only in the iOS Keychain.
// The latest successful Widget response is cached locally for offline use.

const SCRIPT_VERSION = 6;
const SNAPSHOT_SCHEMA_VERSION = 1;

const KEYCHAIN_BASE_URL =
  "exchange-notes-yumi-widget-base-url-v1";

const KEYCHAIN_TOKEN =
  "exchange-notes-yumi-widget-token-v1";

const CACHE_FILE_NAME =
  "exchange-notes-yumi-widget-cache-v1.json";

const WORD_INDEX_FILE_NAME =
  "exchange-notes-yumi-widget-word-index-v1.txt";

const REQUEST_TIMEOUT_SECONDS = 8;
const REFRESH_INTERVAL_MINUTES = 30;
const MAX_WORDS = 12;

/*
 * Exchange Notes is currently a web app, so every app destination must use
 * the configured HTTPS origin. Scriptable actions are reserved for controls
 * that update the widget itself, such as the previous/next word buttons.
 */
function appLinks(baseUrl) {
  if (!baseUrl) {
    const fallback =
      scriptableRunUrl();

    return {
      home: fallback,
      vocabulary: fallback,
      addWord: fallback,
      capture: fallback,
      profile: fallback,
    };
  }

  return {
    home:
      joinUrl(baseUrl, "/"),

    vocabulary:
      joinUrl(baseUrl, "/vocabulary"),

    addWord:
      joinUrl(baseUrl, "/vocabulary")
      + "?widgetAction=add-word",

    capture:
      joinUrl(baseUrl, "/capture")
      + "?source=camera&from=widget",

    profile:
      joinUrl(baseUrl, "/profile"),
  };
}

const fileManager =
  FileManager.local();

const cacheFilePath =
  fileManager.joinPath(
    fileManager.libraryDirectory(),
    CACHE_FILE_NAME,
  );

await main();

async function main() {
  const handledWidgetAction =
    await handleWidgetNavigationAction();

  if (handledWidgetAction) {
    Script.complete();
    return;
  }

  if (config.runsInWidget) {
    const model =
      await loadWidgetModel();

    const widget =
      buildWidget(
        model,
        config.widgetFamily || "small",
      );

    Script.setWidget(widget);
    Script.complete();
    return;
  }

  await runConfigurationMenu();
  Script.complete();
}

async function runConfigurationMenu() {
  const menu =
    new Alert();

  menu.title =
    "Exchange Notes · Yumi Widget";

  menu.message =
    "設定連線、預覽 Widget，或清除儲存在此 iPhone 的設定。";

  menu.addAction("設定或更新連線");
  menu.addAction("預覽小型 Widget");
  menu.addAction("預覽中型 Widget");
  menu.addAction("預覽大型 Widget");
  menu.addDestructiveAction("重設連線");
  menu.addCancelAction("取消");

  const choice =
    await menu.presentSheet();

  switch (choice) {
    case 0:
      await configureConnection();
      break;

    case 1:
      await previewWidget("small");
      break;

    case 2:
      await previewWidget("medium");
      break;

    case 3:
      await previewWidget("large");
      break;

    case 4:
      await resetConnection();
      break;

    default:
      break;
  }
}

async function configureConnection() {
  const currentBaseUrl =
    readKeychainValue(
      KEYCHAIN_BASE_URL,
    ) || "";

  const existingToken =
    readKeychainValue(
      KEYCHAIN_TOKEN,
    );

  const alert =
    new Alert();

  alert.title =
    "連接 Exchange Notes";

  alert.message =
    existingToken
      ? "輸入正式網站網址。Token 欄位留白會保留目前的 Token。"
      : "輸入正式網站網址，以及從 Exchange Notes 設定頁建立的私人 Token。";

  const urlField =
    alert.addTextField(
      "https://your-domain.com",
      currentBaseUrl,
    );

  urlField.setURLKeyboard();

  alert.addSecureTextField(
    existingToken
      ? "留白以保留目前 Token"
      : "ensw_...",
    "",
  );

  alert.addAction("儲存並測試");
  alert.addCancelAction("取消");

  const result =
    await alert.presentAlert();

  if (result !== 0) {
    return;
  }

  const enteredBaseUrl =
    normalizeBaseUrl(
      alert.textFieldValue(0),
    );

  const enteredToken =
    safeString(
      alert.textFieldValue(1),
      500,
    );

  const resolvedToken =
    enteredToken
    || existingToken
    || "";

  if (!enteredBaseUrl) {
    await showMessage(
      "網址無效",
      "請輸入以 https:// 開頭的 Exchange Notes 正式網站網址。",
    );
    return;
  }

  if (!isValidToken(resolvedToken)) {
    await showMessage(
      "Token 無效",
      "請貼上以 ensw_ 開頭的完整私人 Token。",
    );
    return;
  }

  Keychain.set(
    KEYCHAIN_BASE_URL,
    enteredBaseUrl,
  );

  Keychain.set(
    KEYCHAIN_TOKEN,
    resolvedToken,
  );

  try {
    const snapshot =
      await fetchSnapshot({
        baseUrl: enteredBaseUrl,
        token: resolvedToken,
      });

    writeCachedSnapshot(snapshot);

    await showMessage(
      "連線成功",
      "Yumi Widget 已成功取得最新資料。現在可以將 Scriptable Widget 加到 iPhone 主畫面。",
    );
  } catch (error) {
    await showMessage(
      "設定已儲存，但測試失敗",
      readableError(error),
    );
  }
}

async function resetConnection() {
  const confirmation =
    new Alert();

  confirmation.title =
    "重設 Yumi Widget？";

  confirmation.message =
    "這會移除此 iPhone Scriptable 中儲存的網站網址、私人 Token 與離線快取，不會刪除 Exchange Notes 帳號資料。";

  confirmation.addDestructiveAction(
    "重設",
  );

  confirmation.addCancelAction(
    "取消",
  );

  const result =
    await confirmation.presentAlert();

  if (result !== 0) {
    return;
  }

  removeKeychainValue(
    KEYCHAIN_BASE_URL,
  );

  removeKeychainValue(
    KEYCHAIN_TOKEN,
  );

  if (
    fileManager.fileExists(
      cacheFilePath,
    )
  ) {
    fileManager.remove(
      cacheFilePath,
    );
  }

  await showMessage(
    "已重設",
    "此 iPhone 上的 Scriptable Widget 連線資料已清除。",
  );
}

async function previewWidget(family) {
  const model =
    await loadWidgetModel();

  const widget =
    buildWidget(
      model,
      family,
    );

  if (family === "small") {
    await widget.presentSmall();
    return;
  }

  if (family === "large") {
    await widget.presentLarge();
    return;
  }

  await widget.presentMedium();
}

function readSettings() {
  const baseUrl =
    readKeychainValue(
      KEYCHAIN_BASE_URL,
    );

  const token =
    readKeychainValue(
      KEYCHAIN_TOKEN,
    );

  if (
    !baseUrl
    || !isValidToken(token)
  ) {
    return null;
  }

  return {
    baseUrl,
    token,
  };
}

async function loadWidgetModel() {
  const settings =
    readSettings();

  if (!settings) {
    return {
      state: "setup-required",
      source: "none",
      baseUrl: "",
      snapshot: null,
      error: "",
    };
  }

  try {
    const snapshot =
      await fetchSnapshot(settings);

    writeCachedSnapshot(snapshot);

    return {
      state: "ready",
      source: "network",
      baseUrl: settings.baseUrl,
      snapshot,
      error: "",
    };
  } catch (error) {
    const cachedSnapshot =
      readCachedSnapshot();

    if (cachedSnapshot) {
      return {
        state: "ready",
        source: "cache",
        baseUrl: settings.baseUrl,
        snapshot: cachedSnapshot,
        error: readableError(error),
      };
    }

    return {
      state: "error",
      source: "none",
      baseUrl: settings.baseUrl,
      snapshot: null,
      error: readableError(error),
    };
  }
}

async function fetchSnapshot(settings) {
  const request =
    new Request(
      joinUrl(
        settings.baseUrl,
        "/api/scriptable/widget",
      ),
    );

  request.method = "GET";

  request.timeoutInterval =
    REQUEST_TIMEOUT_SECONDS;

  request.headers = {
    Accept: "application/json",
    Authorization:
      "Bearer " + settings.token,
    "Cache-Control": "no-cache",
  };

  const responseBody =
    await request.loadJSON();

  const response =
    request.response;

  const statusCode =
    response
      ? response.statusCode
      : 0;

  if (
    statusCode !== 200
    || !isRecord(responseBody)
    || responseBody.ok !== true
  ) {
    if (statusCode === 401) {
      throw new Error(
        "私人 Token 已失效，請回到 Exchange Notes 重新建立並更新 Token。",
      );
    }

    if (statusCode === 404) {
      throw new Error(
        "目前還沒有 Yumi Widget 快照。請先登入 Exchange Notes 並開啟首頁。",
      );
    }

    throw new Error(
      "伺服器暫時無法提供 Widget 資料。",
    );
  }

  const snapshot =
    normalizeSnapshot(
      responseBody.snapshot,
    );

  if (!snapshot) {
    throw new Error(
      "Widget 回傳的資料格式無效。",
    );
  }

  return snapshot;
}

function writeCachedSnapshot(snapshot) {
  try {
    const cacheRecord = {
      scriptVersion: SCRIPT_VERSION,
      cachedAt:
        new Date().toISOString(),
      snapshot,
    };

    fileManager.writeString(
      cacheFilePath,
      JSON.stringify(cacheRecord),
    );
  } catch (error) {
    console.log(
      "Could not write Widget cache: "
      + readableError(error),
    );
  }
}

function readCachedSnapshot() {
  try {
    if (
      !fileManager.fileExists(
        cacheFilePath,
      )
    ) {
      return null;
    }

    const raw =
      fileManager.readString(
        cacheFilePath,
      );

    const parsed =
      JSON.parse(raw);

    if (
      !isRecord(parsed)
      || parsed.scriptVersion
        !== SCRIPT_VERSION
    ) {
      return null;
    }

    return normalizeSnapshot(
      parsed.snapshot,
    );
  } catch {
    return null;
  }
}

function normalizeSnapshot(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.schemaVersion
      !== SNAPSHOT_SCHEMA_VERSION
  ) {
    return null;
  }

  const updatedAt =
    safeTimestamp(
      value.updatedAt,
    );

  const payload =
    normalizePayload(
      value.payload,
    );

  if (
    !updatedAt
    || !payload
  ) {
    return null;
  }

  return {
    schemaVersion:
      SNAPSHOT_SCHEMA_VERSION,
    updatedAt,
    payload,
  };
}

function normalizePayload(value) {
  if (!isRecord(value)) {
    return null;
  }

  const cookieGoal =
    clampInteger(
      value.cookieGoal,
      1,
      100,
      3,
    );

  const cookieCount =
    clampInteger(
      value.cookieCount,
      0,
      cookieGoal,
      0,
    );

  const interfaceLanguage =
    normalizeLanguage(
      value.interfaceLanguage,
    );

  const learningLanguage =
    normalizeLanguage(
      value.learningLanguage,
    );

  const localizedText =
    normalizeLocalizedText(
      value.localizedText,
    );

  const rawWords =
    Array.isArray(value.words)
      ? value.words
      : [];

  const words =
    rawWords
      .slice(0, MAX_WORDS)
      .map(normalizeWord)
      .filter(Boolean);

  if (
    !interfaceLanguage
    || !learningLanguage
    || !localizedText
  ) {
    return null;
  }

  return {
    cookieCount,
    cookieGoal,

    englishWord:
      safeString(
        value.englishWord,
        160,
      ),

    traditionalChineseWord:
      safeString(
        value.traditionalChineseWord,
        160,
      ),

    pinyin:
      safeString(
        value.pinyin,
        240,
      ),

    zhuyin:
      safeString(
        value.zhuyin,
        240,
      ),

    words,

    interfaceLanguage,
    learningLanguage,

    moodKey:
      safeString(
        value.moodKey,
        64,
      ) || "waiting",

    localizedText,
  };
}

function normalizeLocalizedText(value) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    headline:
      safeString(
        value.headline,
        500,
      ),

    hint:
      safeString(
        value.hint,
        500,
      ),

    emptyWord:
      safeString(
        value.emptyWord,
        500,
      ),

    cookieUnit:
      safeString(
        value.cookieUnit,
        100,
      ),
  };
}

function normalizeWord(value) {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    safeString(
      value.id,
      128,
    );

  const englishWord =
    safeString(
      value.englishWord,
      160,
    );

  const traditionalChineseWord =
    safeString(
      value.traditionalChineseWord,
      160,
    );

  if (
    !id
    || (
      !englishWord
      && !traditionalChineseWord
    )
  ) {
    return null;
  }

  return {
    id,
    englishWord,
    traditionalChineseWord,

    pinyin:
      safeString(
        value.pinyin,
        240,
      ),

    zhuyin:
      safeString(
        value.zhuyin,
        240,
      ),
  };
}

function buildWidget(model, family) {
  if (
    model.state
      === "setup-required"
  ) {
    return buildSetupWidget(
      family,
    );
  }

  if (
    model.state === "error"
    || !model.snapshot
  ) {
    return buildErrorWidget(
      model,
      family,
    );
  }

  const normalizedFamily =
    normalizeWidgetFamily(
      family,
    );

  if (
    normalizedFamily === "small"
  ) {
    return buildSmallWidget(
      model,
    );
  }

  if (
    normalizedFamily === "large"
  ) {
    return buildLargeWidget(
      model,
    );
  }

  return buildMediumWidget(
    model,
  );
}

function buildSmallWidget(model) {
  const widget =
    createBaseWidget(
      model,
      "small",
    );

  const payload =
    model.snapshot.payload;

  const content =
    widget.addStack();

  content.layoutVertically();

  const top =
    content.addStack();

  top.layoutHorizontally();
  top.topAlignContent();

  const yumiSlot =
    top.addStack();

  yumiSlot.layoutVertically();
  yumiSlot.centerAlignContent();
  yumiSlot.size =
    new Size(92, 92);

  addYumiImage(
    yumiSlot,
    payload.moodKey,
    88,
    88,
  );

  top.addSpacer();

  const progressSlot =
    top.addStack();

  progressSlot.layoutVertically();
  progressSlot.centerAlignContent();
  progressSlot.size =
    new Size(38, 38);

  addProgressRing(
    progressSlot,
    payload,
    36,
  );

  content.addSpacer();

  addQuickActions(
    content,
    "small",
    model.baseUrl,
  );

  widget.url =
    appLinks(
      model.baseUrl,
    ).home;

  return widget;
}

function buildMediumWidget(model) {
  const widget =
    createBaseWidget(
      model,
      "medium",
    );

  const payload =
    model.snapshot.payload;

  const main =
    widget.addStack();

  main.layoutHorizontally();
  main.centerAlignContent();
  main.spacing = 10;

  const left =
    main.addStack();

  left.layoutVertically();
  left.centerAlignContent();
  left.size =
    new Size(108, 0);

  addYumiImage(
    left,
    payload.moodKey,
    86,
    86,
  );

  left.addSpacer();

  const utilityRow =
    left.addStack();

  utilityRow.layoutHorizontally();
  utilityRow.centerAlignContent();
  utilityRow.spacing = 5;

  addProgressRing(
    utilityRow,
    payload,
    30,
  );

  addQuickActions(
    utilityRow,
    "micro",
    model.baseUrl,
  );

  const right =
    main.addStack();

  right.layoutVertically();

  addCompanionHeader(
    right,
    payload,
    14,
    10,
  );

  right.addSpacer();

  addDarkWordPanel(
    right,
    payload,
    {
      family: "medium",
      panelHeight: 92,
      primarySize: 19,
      secondarySize: 12,
      pronunciationSize: 9,
      navigationDiameter: 27,
      navigationSymbolSize: 10,
      audioDiameter: 34,
      audioGlyphSize: 15,
      cornerRadius: 18,
      padding: 9,
      baseUrl: model.baseUrl,
    },
  );

  return widget;
}

function buildLargeWidget(model) {
  const widget =
    createBaseWidget(
      model,
      "large",
    );

  const payload =
    model.snapshot.payload;

  const header =
    widget.addStack();

  header.layoutHorizontally();
  header.topAlignContent();
  header.spacing = 14;

  const yumiSlot =
    header.addStack();

  yumiSlot.layoutVertically();
  yumiSlot.centerAlignContent();
  yumiSlot.size =
    new Size(132, 132);

  addYumiImage(
    yumiSlot,
    payload.moodKey,
    128,
    128,
  );

  const heading =
    header.addStack();

  heading.layoutVertically();

  addCompanionHeader(
    heading,
    payload,
    20,
    13,
  );

  heading.addSpacer();

  const summary =
    heading.addStack();

  summary.layoutHorizontally();
  summary.centerAlignContent();
  summary.spacing = 10;

  addProgressRing(
    summary,
    payload,
    46,
  );

  summary.addSpacer();

  addQuickActions(
    summary,
    "compact",
    model.baseUrl,
  );

  widget.addSpacer();

  addDarkWordPanel(
    widget,
    payload,
    {
      family: "large",
      panelHeight: 170,
      primarySize: 30,
      secondarySize: 17,
      pronunciationSize: 13,
      navigationDiameter: 34,
      navigationSymbolSize: 12,
      audioDiameter: 52,
      audioGlyphSize: 23,
      cornerRadius: 23,
      padding: 17,
      baseUrl: model.baseUrl,
    },
  );

  return widget;
}

function createBaseWidget(
  model,
  family,
) {
  const widget =
    new ListWidget();

  const payload =
    model
    && model.snapshot
    && model.snapshot.payload
      ? model.snapshot.payload
      : null;

  const mood =
    payload
      ? payload.moodKey
      : "waiting";

  widget.backgroundColor =
    Color.clear();

  widget.backgroundImage =
    drawPremiumBackground(
      family,
      mood,
    );

  const outerInset =
    family === "large"
      ? 14
      : 12;

  widget.setPadding(
    outerInset,
    outerInset,
    outerInset,
    outerInset,
  );

  widget.refreshAfterDate =
    new Date(
      Date.now()
      + REFRESH_INTERVAL_MINUTES
        * 60
        * 1000,
    );

  widget.url =
    appLinks(
      model.baseUrl,
    ).home;

  return widget;
}

function buildSetupWidget(family) {
  const widget =
    createStandaloneWidget(
      family,
    );

  addYumiImage(
    widget,
    "curious",
    family === "small" ? 64 : 82,
    family === "small" ? 44 : 56,
  );

  widget.addSpacer(8);

  const title =
    widget.addText(
      "Set up Yumi Widget",
    );

  title.font =
    Font.boldSystemFont(
      family === "small"
        ? 15
        : 18,
    );

  title.textColor =
    palette().primary;

  title.lineLimit = 2;

  widget.addSpacer(5);

  const description =
    widget.addText(
      "在 Scriptable 中執行這個腳本，輸入網站網址與私人 Token。",
    );

  description.font =
    Font.systemFont(
      family === "small"
        ? 10
        : 12,
    );

  description.textColor =
    palette().secondary;

  description.lineLimit =
    family === "small"
      ? 3
      : 4;

  widget.url =
    scriptableRunUrl();

  return widget;
}

function buildErrorWidget(
  model,
  family,
) {
  const widget =
    createStandaloneWidget(
      family,
    );

  addYumiImage(
    widget,
    "sad",
    family === "small" ? 64 : 82,
    family === "small" ? 44 : 56,
  );

  widget.addSpacer(7);

  const title =
    widget.addText(
      "Yumi is offline",
    );

  title.font =
    Font.boldSystemFont(
      family === "small"
        ? 15
        : 18,
    );

  title.textColor =
    palette().primary;

  widget.addSpacer(5);

  const message =
    widget.addText(
      model.error
      || "目前無法取得 Widget 資料。",
    );

  message.font =
    Font.systemFont(
      family === "small"
        ? 9
        : 11,
    );

  message.textColor =
    palette().secondary;

  message.lineLimit =
    family === "small"
      ? 4
      : 5;

  widget.url =
    model.baseUrl
      ? appLinks(
          model.baseUrl,
        ).profile
      : scriptableRunUrl();

  return widget;
}

function createStandaloneWidget(
  family,
) {
  const widget =
    new ListWidget();

  const colors =
    palette();

  const gradient =
    new LinearGradient();

  gradient.colors = [
    colors.backgroundTop,
    colors.backgroundBottom,
  ];

  gradient.locations = [
    0,
    1,
  ];

  widget.backgroundGradient =
    gradient;

  widget.setPadding(
    family === "small" ? 14 : 18,
    family === "small" ? 14 : 18,
    family === "small" ? 14 : 18,
    family === "small" ? 14 : 18,
  );

  widget.refreshAfterDate =
    new Date(
      Date.now()
      + REFRESH_INTERVAL_MINUTES
        * 60
        * 1000,
    );

  return widget;
}

async function handleWidgetNavigationAction() {
  const parameters =
    isRecord(args.queryParameters)
      ? args.queryParameters
      : {};

  const action =
    safeString(
      parameters.widgetAction,
      40,
    );

  if (
    action !== "previous-word"
    && action !== "next-word"
  ) {
    return false;
  }

  const model =
    await loadWidgetModel();

  if (
    model.state !== "ready"
    || !model.snapshot
  ) {
    return true;
  }

  const payload =
    model.snapshot.payload;

  const words =
    availableWordRecords(payload);

  if (words.length > 1) {
    const currentIndex =
      normalizedSelectedWordIndex(
        words.length,
      );

    const offset =
      action === "previous-word"
        ? -1
        : 1;

    const nextIndex =
      (
        currentIndex
        + offset
        + words.length
      ) % words.length;

    writeSelectedWordIndex(nextIndex);
  }

  const family =
    normalizeWidgetFamily(
      safeString(
        parameters.family,
        20,
      ) || "medium",
    );

  const widget =
    buildWidget(
      model,
      family,
    );

  Script.setWidget(widget);

  return true;
}

function addProgressRing(
  container,
  payload,
  diameter,
) {
  const image =
    container.addImage(
      drawProgressRing(
        payload,
        diameter,
      ),
    );

  image.imageSize =
    new Size(
      diameter,
      diameter,
    );

  image.applyFittingContentMode();

  return image;
}

function drawProgressRing(
  payload,
  diameter,
) {
  const context =
    new DrawContext();

  context.size =
    new Size(
      diameter,
      diameter,
    );

  context.opaque = false;
  context.respectScreenScale = true;

  const goal =
    Math.max(
      1,
      Number(payload.cookieGoal) || 1,
    );

  const count =
    Math.max(
      0,
      Number(payload.cookieCount) || 0,
    );

  const progress =
    Math.min(
      1,
      count / goal,
    );

  const center =
    diameter / 2;

  const radius =
    diameter * 0.39;

  const segments = 40;

  for (
    let index = 0;
    index < segments;
    index += 1
  ) {
    const angle =
      -Math.PI / 2
      + (
        Math.PI * 2 * index
      ) / segments;

    const active =
      index
      < Math.round(
        progress * segments,
      );

    const dotSize =
      diameter * 0.052;

    const x =
      center
      + Math.cos(angle) * radius
      - dotSize / 2;

    const y =
      center
      + Math.sin(angle) * radius
      - dotSize / 2;

    context.setFillColor(
      active
        ? new Color("#F47A1F")
        : new Color("#F47A1F", 0.18),
    );

    context.fillEllipse(
      new Rect(
        x,
        y,
        dotSize,
        dotSize,
      ),
    );
  }

  context.setTextColor(
    new Color("#18342D"),
  );

  context.setFont(
    Font.boldSystemFont(
      diameter * 0.17,
    ),
  );

  context.setTextAlignedCenter();

  context.drawTextInRect(
    count + "/" + goal,
    new Rect(
      0,
      diameter * 0.39,
      diameter,
      diameter * 0.28,
    ),
  );

  return context.getImage();
}

function addCompanionHeader(
  container,
  payload,
  headlineSize,
  hintSize,
) {
  const colors =
    palette();

  const headline =
    container.addText(
      payload.localizedText.headline
      || "Yumi",
    );

  headline.font =
    Font.semiboldSystemFont(
      headlineSize,
    );

  headline.textColor =
    colors.primary;

  headline.lineLimit = 2;
  headline.minimumScaleFactor = 0.66;

  if (
    payload.localizedText.hint
  ) {
    container.addSpacer(2);

    const hint =
      container.addText(
        payload.localizedText.hint,
      );

    hint.font =
      Font.semiboldSystemFont(
        hintSize,
      );

    hint.textColor =
      colors.secondary;

    hint.lineLimit = 2;
    hint.minimumScaleFactor = 0.68;
  }
}

function addDarkWordPanel(
  container,
  payload,
  options,
) {
  const colors =
    palette();

  const panel =
    container.addStack();

  panel.layoutHorizontally();
  panel.centerAlignContent();

  panel.backgroundColor =
    colors.card;

  panel.cornerRadius =
    options.cornerRadius;

  panel.setPadding(
    options.padding,
    options.padding,
    options.padding,
    options.padding,
  );

  panel.size =
    new Size(
      0,
      options.panelHeight,
    );

  const textColumn =
    panel.addStack();

  textColumn.layoutVertically();

  addWordContent(
    textColumn,
    payload,
    options,
  );

  textColumn.addSpacer();

  addWordNavigation(
    textColumn,
    payload,
    options.family,
    options.navigationDiameter,
    options.navigationSymbolSize,
  );

  panel.addSpacer();

  addAudioActions(
    panel,
    payload,
    options.audioDiameter,
    options.audioGlyphSize,
    options.baseUrl,
  );

  return panel;
}

function addWordContent(
  container,
  payload,
  options,
) {
  const colors =
    palette();

  const state =
    selectedWordState(payload);

  const word =
    state.record;

  const learningTraditionalChinese =
    payload.learningLanguage
      !== "english";

  const primaryValue =
    learningTraditionalChinese
      ? word.traditionalChineseWord
      : word.englishWord;

  const secondaryValue =
    learningTraditionalChinese
      ? word.englishWord
      : word.traditionalChineseWord;

  const primary =
    container.addText(
      safeString(
        primaryValue,
        160,
      )
      || payload.localizedText.emptyWord
      || "Add a word",
    );

  primary.font =
    Font.boldSystemFont(
      options.primarySize,
    );

  primary.textColor =
    colors.cardText;

  primary.lineLimit = 2;
  primary.minimumScaleFactor = 0.52;

  if (secondaryValue) {
    container.addSpacer(
      options.family === "large"
        ? 4
        : 2,
    );

    const secondary =
      container.addText(
        safeString(
          secondaryValue,
          160,
        ),
      );

    secondary.font =
      Font.semiboldSystemFont(
        options.secondarySize,
      );

    secondary.textColor =
      colors.cardSecondary;

    secondary.lineLimit = 1;
    secondary.minimumScaleFactor = 0.62;
  }

  const pronunciationValues = [
    safeString(
      word.pinyin,
      120,
    ),
    safeString(
      word.zhuyin,
      120,
    ),
  ].filter(
    function nonEmpty(value) {
      return Boolean(value);
    },
  );

  pronunciationValues.forEach(
    function addPronunciation(value) {
      container.addSpacer(
        options.family === "large"
          ? 4
          : 2,
      );

      const pronunciation =
        container.addText(value);

      pronunciation.font =
        Font.semiboldSystemFont(
          options.pronunciationSize,
        );

      pronunciation.textColor =
        colors.cardTertiary;

      pronunciation.lineLimit = 1;
      pronunciation.minimumScaleFactor = 0.62;
    },
  );
}

function addWordNavigation(
  container,
  payload,
  family,
  diameter,
  symbolSize,
) {
  const words =
    availableWordRecords(payload);

  if (words.length <= 1) {
    return null;
  }

  const row =
    container.addStack();

  row.layoutHorizontally();
  row.centerAlignContent();
  row.spacing = 8;

  addNavigationButton(
    row,
    "chevron.left",
    widgetScriptActionUrl(
      "previous-word",
      family,
    ),
    diameter,
    symbolSize,
  );

  addNavigationButton(
    row,
    "chevron.right",
    widgetScriptActionUrl(
      "next-word",
      family,
    ),
    diameter,
    symbolSize,
  );

  return row;
}

function addNavigationButton(
  container,
  symbolName,
  url,
  diameter,
  symbolSize,
) {
  const colors =
    palette();

  const button =
    container.addStack();

  button.layoutHorizontally();
  button.centerAlignContent();

  button.size =
    new Size(
      diameter,
      diameter,
    );

  button.backgroundColor =
    new Color(
      "#FFFFFF",
      0.10,
    );

  button.cornerRadius =
    diameter / 2;

  button.borderWidth = 1;
  button.borderColor =
    new Color(
      "#FFFFFF",
      0.32,
    );

  button.url = url;

  button.addSpacer();

  const symbol =
    SFSymbol.named(
      symbolName,
    );

  const icon =
    button.addImage(
      symbol.image,
    );

  icon.imageSize =
    new Size(
      symbolSize,
      symbolSize,
    );

  icon.tintColor =
    colors.cardText;

  button.addSpacer();

  return button;
}

function addAudioActions(
  container,
  payload,
  diameter,
  glyphSize,
  baseUrl,
) {
  const state =
    selectedWordState(payload);

  const column =
    container.addStack();

  column.layoutVertically();
  column.spacing =
    diameter >= 50
      ? 10
      : 7;

  addAudioButton(
    column,
    "A",
    state.record.englishWord,
    "en-US",
    "english",
    diameter,
    glyphSize,
    baseUrl,
  );

  addAudioButton(
    column,
    "ㄅ",
    state.record.traditionalChineseWord,
    "zh-TW",
    "traditional-chinese",
    diameter,
    glyphSize,
    baseUrl,
  );

  return column;
}

function addAudioButton(
  container,
  badge,
  text,
  language,
  style,
  diameter,
  glyphSize,
  baseUrl,
) {
  const button =
    container.addStack();

  button.layoutHorizontally();
  button.centerAlignContent();

  button.size =
    new Size(
      diameter,
      diameter,
    );

  button.cornerRadius =
    diameter * 0.25;

  const gradient =
    new LinearGradient();

  if (style === "english") {
    gradient.colors = [
      new Color("#FFD147"),
      new Color("#FF730A"),
    ];
  } else {
    gradient.colors = [
      new Color("#20243B"),
      new Color("#03050D"),
    ];
  }

  gradient.locations = [
    0,
    1,
  ];

  button.backgroundGradient =
    gradient;

  button.borderWidth = 1;

  button.borderColor =
    style === "english"
      ? new Color("#FFFFFF", 0.48)
      : new Color("#FF8A1F", 0.72);

  button.url =
    text
      ? speechDeepLink(
          text,
          language,
          baseUrl,
        )
      : appLinks(
          baseUrl,
        ).home;

  button.addSpacer();

  const label =
    button.addText(badge);

  label.font =
    Font.boldSystemFont(
      glyphSize,
    );

  label.textColor =
    style === "english"
      ? new Color("#221508")
      : new Color("#FFFFFF");

  button.addSpacer();

  return button;
}

function addQuickActions(
  container,
  style,
  baseUrl,
) {
  const links =
    appLinks(baseUrl);

  const row =
    container.addStack();

  row.layoutHorizontally();
  row.centerAlignContent();

  if (style === "small") {
    row.spacing = 10;
    row.addSpacer();
  } else if (style === "micro") {
    row.spacing = 5;
  } else {
    row.spacing = 8;
  }

  const width =
    style === "small"
      ? 62
      : style === "micro"
        ? 28
        : 42;

  const height =
    style === "small"
      ? 40
      : style === "micro"
        ? 28
        : 42;

  const iconSize =
    style === "small"
      ? 17
      : style === "micro"
        ? 11
        : 14;

  addQuickActionButton(
    row,
    "plus",
    links.addWord,
    true,
    width,
    height,
    iconSize,
  );

  addQuickActionButton(
    row,
    "camera.viewfinder",
    links.capture,
    false,
    width,
    height,
    iconSize,
  );

  if (style === "small") {
    row.addSpacer();
  }

  return row;
}

function addQuickActionButton(
  container,
  symbolName,
  url,
  isPrimary,
  width,
  height,
  iconSize,
) {
  const colors =
    palette();

  const button =
    container.addStack();

  button.layoutHorizontally();
  button.centerAlignContent();

  button.size =
    new Size(
      width,
      height,
    );

  button.cornerRadius =
    Math.min(
      15,
      height * 0.38,
    );

  const gradient =
    new LinearGradient();

  if (isPrimary) {
    gradient.colors = [
      new Color(
        "#073A45",
        0.90,
      ),
      new Color(
        "#4C2B8C",
        0.84,
      ),
    ];
  } else {
    gradient.colors = [
      new Color(
        "#FFFFFF",
        0.26,
      ),
      new Color(
        "#48DCC0",
        0.14,
      ),
    ];
  }

  gradient.locations = [
    0,
    1,
  ];

  button.backgroundGradient =
    gradient;

  button.borderWidth = 1;

  button.borderColor =
    isPrimary
      ? new Color(
          "#7AF6DC",
          0.54,
        )
      : new Color(
          "#FFFFFF",
          0.42,
        );

  button.url = url;

  button.addSpacer();

  const symbol =
    SFSymbol.named(
      symbolName,
    );

  const icon =
    button.addImage(
      symbol.image,
    );

  icon.imageSize =
    new Size(
      iconSize,
      iconSize,
    );

  icon.tintColor =
    isPrimary
      ? new Color("#FFFFFF")
      : colors.primary;

  button.addSpacer();

  return button;
}

function availableWordRecords(payload) {
  if (
    Array.isArray(payload.words)
    && payload.words.length > 0
  ) {
    return payload.words;
  }

  return [
    {
      englishWord:
        safeString(
          payload.englishWord,
          160,
        ),

      traditionalChineseWord:
        safeString(
          payload.traditionalChineseWord,
          160,
        ),

      pinyin:
        safeString(
          payload.pinyin,
          120,
        ),

      zhuyin:
        safeString(
          payload.zhuyin,
          120,
        ),
    },
  ];
}

function selectedWordState(payload) {
  const words =
    availableWordRecords(payload);

  const index =
    normalizedSelectedWordIndex(
      words.length,
    );

  return {
    record:
      words[index]
      || words[0],

    index,
    count: words.length,
  };
}

function normalizedSelectedWordIndex(
  wordCount,
) {
  if (wordCount <= 0) {
    return 0;
  }

  const stored =
    readSelectedWordIndex();

  return (
    stored % wordCount
    + wordCount
  ) % wordCount;
}

function readSelectedWordIndex() {
  const path =
    fileManager.joinPath(
      fileManager.libraryDirectory(),
      WORD_INDEX_FILE_NAME,
    );

  if (
    !fileManager.fileExists(path)
  ) {
    return 0;
  }

  try {
    const parsed =
      Number.parseInt(
        fileManager.readString(path),
        10,
      );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  } catch {
    return 0;
  }
}

function writeSelectedWordIndex(index) {
  const path =
    fileManager.joinPath(
      fileManager.libraryDirectory(),
      WORD_INDEX_FILE_NAME,
    );

  fileManager.writeString(
    path,
    String(
      Math.max(
        0,
        Math.trunc(index),
      ),
    ),
  );
}

function widgetScriptActionUrl(
  action,
  family,
) {
  const base =
    scriptableRunUrl();

  const separator =
    base.indexOf("?") >= 0
      ? "&"
      : "?";

  return (
    base
    + separator
    + "widgetAction="
    + encodeURIComponent(action)
    + "&family="
    + encodeURIComponent(family)
  );
}

function speechDeepLink(
  text,
  language,
  baseUrl,
) {
  if (!baseUrl) {
    return scriptableRunUrl();
  }

  return (
    joinUrl(baseUrl, "/speak")
    + "?language="
    + encodeURIComponent(language)
    + "&text="
    + encodeURIComponent(text)
  );
}

function drawPremiumBackground(
  family,
  mood,
) {
  const size =
    familyCanvasSize(family);

  const context =
    new DrawContext();

  context.size =
    new Size(
      size.width,
      size.height,
    );

  context.opaque = false;
  context.respectScreenScale = true;

  const colors =
    yumiPaletteForMood(mood);

  context.setFillColor(
    new Color(
      "#04101E",
      0.58,
    ),
  );

  context.fillRect(
    new Rect(
      0,
      0,
      size.width,
      size.height,
    ),
  );

  context.setFillColor(
    new Color(
      "#133E72",
      0.25,
    ),
  );

  context.fillEllipse(
    new Rect(
      -size.width * 0.32,
      -size.height * 0.72,
      size.width * 1.18,
      size.width * 1.18,
    ),
  );

  context.setFillColor(
    new Color(
      colors.cyan,
      0.18,
    ),
  );

  context.fillEllipse(
    new Rect(
      size.width * 0.30,
      -size.height * 0.42,
      size.width * 0.92,
      size.width * 0.92,
    ),
  );

  context.setFillColor(
    new Color(
      colors.violet,
      0.17,
    ),
  );

  context.fillEllipse(
    new Rect(
      size.width * 0.52,
      size.height * 0.34,
      size.width * 0.72,
      size.width * 0.72,
    ),
  );

  context.setFillColor(
    new Color(
      colors.pink,
      0.11,
    ),
  );

  context.fillEllipse(
    new Rect(
      -size.width * 0.12,
      size.height * 0.60,
      size.width * 0.54,
      size.width * 0.54,
    ),
  );

  const grid =
    new Path();

  const step =
    family === "small"
      ? 26
      : 32;

  for (
    let x = -step;
    x <= size.width + step;
    x += step
  ) {
    grid.move(
      new Point(
        x,
        0,
      ),
    );

    grid.addLine(
      new Point(
        x,
        size.height,
      ),
    );
  }

  for (
    let y = -step;
    y <= size.height + step;
    y += step
  ) {
    grid.move(
      new Point(
        0,
        y,
      ),
    );

    grid.addLine(
      new Point(
        size.width,
        y,
      ),
    );
  }

  context.setStrokeColor(
    new Color(
      "#BEEBFF",
      0.075,
    ),
  );

  context.setLineWidth(0.7);
  context.addPath(grid);
  context.strokePath();

  const constellation =
    new Path();

  const points = [
    [0.07, 0.18],
    [0.20, 0.66],
    [0.36, 0.29],
    [0.51, 0.82],
    [0.66, 0.18],
    [0.79, 0.61],
    [0.93, 0.27],
  ];

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    constellation.move(
      new Point(
        size.width * points[index][0],
        size.height * points[index][1],
      ),
    );

    constellation.addLine(
      new Point(
        size.width * points[index + 1][0],
        size.height * points[index + 1][1],
      ),
    );
  }

  context.setStrokeColor(
    new Color(
      "#B7E9FF",
      0.16,
    ),
  );

  context.setLineWidth(0.8);
  context.addPath(constellation);
  context.strokePath();

  const orbitSpecs = [
    [
      -size.width * 0.08,
      -size.height * 0.20,
      size.width * 0.72,
      size.height * 0.72,
      colors.cyan,
      0.34,
    ],
    [
      size.width * 0.56,
      size.height * 0.48,
      size.width * 0.46,
      size.height * 0.32,
      colors.violet,
      0.34,
    ],
    [
      size.width * 0.24,
      size.height * 0.10,
      size.width * 0.86,
      size.height * 0.54,
      colors.warm,
      0.24,
    ],
  ];

  orbitSpecs.forEach(
    function drawOrbit(item, index) {
      context.setStrokeColor(
        new Color(
          item[4],
          item[5],
        ),
      );

      context.setLineWidth(
        index === 0
          ? 1.4
          : 1.0,
      );

      context.strokeEllipse(
        new Rect(
          item[0],
          item[1],
          item[2],
          item[3],
        ),
      );
    },
  );

  const particles = [
    [0.06, 0.16, 3, colors.cyan],
    [0.13, 0.76, 5, "#FFFFFF"],
    [0.24, 0.44, 2, colors.warm],
    [0.41, 0.14, 4, colors.violet],
    [0.56, 0.76, 3, colors.cyan],
    [0.68, 0.24, 2, "#FFFFFF"],
    [0.81, 0.58, 5, colors.pink],
    [0.94, 0.18, 3, colors.warm],
    [0.92, 0.84, 4, colors.violet],
  ];

  particles.forEach(
    function drawBackgroundParticle(
      item,
      index,
    ) {
      context.setFillColor(
        new Color(
          item[3],
          index % 3 === 0
            ? 0.86
            : 0.58,
        ),
      );

      context.fillEllipse(
        new Rect(
          size.width * item[0],
          size.height * item[1],
          item[2],
          item[2],
        ),
      );
    },
  );

  const glassBorder =
    new Path();

  const borderInset =
    family === "small"
      ? 3
      : 4;

  const borderRadius =
    family === "small"
      ? 22
      : 26;

  glassBorder.addRoundedRect(
    new Rect(
      borderInset,
      borderInset,
      size.width - borderInset * 2,
      size.height - borderInset * 2,
    ),
    borderRadius,
    borderRadius,
  );

  context.setStrokeColor(
    new Color(
      "#D9FAFF",
      0.18,
    ),
  );

  context.setLineWidth(1.2);
  context.addPath(glassBorder);
  context.strokePath();

  return context.getImage();
}

function familyCanvasSize(family) {
  if (family === "small") {
    return {
      width: 170,
      height: 170,
    };
  }

  if (family === "large") {
    return {
      width: 364,
      height: 382,
    };
  }

  return {
    width: 364,
    height: 170,
  };
}

function yumiPaletteForMood(mood) {
  const base = {
    body: "#36D7AC",
    bodyTop: "#32E6C2",
    bodyMiddle: "#53D8B2",
    bodyBottom: "#7777FF",
    bodyDark: "#073A45",
    glow: "#70F7DA",
    particle: "#2FDDBA",
    cyan: "#53DFFF",
    violet: "#8A70FF",
    warm: "#FFB84A",
    pink: "#FF6FAE",
    eyeSurface: "#F4FFF9",
    eyeInk: "#062B35",
  };

  if (
    mood === "sad"
    || mood === "lonely"
    || mood === "sleeping"
  ) {
    return {
      body: "#54B8B0",
      bodyTop: "#67C7BE",
      bodyMiddle: "#50AEA7",
      bodyBottom: "#6D78C9",
      bodyDark: "#173E51",
      glow: "#92DDE3",
      particle: "#72C8D9",
      cyan: "#78D9F0",
      violet: "#8E8DE8",
      warm: "#F0C273",
      pink: "#D78CAE",
      eyeSurface: "#F3FFFC",
      eyeInk: "#173742",
    };
  }

  if (mood === "grumpy") {
    return {
      body: "#244A52",
      bodyTop: "#2D5960",
      bodyMiddle: "#173E46",
      bodyBottom: "#633C81",
      bodyDark: "#081E2A",
      glow: "#FF8B39",
      particle: "#FFB34D",
      cyan: "#42C6E8",
      violet: "#A35BFF",
      warm: "#FF8A32",
      pink: "#FF4D7C",
      eyeSurface: "#F8FFF9",
      eyeInk: "#112B37",
    };
  }

  if (
    mood === "excited"
    || mood === "dancing"
    || mood === "welcomeBack"
    || mood === "happy"
  ) {
    return {
      body: "#31E2A8",
      bodyTop: "#22F0C2",
      bodyMiddle: "#56D7FF",
      bodyBottom: "#8D65FF",
      bodyDark: "#053B4A",
      glow: "#9DFFE1",
      particle: "#F6B84A",
      cyan: "#49E4FF",
      violet: "#916CFF",
      warm: "#FFB92E",
      pink: "#FF67B0",
      eyeSurface: "#F7FFF9",
      eyeInk: "#06313B",
    };
  }

  if (mood === "hungry") {
    return {
      body: "#49D9A5",
      bodyTop: "#64E7B3",
      bodyMiddle: "#49D9D2",
      bodyBottom: "#A568F0",
      bodyDark: "#16433F",
      glow: "#FFBE55",
      particle: "#FF8F3C",
      cyan: "#4FE0F0",
      violet: "#A568F0",
      warm: "#FF9F32",
      pink: "#FF708D",
      eyeSurface: "#F9FFF4",
      eyeInk: "#173A34",
    };
  }

  return base;
}

function yumiPupilOffset(mood) {
  if (mood === "curious") {
    return {
      x: -5,
      y: -2,
    };
  }

  if (
    mood === "excited"
    || mood === "welcomeBack"
  ) {
    return {
      x: 4,
      y: -2,
    };
  }

  if (mood === "hungry") {
    return {
      x: 0,
      y: 6,
    };
  }

  if (
    mood === "sad"
    || mood === "lonely"
  ) {
    return {
      x: -3,
      y: 5,
    };
  }

  if (mood === "grumpy") {
    return {
      x: 4,
      y: 0,
    };
  }

  return {
    x: 0,
    y: 0,
  };
}

function addYumiImage(
  container,
  mood,
  width,
  height,
) {
  const side =
    Math.min(
      width,
      height,
    );

  const image =
    container.addImage(
      drawYumi(
        mood,
        side,
        side,
      ),
    );

  image.imageSize =
    new Size(
      side,
      side,
    );

  image.applyFittingContentMode();

  return image;
}

function drawYumi(
  mood,
  width,
  height,
) {
  const context =
    new DrawContext();

  context.size =
    new Size(
      width,
      height,
    );

  context.opaque = false;
  context.respectScreenScale = true;

  const scale =
    Math.min(
      width / 400,
      height / 400,
    );

  const offsetX =
    (
      width
      - 400 * scale
    ) / 2;

  const offsetY =
    (
      height
      - 400 * scale
    ) / 2;

  const pose =
    Math.floor(
      Date.now()
      / (
        10
        * 60
        * 1000
      ),
    ) % 4;

  function point(x, y) {
    return new Point(
      offsetX + x * scale,
      offsetY + y * scale,
    );
  }

  function ellipse(
    x,
    y,
    ellipseWidth,
    ellipseHeight,
  ) {
    return new Rect(
      offsetX + x * scale,
      offsetY + y * scale,
      ellipseWidth * scale,
      ellipseHeight * scale,
    );
  }

  function strokePath(
    path,
    color,
    lineWidth,
  ) {
    context.setStrokeColor(color);
    context.setLineWidth(
      lineWidth * scale,
    );
    context.addPath(path);
    context.strokePath();
  }

  function roundCap(
    x,
    y,
    diameter,
    color,
  ) {
    context.setFillColor(color);
    context.fillEllipse(
      ellipse(
        x - diameter / 2,
        y - diameter / 2,
        diameter,
        diameter,
      ),
    );
  }

  function star(
    x,
    y,
    radius,
    color,
  ) {
    const path =
      new Path();

    path.move(
      point(
        x,
        y - radius,
      ),
    );

    path.addLine(
      point(
        x + radius * 0.28,
        y - radius * 0.28,
      ),
    );

    path.addLine(
      point(
        x + radius,
        y,
      ),
    );

    path.addLine(
      point(
        x + radius * 0.28,
        y + radius * 0.28,
      ),
    );

    path.addLine(
      point(
        x,
        y + radius,
      ),
    );

    path.addLine(
      point(
        x - radius * 0.28,
        y + radius * 0.28,
      ),
    );

    path.addLine(
      point(
        x - radius,
        y,
      ),
    );

    path.addLine(
      point(
        x - radius * 0.28,
        y - radius * 0.28,
      ),
    );

    path.closeSubpath();

    context.setFillColor(color);
    context.addPath(path);
    context.fillPath();
  }

  const colors =
    yumiPaletteForMood(mood);

  context.setFillColor(
    new Color(
      colors.glow,
      0.16,
    ),
  );

  context.fillEllipse(
    ellipse(
      28,
      28,
      344,
      344,
    ),
  );

  const orbitColors = [
    new Color(
      colors.particle,
      0.66,
    ),
    new Color(
      colors.violet,
      0.50,
    ),
    new Color(
      colors.warm,
      0.44,
    ),
  ];

  const orbitRects = [
    [38, 102, 324, 168],
    [72, 70, 258, 260],
    [46, 146, 310, 112],
  ];

  orbitRects.forEach(
    function drawOrbit(item, index) {
      context.setStrokeColor(
        orbitColors[index],
      );

      context.setLineWidth(
        (
          index === 0
            ? 3.4
            : 2.2
        ) * scale,
      );

      context.strokeEllipse(
        ellipse(
          item[0]
            + (
              pose - 1
            ) * 2,
          item[1],
          item[2],
          item[3],
        ),
      );
    },
  );

  const trail =
    new Path();

  trail.move(
    point(
      52,
      106 + pose * 3,
    ),
  );

  trail.addLine(
    point(
      350,
      42 + pose * 2,
    ),
  );

  strokePath(
    trail,
    new Color(
      colors.warm,
      0.52,
    ),
    4,
  );

  context.setFillColor(
    new Color(
      colors.glow,
      0.22,
    ),
  );

  context.fillEllipse(
    ellipse(
      88,
      306,
      236,
      40,
    ),
  );

  const topArm =
    new Path();

  topArm.move(
    point(
      300,
      70,
    ),
  );

  topArm.addCurve(
    point(
      100,
      180,
    ),
    point(
      174,
      70,
    ),
    point(
      107,
      107,
    ),
  );

  const bottomArm =
    new Path();

  bottomArm.move(
    point(
      100,
      180,
    ),
  );

  bottomArm.addCurve(
    point(
      300,
      320,
    ),
    point(
      107,
      273,
    ),
    point(
      174,
      320,
    ),
  );

  const middleArm =
    new Path();

  middleArm.move(
    point(
      100,
      180,
    ),
  );

  middleArm.addLine(
    point(
      250,
      180,
    ),
  );

  const bodyPaths = [
    {
      path: topArm,
      start: [300, 70],
      end: [100, 180],
      body: colors.bodyTop,
      accent: colors.cyan,
    },
    {
      path: bottomArm,
      start: [100, 180],
      end: [300, 320],
      body: colors.bodyBottom,
      accent: colors.violet,
    },
    {
      path: middleArm,
      start: [100, 180],
      end: [250, 180],
      body: colors.bodyMiddle,
      accent: colors.warm,
    },
  ];

  bodyPaths.forEach(
    function drawBodySegment(
      segment,
      index,
    ) {
      strokePath(
        segment.path,
        new Color(
          colors.glow,
          0.24,
        ),
        72,
      );

      roundCap(
        segment.start[0],
        segment.start[1],
        72,
        new Color(
          colors.glow,
          0.24,
        ),
      );

      roundCap(
        segment.end[0],
        segment.end[1],
        72,
        new Color(
          colors.glow,
          0.24,
        ),
      );

      strokePath(
        segment.path,
        new Color(
          colors.bodyDark,
        ),
        58,
      );

      roundCap(
        segment.start[0],
        segment.start[1],
        58,
        new Color(
          colors.bodyDark,
        ),
      );

      roundCap(
        segment.end[0],
        segment.end[1],
        58,
        new Color(
          colors.bodyDark,
        ),
      );

      strokePath(
        segment.path,
        new Color(
          segment.body,
        ),
        47,
      );

      roundCap(
        segment.start[0],
        segment.start[1],
        47,
        new Color(
          segment.body,
        ),
      );

      roundCap(
        segment.end[0],
        segment.end[1],
        47,
        new Color(
          segment.body,
        ),
      );

      strokePath(
        segment.path,
        new Color(
          segment.accent,
          0.78,
        ),
        10,
      );

      strokePath(
        segment.path,
        new Color(
          "#FFFFFF",
          index === pose % 3
            ? 0.78
            : 0.42,
        ),
        4,
      );
    },
  );

  const antenna =
    new Path();

  antenna.move(
    point(
      268,
      74,
    ),
  );

  antenna.addCurve(
    point(
      322,
      34,
    ),
    point(
      292,
      52,
    ),
    point(
      306,
      42,
    ),
  );

  strokePath(
    antenna,
    new Color(
      colors.cyan,
      0.76,
    ),
    5,
  );

  context.setFillColor(
    new Color(
      colors.warm,
    ),
  );

  context.fillEllipse(
    ellipse(
      315,
      26,
      18,
      18,
    ),
  );

  const eyeRect =
    ellipse(
      245,
      140,
      80,
      80,
    );

  context.setFillColor(
    new Color(
      colors.eyeSurface,
    ),
  );

  context.fillEllipse(
    eyeRect,
  );

  if (mood === "sleeping") {
    const closedEye =
      new Path();

    closedEye.move(
      point(
        263,
        181,
      ),
    );

    closedEye.addCurve(
      point(
        307,
        181,
      ),
      point(
        276,
        195,
      ),
      point(
        294,
        195,
      ),
    );

    strokePath(
      closedEye,
      new Color(
        colors.eyeInk,
      ),
      8,
    );
  } else {
    const pupilOffset =
      yumiPupilOffset(mood);

    const poseOffsets = [
      [-4, 0],
      [2, -3],
      [5, 1],
      [-2, 3],
    ];

    context.setFillColor(
      new Color(
        colors.eyeInk,
      ),
    );

    context.fillEllipse(
      ellipse(
        280
          + pupilOffset.x
          + poseOffsets[pose][0],
        158
          + pupilOffset.y
          + poseOffsets[pose][1],
        28,
        28,
      ),
    );

    context.setFillColor(
      new Color(
        colors.cyan,
        0.76,
      ),
    );

    context.fillEllipse(
      ellipse(
        285
          + pupilOffset.x
          + poseOffsets[pose][0],
        163
          + pupilOffset.y
          + poseOffsets[pose][1],
        12,
        12,
      ),
    );

    context.setFillColor(
      new Color(
        "#FFFFFF",
      ),
    );

    context.fillEllipse(
      ellipse(
        296
          + pupilOffset.x
          + poseOffsets[pose][0],
        160
          + pupilOffset.y
          + poseOffsets[pose][1],
        9,
        9,
      ),
    );
  }

  context.setStrokeColor(
    new Color(
      colors.eyeInk,
    ),
  );

  context.setLineWidth(
    12 * scale,
  );

  context.strokeEllipse(
    eyeRect,
  );

  context.setStrokeColor(
    new Color(
      colors.violet,
      0.74,
    ),
  );

  context.setLineWidth(
    3.5 * scale,
  );

  context.strokeEllipse(
    ellipse(
      236,
      131,
      98,
      98,
    ),
  );

  const particlePositions = [
    [48, 276, 11, colors.warm],
    [350, 108, 13, colors.violet],
    [332, 286, 8, colors.cyan],
    [70, 82, 7, "#FFFFFF"],
    [346, 224, 6, colors.pink],
    [118, 42, 5, colors.cyan],
  ];

  particlePositions.forEach(
    function drawParticle(item, index) {
      const x =
        item[0]
        + (
          index % 2 === 0
            ? pose * 2
            : -pose * 2
        );

      const y =
        item[1]
        + (
          index % 3 - 1
        ) * pose;

      context.setFillColor(
        new Color(
          item[3],
          index % 2 === 0
            ? 0.90
            : 0.72,
        ),
      );

      context.fillEllipse(
        ellipse(
          x,
          y,
          item[2],
          item[2],
        ),
      );
    },
  );

  star(
    64 + pose * 3,
    60,
    10,
    new Color(
      colors.warm,
      0.94,
    ),
  );

  star(
    344 - pose * 3,
    334,
    8,
    new Color(
      colors.violet,
      0.86,
    ),
  );

  if (
    mood === "excited"
    || mood === "dancing"
    || mood === "happy"
    || mood === "welcomeBack"
  ) {
    star(
      336,
      64,
      15,
      new Color(
        colors.pink,
        0.92,
      ),
    );

    star(
      44,
      220,
      12,
      new Color(
        colors.cyan,
        0.90,
      ),
    );
  }

  return context.getImage();
}

function palette() {
  return {
    backgroundTop:
      new Color(
        "#061221",
        0.58,
      ),

    backgroundBottom:
      new Color(
        "#11183A",
        0.54,
      ),

    primary:
      new Color("#F3FDFF"),

    secondary:
      new Color(
        "#D4F4F8",
        0.76,
      ),

    tertiary:
      new Color(
        "#C6E9F0",
        0.56,
      ),

    card:
      new Color(
        "#03111B",
        0.74,
      ),

    cardText:
      new Color("#FFFFFF"),

    cardSecondary:
      new Color(
        "#E7F7F7",
        0.82,
      ),

    cardTertiary:
      new Color(
        "#BFE2E5",
        0.70,
      ),

    action:
      new Color(
        "#FFFFFF",
        0.16,
      ),

    actionPrimary:
      new Color(
        "#0A3440",
        0.82,
      ),

    actionSecondary:
      new Color(
        "#FFFFFF",
        0.18,
      ),

    cookie:
      new Color("#FF8A25"),

    offline:
      new Color("#FF9B52"),
  };
}

function normalizeWidgetFamily(
  family,
) {
  if (
    family === "small"
    || family === "medium"
    || family === "large"
  ) {
    return family;
  }

  if (
    family === "extraLarge"
  ) {
    return "large";
  }

  return "medium";
}

function normalizeBaseUrl(value) {
  const raw =
    safeString(
      value,
      500,
    ).replace(
      /\/+$/,
      "",
    );

  /*
   * Scriptable runs in JavaScriptCore, not a browser.
   * Validate the HTTPS origin without relying on the browser URL API.
   */
  const match =
    raw.match(
      /^https:\/\/([^\s/?#]+)(\/[^\s?#]*)?$/,
    );

  if (!match) {
    return "";
  }

  const host =
    match[1];

  const path =
    match[2] || "";

  if (
    !host
    || host.startsWith(".")
    || host.endsWith(".")
    || host.includes("..")
    || host.includes("@")
  ) {
    return "";
  }

  return (
    "https://"
    + host
    + path.replace(
        /\/+$/,
        "",
      )
  );
}

function joinUrl(
  baseUrl,
  path,
) {
  return (
    String(baseUrl)
      .replace(/\/+$/, "")
    + "/"
    + String(path)
      .replace(/^\/+/, "")
  );
}

function scriptableRunUrl() {
  return URLScheme.forRunningScript();
}

function isValidToken(value) {
  return (
    typeof value === "string"
    && value.startsWith("ensw_")
    && value.length >= 40
    && value.length <= 500
  );
}

function normalizeLanguage(value) {
  return (
    value === "english"
    || value
      === "traditional-chinese"
  )
    ? value
    : null;
}

function clampInteger(
  value,
  minimum,
  maximum,
  fallback,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.round(number),
    ),
  );
}

function safeTimestamp(value) {
  if (
    typeof value !== "string"
    || Number.isNaN(
      Date.parse(value),
    )
  ) {
    return "";
  }

  return value;
}

function safeString(
  value,
  maximumLength,
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength,
    );
}

function isRecord(value) {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function readKeychainValue(key) {
  try {
    if (!Keychain.contains(key)) {
      return "";
    }

    return Keychain.get(key);
  } catch {
    return "";
  }
}

function removeKeychainValue(key) {
  try {
    if (Keychain.contains(key)) {
      Keychain.remove(key);
    }
  } catch {
    // Nothing else to clean up.
  }
}

function readableError(error) {
  if (
    error
    && typeof error.message
      === "string"
    && error.message.trim()
  ) {
    return error.message.trim();
  }

  return "目前無法完成操作，請檢查網路與設定後再試一次。";
}

async function showMessage(
  title,
  message,
) {
  const alert =
    new Alert();

  alert.title = title;
  alert.message = message;
  alert.addAction("好");

  await alert.presentAlert();
}
