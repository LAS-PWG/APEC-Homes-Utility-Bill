# APEC Homes Utility Portal - Hosting-Ready Multi-File Package (v2.9.4)

This package is pre-configured and ready for 1-click static deployment on **GitHub Pages**, **Netlify**, **Vercel**, **Google Sites**, or any static web host.

## Included Files (13 Files)
- `index.html`: Fully self-contained, responsive APEC Homes Utility Portal (`v2.9.4`) with all 9 modules, permanent resolution-adaptive PC Wide Mode for all users, & 6 selectable themes (Christmas Holiday [default], New Year Celebration, Light, Dark, macOS Style, Bazzite OS):
  1. **Portal Overview & Quick Actions** (with live Google Sheet Announcements sync & resolution-adaptive PC Wide 12-column Bento Grid)
  2. **Request Bill Payment** (Power & Water with compact `max-w-3xl` form footprint, strict file naming `billmonth_accountnumber_duedate` & single-dispatch anti-double-posting lock)
  3. **View Request Bill Payment Status** (Live authoritative GSheet + `LUT_RBP_Status` sync, Split-Screen Request Inspector, `Duplicate` / `Late Xd (Yd left)` / `Overdue` flags under `Request ID`, Mod-Access-gated `LUT Synced` & `CANCEL`/`REJECTED` visibility)
  4. **Enroll New Utility Bill** (Compact `max-w-3xl` form footprint, unique `ENR-...` ID, GSheet `New Bill Endorsement` tab, dual Google Drive attachment upload & anti-double-posting lock)
  5. **View Enrollment Status** (Live ledger, Split-Screen Inspector with Dual-Attachment switcher, restricted `CANCEL`/`REJECTED` visibility)
  6. **User Management** (Admin/Sub-Admin access control, SHA-256 password encryption, `[MODS:...]` granular permissions including `PS_VIEW_LUT_SYNCED`, GSheet `UserData` tab sync)
  7. **Account Number Management** (Master `Billers` / `LUT` catalog, `FILEDBY` assignment, live `LUT <-> RBP` cross-reconciliation)
  8. **User Activity Report (`REP_USER_ACTIVITY`)** (Filer activity, 30-day dormancy tracking, `FILEDBY` coverage, and 1-click CSV export)
  9. **Account History Report (`REP_ACCOUNT_HISTORY`)** (12-Month `J–D` payment matrix, clickable Account Number 12-Month History modal with `Prev / Next` navigation, `RFP`/`CV`/`Pay Date` tracking, and 1-click CSV export)
- `404.html`: SPA fallback route for GitHub Pages.
- `single-index.html`: Standalone copy of the portal build.
- `google-sites-embed.html`: Self-contained single-file build with inline Base64 logo for Google Sites `Embed Code` paste.
- `_redirects`: SPA rewrite rule (`/* /index.html 200`) for Netlify.
- `netlify.toml`: Zero-config build & redirect rules for Netlify.
- `vercel.json`: Clean URL & rewrite rules for Vercel.
- `.nojekyll`: Bypasses Jekyll processing on GitHub Pages so files starting with `_` (like `_redirects`) are served properly.
- `apechomes-logo.png`: High-resolution APEC Homes brand logo asset.
- `favicon.png`: Official APEC Homes Bill Submission browser tab icon (`Favicon_Bill_Sub`).
- `GoogleAppsScript_Code.js`: Reference Google Apps Script automation for Google Sheets & Google Drive.
- `PATCH_NOTES.txt`: Complete version history and release changelog (`v2.5.0` – `v2.9.4`).
- `README.md`: Deployment instructions and architecture guide.

---

## Deployment Option 1: GitHub Pages
1. Create or open your GitHub repository (e.g., `apechomes-utility-portal`).
2. Extract `apechomes-portal-github-pages.zip` and commit/push all 13 files to your repository's `main` branch root (`/`).
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
This portal connects directly from the browser to Google Sheets via GViz & Apps Script Webhooks:
- **Bill Payment & Endorsement Spreadsheet**: `1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA`
  - Tab `Billers` (`Col A`: Account No, `Col B`: Site, `Col C`: Biller, `Col D`: FILEDBY)
  - Tab `Request Bill Payments` (Live payment requests & statuses)
  - Tab `LUT_RBP_Status` (Formula-synced `Status`, `RFP`, `CV`, `Pay Date`)
  - Tab `New Bill Endorsement` (Utility bill enrollment ledger)
- **User Database & Announcements Spreadsheet**: `1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY`
  - Tab `UserData` (User credentials, roles, module permissions `[MODS:...]`, email, viber, site)
  - Tab `Announcements` (Live portal overview announcements)
