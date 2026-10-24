# 港都漫遊 KAOHSIUNG DRIVE

在高雄街頭自由兜風的 HD-2D 開放世界駕駛遊戲：美麗島圓環、愛河、駁二、八五大樓、旗津、過港隧道……真實路網、行人、車流、紅綠燈，擬真車輛物理，手機傾斜或觸控轉向。

**線上玩：** https://gajuioredvmn.github.io/kaohsiung-drive/

## 開發

```
python3 build.py      # 把 src/ 串成單一檔案：dist/index.html（發布用）與 test/index.html（本機測試）
cp dist/index.html index.html   # 根目錄的 index.html 就是 GitHub Pages 上線的版本
```

- `src/js/` 依檔名順序串接成一個 IIFE；`src/head.html`、`src/body.html` 是頁面骨架。
- `vendor/three.global.js` 是內嵌的 three.js（r169），不需要網路載入。
- `android/` 是 WebView 外殼；APK 只在 Actions 手動執行 `android` workflow 時建置。

## 操作

- 油門／煞車在右側，傾斜手機或左下滑桿轉向，畫面上方拖曳可轉鏡頭。
- 設定裡可以開關任務（小黃、外送、計時賽）與警察。

純原創美術與音效，沒有使用任何真實車廠名稱或受版權保護的素材。
