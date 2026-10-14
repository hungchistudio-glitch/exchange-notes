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
