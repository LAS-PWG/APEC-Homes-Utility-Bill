# APEC Homes Utility Portal - Hosting-Ready Multi-File Package

This package is pre-configured and ready for 1-click static deployment on **Netlify**, **GitHub Pages**, **Vercel**, or any static web host.

## Included Files
- `index.html`: Fully self-contained, responsive APEC Homes Utility Portal with all 7 modules:
  1. Portal Overview & Quick Actions
  2. Request Bill Payment (Power & Water with strict file naming: billmonth_accountnumber_duedate)
  3. View Request Bill Payment Status (Live authoritative GSheet sync, search, filter, strict User ID restriction)
  4. Enroll New Utility Bill (with Unique Request ID, GSheet New Bill Endorsement tab, Google Drive folder links)
  5. View Enrollment Status (Live ledger, search, filter, strict User ID restriction)
  6. User Management (Admin/Sub-Admin access control, GSheet UserData tab sync)
  7. Account Number Management (Admin/Sub-Admin master billers catalog, GSheet Billers tab sync)
- `404.html`: SPA fallback route for GitHub Pages.
- `_redirects`: SPA rewrite rule (/* /index.html 200) for Netlify.
- `netlify.toml`: Configuration file for Netlify zero-config builds.
- `.nojekyll`: Bypasses Jekyll on GitHub Pages to preserve underscore files like `_redirects`.
- `apechomes-logo.png`: High-resolution APEC Homes branding asset.

---

## Deployment Option 1: Netlify (Fastest - Drag & Drop)
1. Go to https://app.netlify.com/drop (login or sign up for free).
2. Unzip this package.
3. Drag and drop this folder directly into the browser upload box.
4. Your application will be live instantly with a free `*.netlify.app` URL and SSL!

---

## Deployment Option 2: GitHub Pages
1. Create a new GitHub repository (e.g., `apechomes-utility-portal`).
2. Push all the files in this directory to your repository's `main` branch.
3. In your GitHub repo, go to **Settings** -> **Pages**.
4. Under **Build and deployment** -> **Source**, select `Deploy from a branch`, choose branch `main` and folder `/(root)`, then click **Save**.
5. Your portal will be available at `https://<your-username>.github.io/apechomes-utility-portal/`.

---

## Google Sheet Connectivity
This portal uses direct browser-to-Google-Sheets GViz integration:
- **Bill Payment & Endorsement Spreadsheet**: `1WI4CA4hy1s3oyCZLvgDVA1SeJSj9gN2BfLLeRpUmZDA`
  - Tab `Billers` (Col A: Account No, Col B: Site, Col C: Biller)
  - Tab `Request Bill Payments` (Live request records and statuses)
  - Tab `New Bill Endorsement` (Utility bill enrollment ledger)
- **User Database Spreadsheet**: `1YvMBpPb3s1BVri5WvSSnbbjb0i3zIRk026eJVfciBKY`
  - Tab `UserData` (User credentials, roles, email, viber, site)

No backend server is required when hosting on Netlify or GitHub Pages!
