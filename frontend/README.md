# frontend

Angular 22 + Tailwind CSS 4 site for Travel Routes. Currently hosts the public
privacy policy (English / Türkçe) required by the Play Console listing.

## Routes

| Path       | What                                              |
| ---------- | ------------------------------------------------- |
| `/`        | redirects to `/privacy`                           |
| `/privacy` | privacy policy + KVKK notice, EN/TR switch        |
| `*`        | redirects to `/privacy`                           |

The language defaults to the browser locale (`tr-*` → Türkçe, else English) and
the choice is remembered in `localStorage`.

## Develop

```bash
npm install
npm start          # http://localhost:4200
npm run build      # dist/frontend/browser
```

## Where things live

- `src/app/app.routes.ts` — routing (redirects + lazy privacy page)
- `src/app/core/language.service.ts` — `lang` signal, persistence, `<html lang>`
- `src/app/pages/privacy/` — the policy page; text is a port of
  `../mobile-react-native/store-assets/privacy-policy.html`
- `src/styles.css` — Tailwind import, theme tokens, `.prose-policy` typography

When the policy text changes, update both language blocks in
`src/app/pages/privacy/privacy.html` and bump the "Last updated" date.
