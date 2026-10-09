# ▦ QR Studio

A free QR code generator that runs **entirely in your browser**. No backend, no sign-up, and nothing is uploaded.

**Live demo:** https://qr-generator-tau-mauve.vercel.app/

## Features

- **5 QR types:** URL, Plain Text, Email, Phone, Wi-Fi (the form changes for each type)
- **Live preview:** every change updates the QR code instantly
- **Customization:** size, foreground and background color, error correction level, margin
- **6 presets:** Classic, Ocean, Forest, Sunset, Grape, Midnight (you can still edit after picking one)
- **Download:** PNG (matches the preview exactly), SVG, or copy to clipboard
- **Validation:** clear error messages for empty or invalid input
- **Scan reliability warnings:** low contrast, inverted colors, small margin, small size, dense data, logo without High error correction
- **Recent QR codes:** saved in `localStorage`, still there after a refresh, click one to reuse it
- **Extras:** logo in the center, dark/light theme, responsive layout for desktop and mobile

## Tech stack

- [React](https://react.dev/) 18
- [Vite](https://vitejs.dev/)
- [qrcode](https://www.npmjs.com/package/qrcode) for QR generation
- [Vitest](https://vitest.dev/) for tests
- Deployed on [Vercel](https://vercel.com/)

## Run it locally

You need [Node.js](https://nodejs.org) (LTS) and [Git](https://git-scm.com).

```bash
git clone https://github.com/V-yasaswini/qr-generator.git
cd qr-generator
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app in development mode |
| `npm run build` | Creates the production build in `dist/` |
| `npm run preview` | Previews the production build |
| `npm test` | Runs the automated tests |

## Project structure

```
qr-generator/
├── index.html          # page shell
├── package.json        # dependencies and scripts
├── vite.config.js      # Vite settings
└── src/
    ├── main.jsx        # starts React
    ├── App.jsx         # main UI: form, preview, downloads, recent list
    ├── qr.js           # QR types, validation, payload builders, scan warnings
    ├── presets.js      # visual presets
    ├── storage.js      # localStorage helpers (recent codes, theme)
    ├── qr.test.js      # automated tests
    └── styles.css      # styling, responsive layout, themes
```

## How the QR text is built

| Type | Format |
|---|---|
| URL | `https://example.com` (https is added if missing) |
| Text | the text as typed |
| Email | `mailto:name@example.com?subject=...&body=...` |
| Phone | `tel:+919876543210` |
| Wi-Fi | `WIFI:T:WPA;S:NetworkName;P:Password;H:false;;` |

## Testing

Automated tests cover validation, payload building and scan warnings for every type:

```bash
npm test
```

Manual checks done:

- Scanned each QR type with a phone camera
- Tested every customization option and preset
- Opened downloaded PNG and SVG files and confirmed they match the preview
- Tried invalid and empty inputs
- Refreshed the page to confirm recent codes persist
- Checked desktop and mobile widths in browser dev tools

## Notes

- The logo is included in PNG downloads and in the copied image, but not in the SVG.
- Dark-on-light colors with high contrast scan most reliably. Use error correction **H** when adding a logo.

## License

MIT
