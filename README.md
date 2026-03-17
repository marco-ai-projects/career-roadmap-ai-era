# Career Roadmap in the AI Era

Standalone React app for the Career Heatmap dashboard.

## What this includes

- Top 500 U.S. occupations by employment as the default slice
- AI pressure forecasts from now through 5 years
- Salary, workforce, family, and risk band views
- Product-manager context overlay for enterprise and Fortune 100 roles

## Local development

```bash
npm install
npm run dev
```

The app runs locally at [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Data source

The live dataset is copied from the internal Control Center build:

- `/Users/loulou/.openclaw/workspace/marco-2nd-brain/src/data/career-heatmap.json`

## Refreshing the data

1. Regenerate the source data in the internal app if needed.
2. Copy the latest JSON into `data/career-heatmap.json`.
3. Mirror it into `public/data/career-heatmap.json` for the standalone app runtime.

## Deploying on Render

This repo is configured as a Vite static site:

1. Create a new Static Site or Blueprint in Render.
2. Point it at this repo.
3. Render will run `npm install && npm run build`.
4. Publish directory is `dist`.
