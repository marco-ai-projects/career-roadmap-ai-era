# Career Roadmap in the AI Era

Public, read-only standalone app for the career impact dashboard.

## What this includes

- Top 500 U.S. occupations by employment as the default slice
- AI pressure forecasts from now through 5 years
- Salary, workforce, family, and risk band views
- Product-manager context overlay for enterprise and Fortune 100 roles

## Data source

The live dataset is copied from the internal Control Center build:

- `/Users/loulou/.openclaw/workspace/marco-2nd-brain/src/data/career-heatmap.json`

## Refreshing the data

1. Regenerate the source data in the internal app if needed.
2. Copy the latest JSON into `data/career-heatmap.json`.

## Deploying on Render

This repo is set up as a static site. On Render:

1. Create a new Static Site or Blueprint.
2. Point it at this repo.
3. Publish the repo root.

Because this is a static site, there is no server runtime to manage.
