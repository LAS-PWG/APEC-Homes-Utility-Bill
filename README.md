# APEC Homes Utility Portal - Hosting-Ready Multi-File Package (v3.1.2)

This package is pre-configured and ready for 1-click static deployment on **GitHub Pages**, **Netlify**, **Vercel**, **Google Sites**, or any static web host.

## Included Files (14 Files)
- `index.html`: Fully self-contained, responsive APEC Homes Utility Portal (`v3.1.2`) with all modules, clean Account Number display in Payment Status, full-production One-Time Bill Payment (`EXP_ONETIME_PAYMENT` / `Module 5`) enabled for all user roles with Group 8 Mod Access permissions (`OTP_ATTACH_LINK`, `OTP_DRIVE_FOLDER_LINK`, `OTP_EDIT_DETAILS`, `OTP_ADD_PAYMENT_DETAILS`, `OTP_UPDATE_STATUS`, `OTP_VIEW_CANCEL_REJECTED`), dedicated `Save Payment Details` / `Save` buttons for users granted `OTP_ADD_PAYMENT_DETAILS`, dedicated `Admin Actions` tab grouped with `Users` and `Accounts`, automatic `Requestor` login credentials, required 3-document uploads (`Request Letter`, `SOA`, `Mgmt Approved RLF`), automated `WITH RFP` / `PAID` status resolution (`CANCEL`/`REJECTED` top priority), `Yes` / `No` 1-Time Ack indicator, pending-only `One-Time Status` counter, clean UI headers without internal sheet callouts, pre-configured personal Google Drive folder `1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5` with silent zero-email sharing and 100% zero-contact isolation from Bill Sub & Enrollment Sub uploads, positioned after Enrollment in Row 1 with a neutral slate color palette and verified 17-column `One Time Bill Payments` Google Sheet sync, permanent resolution-adaptive PC Wide Mode for all users, & 6 selectable themes (Christmas Holiday [default], New Year Celebration, Light, Dark, macOS Style, Bazzite OS):
  1. **Portal Overview & Quick Actions** (with live Announcements sync, 6 workflow quick-action cards including One-Time Bill Payment & Status, & resolution-adaptive PC Wide 12-column Bento Grid)
  2. **Request Bill Payment** (Power & Water with compact `max-w-3xl` form footprint, strict file naming `billmonth_accountnumber_duedate` & single-dispatch anti-double-posting lock)
  3. **View Request Bill Payment Status** (Clean Account Number top-line display without redundant `_site_payee`, live authoritative GSheet + `LUT_RBP_Status` sync, Split-Screen Request Inspector, `Duplicate` / `Late Xd (Yd left)` / `Overdue` flags under `Request ID`, Mod-Access-gated `LUT Synced` & `CANCEL`/`REJECTED` visibility)
  4. **Enroll New Utility Bill** (Compact `max-w-3xl` form footprint, unique `ENR-...` ID, dual Google Drive attachment upload & anti-double-posting lock)
  5. **View Enrollment Status** (Live ledger, Split-Screen Inspector with Dual-Attachment switcher, restricted `CANCEL`/`REJECTED` visibility)
  6. **One-Time Bill Payment & Status (`EXP_ONETIME_PAYMENT` / `Module 5`)** (Full production module enabled for all roles; Group 8 Mod Access permissions; logged-in `Requestor` credentials; required 3-document upload enforcement; automated `WITH RFP` / `PAID` status with `CANCEL` / `REJECTED` priority; `Edit Details` & `Add Payment Details` mods with explicit `Save Payment Details` / `Save` buttons; `View File in New Tab` & `Open Drive Folder` mods; pre-configured for personal Google Drive folder `1u7lR6OCbzoYfmLXe4TGeQ2LyGJiLHDa5` with silent sharing and strict isolation from Bill Sub & Enrollment Sub uploads)
  7. **User Management, Account Management & Admin Actions** (Grouped under `Admin:`; SHA-256 password encryption, `[MODS:...]` granular permissions including Group 8 `8. One-Time Bill Payment & Status`, master `Billers` / `LUT` catalog with `FILEDBY` assignment, and centralized `Admin Actions` setup tab)
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
- `GoogleAppsScript_Code.js`: Master All-Uploads Google Apps Script (`v5.2`) covering Bill Payment Requests, Enrollments, and One-Time Payments (kept isolated and ready for Drive Owner deployment).
- `OneTimePayment_Isolated_AppsScript.js`: Standalone isolated Google Apps Script specifically for One-Time Bill Payment (`v2.0 Production` — silent sharing without `file.addEditor` email notifications) so your existing Drive upload script is never touched.
- `PATCH_NOTES.txt`: Complete version history and release changelog (`v2.5.0` – `v3.1.2`).
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
