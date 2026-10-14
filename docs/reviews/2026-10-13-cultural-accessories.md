# Yumi 五國飾品擴充 — 2026-10-13

基準為 main a97b52d（Claude 的 Station 33 與首頁餅乾更新之後）。
工作分支：codex/yumi-cultural-accessories。正式資料庫與正式站尚未部署。

## 商品與穿戴

原有 77 件保留，每國新增 10 件，總共 127 件。新增 10 款單只耳環、5 款眉環、5 款項鍊、5 款帽子、5 款圍巾、10 款材質、5 款原創紀念郵票、5 款科技模組。

耳環、眉環、項鍊使用獨立欄位，可以和既有眼鏡、帽子、圍巾共同配戴。遵照最後確認，耳環均為單只，商品識別碼維持不變。耳環耳扣包住 C 型身體，吊飾接點位於耳扣前緣；眉環有環繞圓環的金屬扣；項鍊兩端有固定扣點。商店與首頁使用同一個 3D 配戴系統。

材質為手機可負擔的實體材質渲染；潟湖琉璃採釉面玻璃色澤，沒有昂貴的折射透射繪製。新增商品預先輸出 WebP 縮圖，目錄不逐件即時繪製 3D。中文商品名稱通過繁體轉換一致性測試，並提供英、法、義、西文。

## 檢查與驗證

- 舊版商店、能量獎勵、語言切換、複習與新配件針對性測試通過。
- 完整測試：234 檔通過；1,844 項通過、1 項頭像裁切測試逾時。該檔與目錄、幾何測試單獨重跑 20 項全過。
- 改為單只耳環後：目錄與新配件 13 項通過。
- TypeScript 與修改檔 ESLint 通過。
- 本機 PGlite 執行既有商店、帳本及新增商品遷移：既有餘額／持有商品不變、127 件價格資料、三種珠寶共同保存、重買不再次扣款、錯誤欄位及未擁有商品拒絕、學習字數不受影響。
- 實際瀏覽器檢查商品縮圖、繁體語言、試戴、正面／側面／背面切換。仍需使用者於真實 iPhone PWA 確認觸控與裝置效能；桌面試閱不能代替真機效能驗證。

## 上線順序

先套用 `20261014110247_yumi_shop_cultural_accessories.sql`，再部署前端，避免新版前端販售伺服器尚未認得的商品。此遷移只增加商品與合法欄位，不改餘額、學習資料、既有所有權或舊商品售價。試閱頁使用記憶體錢包，不會扣除真實餅乾。

## 日期來源

郵票為原創紀念設計，不是官方發行郵票複製品。

- 臺灣：10 月 10 日，[總統府](https://english.president.gov.tw/News/7226)。
- 美國：7 月 4 日，[USAGov](https://www.usa.gov/historical-documents)。
- 法國：7 月 14 日，[France Diplomatie](https://www.diplomatie.gouv.fr/fr/presse-et-ressources/decouvrir-et-informer/actualites/14-juillet-la-fete-qui-nous-rassemble)。
- 義大利：6 月 2 日，[總統府](https://www.quirinale.it/it/notizie/festa-repubblica-iniziative-per-80-anniversario)。
- 西班牙：10 月 12 日，[La Moncloa](https://www.lamoncloa.gob.es/lang/en/presidente/news/Paginas/2024/20241012-spain-national-day.aspx)。
