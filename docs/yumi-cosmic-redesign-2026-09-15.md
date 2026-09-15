# Yumi Cosmic 視覺改造與驗證

日期：2026-09-15

## 設計決定

使用者確認完整更新 Cosmic mode，保留所有既有功能；採用深黑底、粉紫柔光、薄荷與藍色卡片，以及適合多語閱讀的科技感字體。

參考來源為使用者提供的 2026-09-14 截圖與 13.7 秒螢幕錄影。參考中的文字只作為設計內容，沒有被當作操作指令。吸收圓形主角、柔光卡片、細刻度、圓形控制與局部掃描提示；沒有搬用健康/GPS數據或複製他人的圖像。

- 底色 `#08090b`；正文 `#f5f2f0`；表面 `#17171c` / `#202026`。
- 薄荷 `#bce7d7`、粉紫 `#e5add2`、藍 `#809cf4`、暖金 `#e8ce8c`。
- 所有既有 Cosmic 色彩變數保留，另補齊單字卡使用的 legacy surface 變數。
- 正文沿用 Geist 與明確的 CJK 字形 fallback；數字使用等寬節奏。IPA、注音保留原有字型系統。
- 360px 以下，首頁六個入口自動排為兩欄卡片，避免長翻譯在圓環上重疊。
- 搜尋區移除閒置掃描與背景模糊，實際辨識時仍顯示掃描提示。
- 停止或減少裝飾動態時，仍保留操作狀態與數值。

## 功能盤點：27 個登入後路由

| 功能群 | 保留的操作 |
| --- | --- |
| 首頁 | 六個路由入口、收藏／待複習／語言讀值、文字／語音／相機搜尋、快速建立與最近筆記 |
| 單字與單字集 | 查詢、語言／狀態篩選、排序、清單／卡片、展開、編輯、發音、收藏、分享、刪除與集合管理 |
| Yumi | 心情、成長、每日進度、選單五項操作、點擊／拖曳餵食、排隊與取消還原 |
| 複習 | 待複習／全部、語言、揭曉、發音、評分、重試與完成 |
| 筆記 | 多語原文、建立、搜尋、本人／分享筆記、解讀、朗讀、分享／撤銷、另存與刪除 |
| Discover | 新聞分類、重新整理、詳情、朗讀語言／速度、儲存單字／筆記、分享、傳送與隱藏 |
| 訊息與朋友 | 未讀、搜尋、封存、靜音、邀請、即時狀態、Yumi 解讀、回覆提示、圖片／字卡／新聞、好友 ID／QR |
| 掃描 | 選圖／相機、圖片品質、目標語言、辨識、重試，以及原有 capture/PDF 流程 |
| 個人與設定 | 個人資料、語言、每日目標、字級、模式、發音、提醒、裝置、widget、導覽與登出 |
| 發音訓練 | listen、speak、rhythm、words、sounds、unit、train、review |

資料庫、驗證、API與資料儲存流程未因視覺改造而替換。新增的錯誤處理只影響進度顯示；筆記日期調整只讓伺服器初始畫面與瀏覽器接合時不因語系／時區不同而重繪，最終日期仍依讀者的本機設定。

## 修正的細節

1. 統計讀取拒絕時結束 loading、顯示既有翻譯錯誤訊息，五項數據保留破折號。
2. Yumi 卡片裝飾改放內縮背景，保留原始全寬互動邊界。
3. 提高空托盤、提示與摘要文字對比。
4. 搜尋按鈕與主要輸入模式保留至少44px操作區；鍵盤焦點可見。
5. 筆記視窗使用深色遮罩，避免黑白色彩反轉後變成亮色遮罩。
6. 多語頁首可換行；200%字級測試不產生橫向溢位。
7. 筆記日期延至客戶端顯示，修正 `Sep 15`／`15 Sept` 的 hydration mismatch。

## 驗證與限制

- 全套 Vitest：131 個檔案、1,039 個測試通過（`npm test -- --maxWorkers=2`）。
- 新增筆記日期接合／無效日期測試：2 個通過；相關筆記首頁測試一起通過。
- 全套 ESLint：0 error；12 個未修改的 `tests/aiDailyQuota.test.ts` unused-variable warnings。
- 正式 Next.js build、TypeScript、CSS parse 與 git diff whitespace 檢查。
- 瀏覽器檢查：390px／320px 首頁、六入口與標籤範圍、進度卡、五語筆記、彈出視窗、標準模式配色；390px的200%字級無橫向溢位。
- 進度數據讀取失敗、Yumi 餵食與取消、相機層級、路由轉場、單字互動及多語邏輯另有自動測試覆蓋。
- 本機使用未登入預覽；未以真實帳號進行遠端寫入、相機／麥克風硬體、推播或 iPhone 實機驗證。沒有部署至正式站。

