# Pollisum Action Tracker (Vite)

Run locally: `npm install` then `npm run dev`.
Build: `npm run build` (output in `dist/`).

## Deploy
Push this folder to the **root** of a GitHub repo (package.json must be at the top level), then in Vercel: Add New > Project > import the repo. Framework preset is detected as **Vite** (build `npm run build`, output `dist`). Leave Root Directory blank.

Data is stored in each person's browser (localStorage), not shared between people.
