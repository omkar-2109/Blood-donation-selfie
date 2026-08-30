# Humanness Blood Drive – Digital Selfie Kiosk

Production-ready React + Vite kiosk for mobile selfie capture.

## Run locally

```bash
npm install
npm run dev
```

- Kiosk: `http://localhost:5173`
- Admin review: `http://localhost:5173/admin`

## Production

```bash
npm run build
npm start
```

The Express server serves the built app, stores submissions in `data/submissions.json`, and saves framed image files in `data/submissions/`.

## Admin review

Open `/admin` to review saved submissions, including visitor details and the framed image.

