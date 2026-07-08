# Ali Assistant

AI product assistant for AliExpress affiliate recommendations.

## Features

- Hebrew product search UI.
- AliExpress Affiliate API integration.
- Multi-query search attempts.
- Product relevance filtering.
- Top product ranking by price, rating, sales volume, discount, and data quality.
- Conservative behavior: returns no products when results are mostly accessories or unrelated.

## Local Run

Create `.env` from `.env.example`, then:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Checks

```bash
npm run check
npm run quality
```

## Deploy

See `DEPLOYMENT.md`.
