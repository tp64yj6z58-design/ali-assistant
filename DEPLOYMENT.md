# Deployment

## Required environment variables

```env
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_TRACKING_ID=
ALIEXPRESS_SHIP_TO=IL
ALIEXPRESS_TARGET_CURRENCY=ILS
ALIEXPRESS_TARGET_LANGUAGE=EN
```

Do not upload `.env`.

## Render

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

## Railway

- Start command: `npm start`
- Health check: `/api/health`

## Local check

```bash
npm run check
npm start
```
