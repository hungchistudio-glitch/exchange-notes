# Exchange Notes：正式入口與 Google 品牌發布

## 已核對的設定

- 正式品牌名稱：Exchange Notes（使用者已確認）。
- 唯一對外正式入口：https://exchange-notes-app.vercel.app
- Google JavaScript origins 截圖包含正式入口、localhost:3000，以及兩個長版 Vercel 別名。
- Google redirect URI：https://svfcbtdrmzefzcymolld.supabase.co/auth/v1/callback
- Google Branding 截圖仍為 Testing。尚未完成品牌驗證與發布。
- 首頁：https://exchange-notes-app.vercel.app
- 隱私說明：https://exchange-notes-app.vercel.app/privacy。現有內容明確標示為公開前草案。
- 目前沒有正式服務條款頁面。

## 本次程式變更

三個已確認的舊正式 host 在一般 GET/HEAD 頁面請求時，轉到正式入口並保留路徑和查詢參數：

- v0-language-exchange-app-bychi.vercel.app
- exchange-notes-app-hungchistudio-7883s-projects.vercel.app
- exchange-notes-app-git-main-hungchistudio-7883s-projects.vercel.app

使用 307，便於必要時回復，避免瀏覽器長期記住轉址。登入回呼、API、修改資料的請求和靜態資源不跨站搬移。其他預覽分支和 localhost 維持原有行為。不同 host 的登入 cookies 不會自動搬移，從舊網址進入的人可能需要在正式網址重新登入。

首頁加入五語隱私說明連結；不把現有草稿偽裝成已定稿政策。

## 後台清理順序（尚未操作）

1. 驗證三個舊 host 的頁面都導向正式入口，包含帶參數的分享網址。
2. Google Clients：保留正式 JavaScript origin；開發用 localhost 暫保留。確認沒有其他客戶端依賴兩個長別名後，再刪除它們。
3. Google redirect URI 保留 Supabase 回呼；它與 App 自己的 /auth/callback 是不同步驟，不能互換。
4. Supabase URL Configuration：核對 Site URL 為正式入口；正式 Redirect URL 包含 https://exchange-notes-app.vercel.app/auth/callback。開發／測試所需來源應分開管理，不盲目刪除。
5. Google Branding：Client origins 清理完成後再核對 Authorized domains。保留仍被回呼與網站使用的網域。

## 品牌驗證仍待確認

- 營運者法定名稱及客服信箱。
- 服務地區、最低年齡、資料與備份保存期限、實際刪除流程。
- AI 供應商實際方案與其資料使用條件。
- 正式隱私政策、服務條款及生效日期。
- 網域所有權驗證是否符合 Google 對此專案的要求；不能假設儲存網址等於已驗證。
- Google Audience 正式發布、Branding 驗證與發布狀態。

不改 OAuth client ID/secret、scope、nonce 驗證或使用者資料；不自動接受 Google 條款或購買網域／付費方案。

參考：
- https://support.google.com/cloud/answer/15549049
- https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls

---

## 2026-10-15 更新：上一節「品牌驗證仍待確認」的處理結果

使用者確認：營運者為 Hungchi Studio（台灣、個人經營、非登記公司），聯絡信箱 hungchistudio@gmail.com，Gemini 維持免費方案，帳號刪除採 App 內自助。

### 已完成（程式）

- **隱私權政策定稿**：`/privacy` 不再標示草案。五語，生效日 2026-10-15（`lib/legal/index.ts` 的 `LEGAL_EFFECTIVE_DATE`，兩份文件共用）。內容涵蓋：營運者、從 Google 帳號取得的資料（姓名、email、大頭照、帳號 ID）與不另作他用的聲明、Gemini 免費方案下 Google 可能用於改進產品及人工審閱、所有服務供應商與所在地（Supabase 加拿大、Vercel 美國）、保存期間、App 內刪除帳號、台灣個資法與 GDPR 權利、18 歲以上（Gemini API 條款要求）。
- **服務條款**：新增 `/terms` 與 `/profile/terms`，五語。準據法台灣。
- 兩份文件放在 `lib/legal/`，每種語言一個 chunk，只有這兩頁載入；伺服器端直接輸出全文，Google 審核讀得到。
- **首頁**：頁尾連到隱私權政策與服務條款。**登入頁**：加上「年滿 18 歲、同意服務條款、已閱讀隱私權政策」並附連結。
- **App 內刪除帳號**：設定 → 帳號 → 刪除帳號。先刪 Storage 檔案，再以 service role 硬刪 auth user，其餘資料全部 cascade。
- **Search Console 驗證**：`app/layout.tsx` 會在設定 `GOOGLE_SITE_VERIFICATION` 時輸出 `google-site-verification` meta。

