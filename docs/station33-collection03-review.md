# Station 33 第 03 系列試閱

狀態：本機試閱；尚未合併、部署或套用資料庫遷移。所有價格皆為提案。

新增 57 件：五國各 5 件、暗黑科技 12 件、身體材質 20 件。既有 163 件商品與購買紀錄保持不變。

試閱網址：`/yumi-shop-review?collection=collection03&mode=cosmic`。此頁有 3,300 枚模擬餅乾；重新載入即重設，不影響真實餘額。

## 價格提案

|商品|系列|位置|餅乾|
|---|---|---|---:|
|花窗格單耳環|tw|earrings|36|
|山海車票胸針|tw|pin|27|
|芒果雪冰補給杯|tw|mouth|30|
|粽葉摺包項鍊|tw|necklace|42|
|夜市摺棚帽|tw|head|45|
|黑膠唱片單耳環|us|earrings|36|
|公路奶昔補給杯|us|mouth|30|
|都會階梯項鍊|us|necklace|42|
|絎縫遠航兜帽|us|head|45|
|峽谷觀測郵票|us|pin|27|
|可麗露鐘形單耳環|fr|earrings|36|
|河岸書攤吊飾|fr|charm|39|
|建築工坊高領|fr|neck|36|
|地鐵弧門眉環|fr|brow|30|
|貝殼蛋糕補給|fr|mouth|30|
|蝴蝶麵單耳環|it|earrings|36|
|月灣貢多拉吊飾|it|charm|39|
|節慶麵包補給塊|it|mouth|30|
|拱廊石刻眉環|it|brow|30|
|剪裁八片帽|it|head|45|
|響板單耳環|es|earrings|36|
|橙花小枝項鍊|es|necklace|42|
|小食串補給|es|mouth|30|
|日晷觀測胸針|es|pin|27|
|暮色短披肩|es|neck|36|
|黑鈦音叉單耳環|basic|earrings|42|
|記憶匣眉環|basic|brow|36|
|煙晶穩像單眼鏡|basic|eyewear|48|
|折翼通訊冠|basic|head|51|
|碳纖維散熱領|basic|neck|42|
|校驗核心項鍊|basic|necklace|48|
|磁懸浮單耳環|basic|earrings|42|
|相位橋眉環|basic|brow|36|
|奇點封印胸針|basic|pin|33|
|異星探針艙吊飾|basic|charm|45|
|蝕刻分瞳|basic|pupil|27|
|遙測環虹膜|basic|iris|33|
|墨滴霧瓷|basic|material|60|
|杏霧開片釉|basic|material|60|
|群青窯變|basic|material|60|
|粉霧丁香瓷|basic|material|60|
|鎢灰磨光|basic|material|69|
|深海陽極金屬|basic|material|69|
|霜刻鉑金|basic|material|69|
|油膜紫鈦|basic|material|69|
|煙石英|basic|material|75|
|北冰海玻璃|basic|material|75|
|玫瑰果凍晶|basic|material|75|
|檸檬乳光晶|basic|material|75|
|青金細脈|basic|material|69|
|苔紋蛇紋石|basic|material|69|
|赤砂碧玉|basic|material|69|
|雪點黑曜石|basic|material|69|
|石墨編織碳|basic|material|63|
|沙丘麂皮|basic|material|63|
|夜李絲絨|basic|material|63|
|銀礫複合殼|basic|material|63|

## 材質與動態

玻璃系列採透亮塗層外觀，不採螢幕空間折射，避免額外整場渲染。礦石、陶瓷、金屬與複合材質各有固定種子的紋理。陽極金屬有虹彩，麂皮與絲絨有絨面反光。

微動僅限指定的暗黑科技零件，使用現有場景迴圈；減少動態效果會固定到靜止狀態。所有耳環為單件。

## 2026-10-20 試閱驗證

最新正式建置的本機服務：

- Cosmic：http://127.0.0.1:3051/yumi-shop-review?collection=collection03&mode=cosmic
- 一般模式：http://127.0.0.1:3051/yumi-shop-review?collection=collection03&mode=standard

以上網址僅適用這台 Mac。試閱餘額為記憶體中的模擬資料，重新載入即重設。

已完成型別檢查、正式 Webpack 建置、全專案 ESLint（零錯誤，12 項既有測試警告）。最後針對商品、穿戴、語言切換的 5 個測試檔共 23 項通過。另修正語言選單在 React StrictMode 下持續顯示載入中的生命週期問題，補上回歸測試。

瀏覽器操作確認：57 件逐項試穿、各系列數量、正面／側面／背面、拖曳旋轉、模擬購買扣款、五語切換、390 × 844 版面無水平溢出；未發現執行期錯誤。

最新正式建置以本機 Chrome、390 × 844 視窗取樣：原始造型與暗黑全套造型各 115 個幀間隔，兩者中位數 16.7ms、P95 16.8ms，取樣中沒有超過 50ms 的間隔。這是桌面瀏覽器的有限取樣，不代表 iPhone 實機或所有裝置的效能保證；尚待實機確認。

本輪未變更正式資料庫，未合併至 main，未部署。價格與視覺試閱確認後才進行上線。

最終完整回歸：`vitest run --maxWorkers=2`，264 個測試檔、2,138 項測試全部通過（460.45 秒）。前一輪同時執行建置造成的逾時已在本次完整重跑中排除。

## 發布核准

2026-10-20 使用者核准合併上線與以上價格。商品遷移已套用並核對：共 220 件，其中第 03 系列 57 件。正式記錄版本為 20261021003546；本機試閱段落保留作驗證紀錄。
