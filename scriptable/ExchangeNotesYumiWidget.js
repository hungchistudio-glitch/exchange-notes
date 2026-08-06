// Exchange Notes — Yumi iPhone Widget
//
// Run this script once inside the Scriptable app to configure:
// 1. Your deployed Exchange Notes URL.
// 2. The private token created in Exchange Notes Settings.
//
// The token is stored only in the iOS Keychain.
// The latest successful Widget response is cached locally for offline use.

const SCRIPT_VERSION = 1;
const SNAPSHOT_SCHEMA_VERSION = 1;

const KEYCHAIN_BASE_URL =
  "exchange-notes-yumi-widget-base-url-v1";

const KEYCHAIN_TOKEN =
  "exchange-notes-yumi-widget-token-v1";

const CACHE_FILE_NAME =
  "exchange-notes-yumi-widget-cache-v1.json";

const REQUEST_TIMEOUT_SECONDS = 8;
const REFRESH_INTERVAL_MINUTES = 30;
const MAX_WORDS = 12;

const fileManager =
  FileManager.local();

const cacheFilePath =
  fileManager.joinPath(
    fileManager.libraryDirectory(),
    CACHE_FILE_NAME,
  );

await main();

async function main() {
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

  const copy =
    widgetCopy(payload);

  const header =
    widget.addStack();

  header.layoutHorizontally();
  header.centerAlignContent();

  addYumiImage(
    header,
    payload.moodKey,
    51,
    35,
  );

  header.addSpacer();

  addProgressCapsule(
    header,
    payload,
    copy,
  );

  widget.addSpacer(7);

  const headline =
    widget.addText(
      payload.localizedText.headline
      || copy.yumi,
    );

  headline.font =
    Font.semiboldSystemFont(13);

  headline.textColor =
    palette().primary;

  headline.lineLimit = 2;
  headline.minimumScaleFactor = 0.8;

  widget.addSpacer(6);

  addPrimaryWordCard(
    widget,
    payload,
    {
      primarySize: 22,
      secondarySize: 12,
      compact: true,
    },
  );

  widget.addSpacer();

  addUpdateFooter(
    widget,
    model,
    copy,
    true,
  );

  widget.url =
    joinUrl(
      model.baseUrl,
      "/vocabulary",
    );

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

  const copy =
    widgetCopy(payload);

  const main =
    widget.addStack();

  main.layoutHorizontally();
  main.spacing = 13;

  const left =
    main.addStack();

  left.layoutVertically();
  left.size =
    new Size(132, 0);

  addYumiImage(
    left,
    payload.moodKey,
    78,
    53,
  );

  left.addSpacer(5);

  const headline =
    left.addText(
      payload.localizedText.headline
      || copy.yumi,
    );

  headline.font =
    Font.semiboldSystemFont(14);

  headline.textColor =
    palette().primary;

  headline.lineLimit = 2;
  headline.minimumScaleFactor = 0.78;

  left.addSpacer(4);

  const hint =
    left.addText(
      payload.localizedText.hint
      || copy.openApp,
    );

  hint.font =
    Font.systemFont(10);

  hint.textColor =
    palette().secondary;

  hint.lineLimit = 2;

  left.addSpacer();

  addProgressCapsule(
    left,
    payload,
    copy,
  );

  const right =
    main.addStack();

  right.layoutVertically();

  addPrimaryWordCard(
    right,
    payload,
    {
      primarySize: 25,
      secondarySize: 13,
      compact: false,
    },
  );

  right.addSpacer();

  addUpdateFooter(
    right,
    model,
    copy,
    false,
  );

  widget.addSpacer(9);

  addActionRow(
    widget,
    model.baseUrl,
    copy,
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

  const copy =
    widgetCopy(payload);

  const header =
    widget.addStack();

  header.layoutHorizontally();
  header.centerAlignContent();

  addYumiImage(
    header,
    payload.moodKey,
    90,
    61,
  );

  header.addSpacer(12);

  const heading =
    header.addStack();

  heading.layoutVertically();

  const headline =
    heading.addText(
      payload.localizedText.headline
      || copy.yumi,
    );

  headline.font =
    Font.boldSystemFont(17);

  headline.textColor =
    palette().primary;

  headline.lineLimit = 2;

  heading.addSpacer(4);

  const hint =
    heading.addText(
      payload.localizedText.hint
      || copy.openApp,
    );

  hint.font =
    Font.systemFont(11);

  hint.textColor =
    palette().secondary;

  hint.lineLimit = 2;

  heading.addSpacer(7);

  addProgressCapsule(
    heading,
    payload,
    copy,
  );

  widget.addSpacer(13);

  const sectionTitle =
    widget.addText(
      copy.latestWords,
    );

  sectionTitle.font =
    Font.semiboldSystemFont(11);

  sectionTitle.textColor =
    palette().tertiary;

  widget.addSpacer(7);

  addWordList(
    widget,
    payload,
    model.baseUrl,
    5,
  );

  widget.addSpacer();

  addUpdateFooter(
    widget,
    model,
    copy,
    false,
  );

  widget.addSpacer(10);

  addActionRow(
    widget,
    model.baseUrl,
    copy,
  );

  return widget;
}

function createBaseWidget(
  model,
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

  if (family === "small") {
    widget.setPadding(
      13,
      13,
      12,
      13,
    );
  } else if (family === "large") {
    widget.setPadding(
      17,
      18,
      16,
      18,
    );
  } else {
    widget.setPadding(
      14,
      16,
      13,
      16,
    );
  }

  widget.refreshAfterDate =
    new Date(
      Date.now()
      + REFRESH_INTERVAL_MINUTES
        * 60
        * 1000,
    );

  widget.url =
    joinUrl(
      model.baseUrl,
      "/vocabulary",
    );

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
      ? joinUrl(
          model.baseUrl,
          "/profile",
        )
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

function addYumiImage(
  container,
  mood,
  width,
  height,
) {
  const image =
    container.addImage(
      drawYumi(
        mood,
        width * 2,
        height * 2,
      ),
    );

  image.imageSize =
    new Size(
      width,
      height,
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

  const facePath =
    new Path();

  facePath.addRoundedRect(
    new Rect(
      2,
      2,
      width - 4,
      height - 4,
    ),
    height * 0.34,
    height * 0.34,
  );

  context.addPath(
    facePath,
  );

  context.setFillColor(
    new Color(
      "#FFFDF7",
    ),
  );

  context.fillPath();

  context.setStrokeColor(
    new Color(
      "#000000",
      0.06,
    ),
  );

  context.setLineWidth(2);
  context.addPath(facePath);
  context.strokePath();

  const eyeWidth =
    width * 0.115;

  const eyeHeight =
    height * 0.39;

  const leftX =
    width * 0.295;

  const rightX =
    width * 0.59;

  const eyeY =
    height * 0.28;

  context.setStrokeColor(
    new Color("#16130F"),
  );

  context.setFillColor(
    new Color("#16130F"),
  );

  if (
    mood === "sleeping"
  ) {
    drawClosedEye(
      context,
      leftX,
      eyeY + eyeHeight * 0.45,
      eyeWidth,
    );

    drawClosedEye(
      context,
      rightX,
      eyeY + eyeHeight * 0.45,
      eyeWidth,
    );
  } else {
    context.fillEllipse(
      new Rect(
        leftX,
        eyeY,
        eyeWidth,
        eyeHeight,
      ),
    );

    context.fillEllipse(
      new Rect(
        rightX,
        eyeY,
        eyeWidth,
        eyeHeight,
      ),
    );

    context.setFillColor(
      new Color(
        "#FFFFFF",
        0.9,
      ),
    );

    const highlight =
      Math.max(
        3,
        eyeWidth * 0.22,
      );

    context.fillEllipse(
      new Rect(
        leftX
          + eyeWidth * 0.2,
        eyeY
          + eyeHeight * 0.18,
        highlight,
        highlight,
      ),
    );

    context.fillEllipse(
      new Rect(
        rightX
          + eyeWidth * 0.2,
        eyeY
          + eyeHeight * 0.18,
        highlight,
        highlight,
      ),
    );
  }

  if (
    mood === "grumpy"
    || mood === "hungry"
  ) {
    drawBrow(
      context,
      leftX - 2,
      eyeY - 5,
      eyeWidth + 5,
      true,
    );

    drawBrow(
      context,
      rightX - 2,
      eyeY - 5,
      eyeWidth + 5,
      false,
    );
  }

  if (
    mood === "sad"
    || mood === "lonely"
  ) {
    context.setFillColor(
      new Color(
        "#77B9E8",
        0.9,
      ),
    );

    context.fillEllipse(
      new Rect(
        rightX
          + eyeWidth * 0.45,
        eyeY
          + eyeHeight * 0.85,
        eyeWidth * 0.34,
        eyeHeight * 0.38,
      ),
    );
  }

  if (
    mood === "excited"
    || mood === "dancing"
    || mood === "welcomeBack"
  ) {
    context.setFillColor(
      new Color(
        "#F2B84B",
        0.95,
      ),
    );

    context.fillEllipse(
      new Rect(
        width * 0.12,
        height * 0.18,
        7,
        7,
      ),
    );

    context.fillEllipse(
      new Rect(
        width * 0.82,
        height * 0.12,
        9,
        9,
      ),
    );

    context.fillEllipse(
      new Rect(
        width * 0.88,
        height * 0.58,
        6,
        6,
      ),
    );
  }

  if (
    mood === "hungry"
  ) {
    context.setStrokeColor(
      new Color("#16130F"),
    );

    context.setLineWidth(3);

    const mouth =
      new Path();

    mouth.addEllipse(
      new Rect(
        width * 0.46,
        height * 0.71,
        width * 0.08,
        height * 0.12,
      ),
    );

    context.addPath(mouth);
    context.strokePath();
  }

  return context.getImage();
}

function drawClosedEye(
  context,
  x,
  y,
  width,
) {
  const path =
    new Path();

  path.move(
    new Point(
      x,
      y,
    ),
  );

  path.addQuadCurve(
    new Point(
      x + width,
      y,
    ),
    new Point(
      x + width / 2,
      y + width * 0.35,
    ),
  );

  context.setLineWidth(
    Math.max(
      3,
      width * 0.18,
    ),
  );

  context.addPath(path);
  context.strokePath();
}

function drawBrow(
  context,
  x,
  y,
  width,
  left,
) {
  const path =
    new Path();

  path.move(
    new Point(
      left
        ? x
        : x + width,
      y,
    ),
  );

  path.addLine(
    new Point(
      left
        ? x + width
        : x,
      y + 6,
    ),
  );

  context.setLineWidth(3);
  context.addPath(path);
  context.strokePath();
}

function addProgressCapsule(
  container,
  payload,
  copy,
) {
  const colors =
    palette();

  const capsule =
    container.addStack();

  capsule.layoutHorizontally();
  capsule.centerAlignContent();

  capsule.backgroundColor =
    colors.card;

  capsule.cornerRadius = 10;

  capsule.setPadding(
    5,
    8,
    5,
    8,
  );

  const cookie =
    capsule.addText("●");

  cookie.font =
    Font.boldSystemFont(9);

  cookie.textColor =
    colors.cookie;

  capsule.addSpacer(4);

  const progress =
    capsule.addText(
      payload.cookieCount
      + " / "
      + payload.cookieGoal,
    );

  progress.font =
    Font.semiboldSystemFont(10);

  progress.textColor =
    colors.primary;

  progress.lineLimit = 1;

  if (
    copy.cookie
    && payload.localizedText.cookieUnit
  ) {
    capsule.addSpacer(3);

    const unit =
      capsule.addText(
        payload.localizedText.cookieUnit,
      );

    unit.font =
      Font.systemFont(8);

    unit.textColor =
      colors.secondary;
  }

  return capsule;
}

function addPrimaryWordCard(
  container,
  payload,
  options,
) {
  const colors =
    palette();

  const word =
    firstDisplayWord(
      payload,
    );

  const card =
    container.addStack();

  card.layoutVertically();

  card.backgroundColor =
    colors.card;

  card.cornerRadius =
    options.compact
      ? 14
      : 17;

  card.setPadding(
    options.compact ? 8 : 11,
    options.compact ? 9 : 12,
    options.compact ? 8 : 11,
    options.compact ? 9 : 12,
  );

  const primary =
    card.addText(
      word.primary
      || payload.localizedText.emptyWord
      || "Add a word",
    );

  primary.font =
    Font.boldSystemFont(
      options.primarySize,
    );

  primary.textColor =
    colors.primary;

  primary.lineLimit =
    options.compact
      ? 1
      : 2;

  primary.minimumScaleFactor = 0.55;

  if (word.secondary) {
    card.addSpacer(3);

    const secondary =
      card.addText(
        word.secondary,
      );

    secondary.font =
      Font.semiboldSystemFont(
        options.secondarySize,
      );

    secondary.textColor =
      colors.secondary;

    secondary.lineLimit = 1;
    secondary.minimumScaleFactor = 0.65;
  }

  if (
    !options.compact
    && word.pronunciation
  ) {
    card.addSpacer(4);

    const pronunciation =
      card.addText(
        word.pronunciation,
      );

    pronunciation.font =
      Font.systemFont(9);

    pronunciation.textColor =
      colors.tertiary;

    pronunciation.lineLimit = 1;
    pronunciation.minimumScaleFactor = 0.7;
  }

  return card;
}

function addWordList(
  container,
  payload,
  baseUrl,
  limit,
) {
  const words =
    payload.words.slice(
      0,
      limit,
    );

  if (words.length === 0) {
    const empty =
      container.addStack();

    empty.backgroundColor =
      palette().card;

    empty.cornerRadius = 16;

    empty.setPadding(
      13,
      13,
      13,
      13,
    );

    const text =
      empty.addText(
        payload.localizedText.emptyWord
        || "Add your first word",
      );

    text.font =
      Font.semiboldSystemFont(13);

    text.textColor =
      palette().secondary;

    empty.url =
      joinUrl(
        baseUrl,
        "/vocabulary",
      );

    return;
  }

  words.forEach(
    function addWord(
      word,
      index,
    ) {
      const display =
        displayWord(
          word,
          payload.learningLanguage,
        );

      const row =
        container.addStack();

      row.layoutHorizontally();
      row.centerAlignContent();

      row.backgroundColor =
        palette().card;

      row.cornerRadius = 13;

      row.setPadding(
        8,
        10,
        8,
        10,
      );

      row.url =
        joinUrl(
          baseUrl,
          "/vocabulary",
        );

      const number =
        row.addText(
          twoDigitNumber(
            index + 1,
          ),
        );

      number.font =
        Font.semiboldSystemFont(9);

      number.textColor =
        palette().tertiary;

      row.addSpacer(9);

      const textColumn =
        row.addStack();

      textColumn.layoutVertically();

      const primary =
        textColumn.addText(
          display.primary
          || display.secondary,
        );

      primary.font =
        Font.semiboldSystemFont(13);

      primary.textColor =
        palette().primary;

      primary.lineLimit = 1;

      if (display.secondary) {
        textColumn.addSpacer(1);

        const secondary =
          textColumn.addText(
            display.secondary,
          );

        secondary.font =
          Font.systemFont(9);

        secondary.textColor =
          palette().secondary;

        secondary.lineLimit = 1;
      }

      row.addSpacer();

      if (display.pronunciation) {
        const pronunciation =
          row.addText(
            display.pronunciation,
          );

        pronunciation.font =
          Font.systemFont(8);

        pronunciation.textColor =
          palette().tertiary;

        pronunciation.lineLimit = 1;
      }

      if (
        index
        < words.length - 1
      ) {
        container.addSpacer(5);
      }
    },
  );
}

function addActionRow(
  container,
  baseUrl,
  copy,
) {
  const row =
    container.addStack();

  row.layoutHorizontally();
  row.spacing = 7;

  addActionPill(
    row,
    copy.addWord,
    "plus",
    joinUrl(
      baseUrl,
      "/vocabulary",
    ),
  );

  addActionPill(
    row,
    copy.camera,
    "camera",
    joinUrl(
      baseUrl,
      "/capture",
    ),
  );

  addActionPill(
    row,
    copy.review,
    "checkmark.circle",
    joinUrl(
      baseUrl,
      "/review",
    ),
  );
}

function addActionPill(
  container,
  label,
  symbolName,
  url,
) {
  const pill =
    container.addStack();

  pill.layoutHorizontally();
  pill.centerAlignContent();

  pill.backgroundColor =
    palette().action;

  pill.cornerRadius = 12;

  pill.setPadding(
    7,
    9,
    7,
    9,
  );

  pill.url = url;

  const symbol =
    SFSymbol.named(
      symbolName,
    );

  const icon =
    pill.addImage(
      symbol.image,
    );

  icon.imageSize =
    new Size(
      11,
      11,
    );

  icon.tintColor =
    palette().primary;

  pill.addSpacer(4);

  const text =
    pill.addText(label);

  text.font =
    Font.semiboldSystemFont(9);

  text.textColor =
    palette().primary;

  text.lineLimit = 1;
  text.minimumScaleFactor = 0.7;

  return pill;
}

function addUpdateFooter(
  container,
  model,
  copy,
  compact,
) {
  const footer =
    container.addStack();

  footer.layoutHorizontally();
  footer.centerAlignContent();

  if (
    model.source === "cache"
  ) {
    const offline =
      footer.addText(
        copy.offline,
      );

    offline.font =
      Font.semiboldSystemFont(
        compact ? 8 : 9,
      );

    offline.textColor =
      palette().offline;

    footer.addSpacer(5);
  }

  const updated =
    footer.addText(
      relativeTimestamp(
        model.snapshot.updatedAt,
        copy,
      ),
    );

  updated.font =
    Font.systemFont(
      compact ? 8 : 9,
    );

  updated.textColor =
    palette().tertiary;

  updated.lineLimit = 1;

  return footer;
}

function firstDisplayWord(payload) {
  const first =
    payload.words[0]
    || {
      englishWord:
        payload.englishWord,
      traditionalChineseWord:
        payload.traditionalChineseWord,
      pinyin:
        payload.pinyin,
      zhuyin:
        payload.zhuyin,
    };

  return displayWord(
    first,
    payload.learningLanguage,
  );
}

function displayWord(
  word,
  learningLanguage,
) {
  const learningEnglish =
    learningLanguage
      === "english";

  const primary =
    learningEnglish
      ? word.englishWord
      : word.traditionalChineseWord;

  const secondary =
    learningEnglish
      ? word.traditionalChineseWord
      : word.englishWord;

  const pronunciation =
    learningEnglish
      ? ""
      : word.zhuyin
        || word.pinyin
        || "";

  return {
    primary:
      safeString(
        primary,
        160,
      ),

    secondary:
      safeString(
        secondary,
        160,
      ),

    pronunciation:
      safeString(
        pronunciation,
        240,
      ),
  };
}

function widgetCopy(payload) {
  const traditionalChinese =
    payload.interfaceLanguage
      === "traditional-chinese";

  if (traditionalChinese) {
    return {
      yumi: "Yumi",
      cookie: "餅乾",
      latestWords: "最新單字",
      addWord: "新增單字",
      camera: "相機",
      review: "複習",
      offline: "離線快取",
      justNow: "剛剛更新",
      minutesAgo: "{count} 分鐘前",
      hoursAgo: "{count} 小時前",
      daysAgo: "{count} 天前",
      openApp: "開啟 Exchange Notes",
    };
  }

  return {
    yumi: "Yumi",
    cookie: "cookies",
    latestWords: "Latest words",
    addWord: "Add word",
    camera: "Camera",
    review: "Review",
    offline: "Offline cache",
    justNow: "Updated now",
    minutesAgo: "{count}m ago",
    hoursAgo: "{count}h ago",
    daysAgo: "{count}d ago",
    openApp: "Open Exchange Notes",
  };
}

function relativeTimestamp(
  value,
  copy,
) {
  const timestamp =
    Date.parse(value);

  if (
    Number.isNaN(timestamp)
  ) {
    return copy.justNow;
  }

  const elapsed =
    Math.max(
      0,
      Date.now() - timestamp,
    );

  const minutes =
    Math.floor(
      elapsed / 60000,
    );

  if (minutes < 1) {
    return copy.justNow;
  }

  if (minutes < 60) {
    return copy.minutesAgo.replace(
      "{count}",
      String(minutes),
    );
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return copy.hoursAgo.replace(
      "{count}",
      String(hours),
    );
  }

  const days =
    Math.floor(
      hours / 24,
    );

  return copy.daysAgo.replace(
    "{count}",
    String(days),
  );
}

function palette() {
  return {
    backgroundTop:
      Color.dynamic(
        new Color("#FBF7EE"),
        new Color("#1A1815"),
      ),

    backgroundBottom:
      Color.dynamic(
        new Color("#F2E9D9"),
        new Color("#11100E"),
      ),

    primary:
      Color.dynamic(
        new Color("#17130F"),
        new Color("#FFF9ED"),
      ),

    secondary:
      Color.dynamic(
        new Color("#17130F", 0.58),
        new Color("#FFF9ED", 0.64),
      ),

    tertiary:
      Color.dynamic(
        new Color("#17130F", 0.38),
        new Color("#FFF9ED", 0.42),
      ),

    card:
      Color.dynamic(
        new Color("#FFFFFF", 0.72),
        new Color("#FFFFFF", 0.08),
      ),

    action:
      Color.dynamic(
        new Color("#FFFFFF", 0.82),
        new Color("#FFFFFF", 0.11),
      ),

    cookie:
      new Color("#D79B35"),

    offline:
      new Color("#C46F35"),
  };
}

function twoDigitNumber(value) {
  const number =
    Math.max(
      0,
      Math.round(
        Number(value) || 0,
      ),
    );

  return number < 10
    ? "0" + number
    : String(number);
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
