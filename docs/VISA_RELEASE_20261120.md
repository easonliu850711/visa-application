# Visa AP 發布候選 — 2026-11-20

基準 GitHub main `6add6906ea465ee25517e4aa6a2cdeb766680464`。此分支不包含 HP STG 的 11 個額外 commit；兩者功能樹差異經唯讀核對，原 STG 只把 proxy fallback 由3005改4005，另有忽略檔／環境範例差異。發布負責人需保存現場修改與提交歷史，不以 reset 遺失它們。

## AP 修正

- Core URL 只取既有 `CENTRAL_API_BASE_URL`／`API_CORE_BASE_URL`；不猜 STG／PROD port。缺少或無效設定回503，不發送請求。
- 僅接受明確 http(s) origin，拒絕 URL 身分、query、fragment、非根路徑；上游不得重新導向。
- 保留現有服務身份欄位與 POST payload、回應格式相容性；不轉傳瀏覽器 cookie／認證標頭。
- 10秒上游 timeout；連線失敗502、逾時504；錯誤不洩漏內部資訊。
- 保留上游HTTP狀態與no-store；處理204／205／304空回應。
- 修正 npm dev/start 的 Windows 相容語法；部署仍由既有 Infra 入口控制 port。

## 依賴

既有 lock 安裝為Next14.2.35，production audit有1critical及3high。此候選對齊Next15.5.29、React/DOM19.2.7、Lucide0.468.0、ESLint8.57.1/config-next15.5.29與對應React types；固定PostCSS8.5.33、nanoid3.3.20、source-map-js1.2.4。

已驗證 production audit **0**。這不表示全開發依賴或所有產品安全性零風險；未使用audit fix --force。

官方風險來源：https://github.com/advisories/GHSA-p293-qw3h-jr36 。Next14→15相容性參照：https://nextjs.org/docs/app/guides/upgrading/version-15 。

## 驗證

- `npm run test:proxy` 6/6，使用 VM 注入的合成身份與 fetch，不連任何真實 Core／外部API。
- `npm run build` 最終exit0；lint/typecheck均執行，未關閉檢查。
- 本機production預覽4321：桌面1440×1000、手機390×844無水平溢出，標題與頁面可呈現。
- 本機刻意不設定Core來源，實際API回503，UI顯示入管清單載入失敗而非崩潰；console只有對應載入失敗warn。這是失敗路徑驗收，不代表真實入管清單／預測已驗收。
- 圖片與logs保存在Workspace/outputs的visa-*-20261120檔案。

## 交給 Infra 的正式發布條件

1. 在HP以實際既有權限與原部署流程驗收，保留HP STG額外歷史／差異；不得複製STG環境檔覆蓋PROD。
2. 確認STG明確Core4005、PROD明確Core3005（既有profile已提供；此AP不修改profile），核對服務身份，不印出秘密值。
3. 先STG完整安裝與build（依賴有更新，不能只做無npm install的SAFE路徑），驗收/visa-application、入管局/e-stat、實際預測回應及analytics讀取，不寫入真實貢獻資料。
4. STG通過後依Eason既有「全部上PROD」授權，統一由系統架構優化發布與驗證；AP chat不重複部署、重啟或改DB。

不得以本機故障畫面測試、根頁200或runtime audit0，取代實際STG／PROD功能驗收。
