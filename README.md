# APEC Homes Utility Portal — Hosting-Ready Multi-File Package (v3.5.0)

This package is pre-configured and ready for 1-click static deployment on **GitHub Pages**, **Netlify**, **Vercel**, **Google Sites**, or any static web host.

## Included Files (17 Files)
- `index.html`: Fully self-contained, responsive APEC Homes Utility Portal (`v3.5.0`) with full feature parity to the live React preview:
  1. **Portal Overview & Quick Actions** (live Announcements sync, 6 workflow quick-action cards including One-Time Bill Payment & Status, resolution-adaptive PC Wide layout, and 6 selectable themes)
  2. **Request Bill Payment** (Power & Water filing with strict file naming `billmonth_accountnumber_duedate` and anti-double-posting lock)
  3. **View Request Bill Payment Status** (live Google Sheet + `LUT_RBP_Status` + `AI_SOA_Extractions` sync, Split-Screen Request Inspector with preview-rotation Free AI Statement Reader, `Duplicate` / `Late` / `Overdue` flags, and Mod-Access-gated `CANCEL` / `REJECTED` visibility)
  4. **Enroll New Utility Bill & View Enrollment Status** (unique `ENR-...` IDs, dual Google Drive attachment uploads, live ledger, and Split-Screen Inspector)
  5. **One-Time Bill Payment & Status (`EXP_ONETIME_PAYMENT` / Module 5)** (strict JPEG/PNG/PDF upload validation, sequential 3-file Google Drive uploads via `uploadOneTimeFile`, verified Google Sheet row write to `"One Time Bill Payments"`, lossless reading of existing & manual GSheet rows, separated `RFP No.` and `RFP Date` columns, clickable attachments for authorized moderators, and built-in `v3.5.0-otp-strict` Unified Apps Script default)
  6. **Admin Actions & System Setup (4-Module Filtered Layout)** (`1. Regular Bill & Enrollment`, `2. One-Time Bill Payment`, `3. Free AI Statement Reader`, `4. Users & Biller Accounts`) plus User Management (SHA-256 passwords & `[MODS:...]` RBAC) and Account Management (`Billers` / `FILEDBY`)
  7. **Reports** (User Activity Report, Account History 12-Month Matrix, Due & Lapsed Tracker, and 1-click CSV export)
- `404.html`: SPA fallback route for GitHub Pages.
- `single-index.html`, `github-pages-index.html`, `netlify-index.html`, `hosting-ready-index.html`: Identical standalone copies of the portal build.
- `google-sites-embed.html`: Self-contained single-file build ready for Google Sites `Embed Code` paste.
- `_redirects`: SPA rewrite rule (`/* /index.html 200`) for Netlify.
- `netlify.toml`: Zero-config build & redirect rules for Netlify.
- `vercel.json`: Clean URL & rewrite rules for Vercel.
- `.nojekyll`: Bypasses Jekyll processing on GitHub Pages so files starting with `_` (like `_redirects`) are served properly.
- `apechomes-logo.png`: High-resolution APEC Homes brand logo asset.
- `favicon.png`: Official APEC Homes Bill Submission browser tab icon.
- `Dedicated_AI_AppsScript.js`: Unified Google Apps Script (`v3.5.0-otp-strict`) handling `UserData`, `Announcements`, `AI_SOA_Extractions`, text-only cell edits, and One-Time Bill Payment sequential Drive uploads + verified sheet writes.
- `OneTimePayment_Isolated_AppsScript.js`: Standalone isolated Google Apps Script (`v3.5.0-otp-strict`) exclusively for One-Time Bill Payment (`One Time Bill Payments` tab + personal Drive folder `1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5`).
- `GoogleAppsScript_Code.js`: Master All-Uploads Google Apps Script (`v3.5.0`) covering Bill Payment Requests, Enrollments, and One-Time Payments.
- `PATCH_NOTES.txt`: Complete version history and release changelog (`v2.5.0` – `v3.5.0`).
- `README.md`: Deployment instructions and architecture guide.

---

## Deployment Option 1: GitHub Pages
1. Create or open your GitHub repository (e.g., `apechomes-utility-portal`).
2. Extract `apechomes-portal-github-pages.zip` and commit/push all files to your repository's `main` branch root (`/`).
3. In your GitHub repo, go to **Settings** -> **Pages**.
4. Under **Build and deployment** -> **Source**, select `Deploy from a branch`, choose branch `main` and folder `/(root)`, then click **Save**.
5. Your portal will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## Deployment Option 2: Netlify (Drag & Drop)
1. Go to https://app.netlify.com/drop.
2. Unzip `apechomes-portal-netlify.zip` and drag the extracted folder directly into the upload box.
3. Your portal will be live immediately with automatic HTTPS.

---

## Google Sheet Connectivity
- **Bill Payment & Endorsement Spreadsheet**: `1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA`
  - Tab `Billers` (`Col A`: Account No, `Col B`: Site, `Col C`: Biller, `Col D`: FILEDBY)
  - Tab `Request Bill Payments` (Live payment requests & statuses)
  - Tab `LUT_RBP_Status` (Formula-synced `Status`, `RFP`, `CV`, `Pay Date`)
  - Tab `New Bill Endorsement` (Utility bill enrollment ledger)
  - Tab `One Time Bill Payments` (17-column One-Time Bill Payment ledger synced with Drive folder `1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5`)
- **User Database, Announcements & AI Extractions Spreadsheet**: `1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY`
  - Tab `UserData` (User credentials, roles, module permissions `[MODS:...]`, email, viber, site)
  - Tab `Announcements` (Live portal overview announcements)
  - Tab `AI_SOA_Extractions` (Dedicated Free AI Statement Reader extraction cache keyed by Request ID)