## 本機檢視

- `/cosmic-yumi-review`：真實首頁元件，未登入狀態。
- `/cosmic-surfaces-review`：真實共用元件、清楚標記的測試筆記、暫時字級／配色控制與可操作視窗。

兩個頁面皆使用 `reviewRouteOnly()`，只在 development 或明確標記的 preview 環境開放。預覽控制不儲存帳號偏好，離開頁面會還原暫時的顯示設定。

## 架構收斂與除錯（第二輪）

第一輪的改造是疊在舊設計上的覆蓋層：同一個選擇器在檔案上下各寫一次，後面那份贏。這一輪把它壓平。

### 重複選擇器

`OmniLexiconConsole.module.css` 的 `.mode` 在第 237 行設 `border-radius: 12px`，檔尾再寫一次 `999px`；`.mode[data-active]`、`.console[data-state="scanning"] .beam`、`.bracket` 同樣各有兩份。`app/cosmic.css` 的 `.cosmic-panel`、`.cosmic-header h1` 也是。七組全部合併回原規則，舊值不再隨版本送出。

`CommandDeck.module.css` 兩個 `@media (max-width: 360px)` 併為一個；其中 `.nodeLink { width: 4.6rem }` 已被同區塊的 `width: 100%` 蓋掉，一併移除。

`YumiCompanion.module.css` 的 `.section::after` 與 `LearningCore.module.css` 的 `.core[data-state="attracted"] .chamber` 也各有一組互相覆蓋，但兩者早於這次改造，且都沒有 `[data-cosmic]` 限定——動它們會改到標準模式，因此留著。

### 色彩收進 token

新表面色原本直接寫死在規則裡，其中六個是既有 token 的原值重寫：`#1c1a21` 就是 `--en-surface`、`#1b191f` 就是 `--modal-surface`、`#403940` 就是 `--modal-line`、`#08090b` 就是 `--background`、`#242129` 就是 `--msg-surface-soft`、`#26232c` 就是 `--en-surface-secondary`。調色會只改一半。

改為：新增一組 `--cosmic-surface-*`／`--cosmic-hairline*` token，舊名（`--en-surface`、`--modal-surface`…）指向新 token，`cosmic.css` 的 token 區之外不再出現任何裸 hex。`ProgressHud.module.css` 的三個底色改用 `--cosmic-cyan` / `--cosmic-violet` / `--cosmic-amber`。

### 死碼

`OmniLexiconConsole` 的四個角框與六顆浮塵被新樣式關掉，但 DOM 仍每次渲染十個看不見的節點，CSS 也留著。連同早已無人引用的 18 個 class 一併移除：樣式表 580 → 263 行。

### 刻度環（真正的 bug）

量測顯示刻度環與六個入口副標直接重疊——「0 saved」距圓心 94–108px，刻度環在 96–102px；同時它與既有的 `.fieldInner` 環幾乎同半徑。

改為以 Yumi 圓臉與標籤內緣之間的空隙定位，遮罩改用 `closest-side`（百分比對半徑而非對角線）。但空隙不隨版面等比縮放：Yumi 跟著容器長，標籤是 rem。繁體中文在大字級會換成兩行，412px 時反而短 2px。

媒體查詢裡的 `rem` 固定為瀏覽器初始的 16px，讀不到文件實際根字級，因此改用 `html[data-app-font-size]` 分三段設門檻（small 372px／medium 424px／large 504px，約各為該字級根值的 26.5 倍）。門檻以下不畫刻度。

實測五語系 × 三字級在各自門檻的最小餘隙：繁中 large@504 為 5px、繁中 medium@424 為 5px、繁中 small@372 為 4px、義大利文 medium@424 為 7px、法文 large@504 為 6px；各寬度皆無橫向溢位。

### 空狀態

尚未複習過時，正確率算出 0%、記憶保留回退為 100%，並排成一句對還沒開始的人下的判語。兩張比率卡在第一次複習之前顯示破折號；每日目標與兩個計數是真實數字，照常顯示。新增測試涵蓋此情形。

### 驗證

`tsc` 乾淨、`next build` 通過 57 頁、Vitest 133 檔 1,051 測試全過、ESLint 0 error（12 個未修改的既有 warning）。`next-env.d.ts` 的 `.next/dev/types` 變動是 dev server 產生的暫存差異，已還原，未進入提交。