### 部署前必做

1. **套用 migration `supabase/migrations/20261015120000_account_deletion.sql`**。它把 `device_tokens`、`message_receipts`、`notification_preferences`、`notifications` 的外鍵改成 `on delete cascade`，並新增只有 service role 能執行的 `prepare_account_deletion`。沒有套用前，正式環境大多數帳號（有收過訊息或設過通知偏好的人）連後台都刪不掉；刪除 API 會在第一步失敗並回 500，不會刪到一半。若用 MCP 或 Dashboard 套用，版本號會是套用當下的時間戳，請把檔名改成相同版本（見 `supabase/migrations/README.md`）。
2. 確認 Vercel Production 有 `SUPABASE_SERVICE_ROLE_KEY`（cron 已在使用，應已存在）。

### Google Cloud Console（需要你本人操作，依序）

1. **Search Console**：用 Cloud 專案的 Owner/Editor 帳號，新增「網址前置字元」資源 `https://exchange-notes-app.vercel.app/`，選「HTML 標記」，複製 `content` 的值 → Vercel 環境變數 `GOOGLE_SITE_VERIFICATION`（Production）→ 重新部署 → 回 Search Console 按「驗證」。`vercel.app` 在 Public Suffix List 上，`exchange-notes-app.vercel.app` 本身就是要驗證的頂層私有網域，沒有 DNS 可用，所以用 HTML 標記。
2. **Branding**：App 名稱 `Exchange Notes`；支援信箱 hungchistudio@gmail.com；首頁 `https://exchange-notes-app.vercel.app`；隱私權政策 `https://exchange-notes-app.vercel.app/privacy`；服務條款 `https://exchange-notes-app.vercel.app/terms`；Authorized domains 先加 `exchange-notes-app.vercel.app`，再填上面三個網址；上傳 logo `public/brand/app-icon/google-oauth-120.png`（120×120，由 icon-512 縮成）。上傳 logo 會讓品牌驗證成為必要步驟。
3. **Audience**：Publishing status 改為 In production。只用 openid／email／profile 這類基本範圍，不需要完整的 App 審查；品牌驗證通常 2–3 個工作天。
4. **Supabase → Auth → URL Configuration**：Site URL 為正式入口；Redirect URLs 包含 `https://exchange-notes-app.vercel.app/auth/callback`。
5. 品牌驗證通過、確認沒有其他用途後，再依上一節移除兩個長 Vercel 別名的 JavaScript origin。

**可能遇到的問題**：OAuth client 的 redirect URI 在 `svfcbtdrmzefzcymolld.supabase.co`（Supabase 的備援登入流程）。若審核要求驗證 `supabase.co` 而無法通過，可選：(a) Supabase Custom Domain，讓回呼改在自己的網域；(b) 把只給 Google Identity Services 用的 client 與備援流程的 client 分開。正常登入（GIS）只用 JavaScript origin，不經過這個網域。

### 資料最小化的後續建議（未操作，需要你決定）

- `vocabulary_examples_backup_20260831`：手動建立的備份表，398 列、10 位使用者，沒有外鍵。刪除帳號時已會一併清除該使用者的列；若已不需要，建議整張表刪除。
- `message-attachments` bucket 是**公開**的，裡面有 6 個 2026-07 的舊附件，現行程式已不再使用。建議確認後刪除這些檔案，或把 bucket 改為私人。
