# LockBox - First Prototype

LockBox is the **first prototype** of a browser-based personal-record organizer. It presents separate vault sections for passwords, cards, links, notes, media, and identity records, with local storage and backup import/export.

## Current capabilities

- React and TypeScript interface, built with Vite.
- Multiple record categories displayed through a vault dashboard.
- Local data persistence using browser `localStorage`.
- Generate a vault identifier and import/export JSON backups.
- Browser WebAuthn/platform-authenticator registration and unlock flows where supported.
- Optional Google Gemini-powered features for generating ideas and suggesting link titles, requiring a configured API key and a network connection.

## Critical security limitation

**This version is NOT a secure password manager or encrypted vault. Do not store real passwords, payment-card information, identity documents, or other sensitive records.**

The current `hooks/useVault.ts` serializes records as JSON, Base64-encodes them with `btoa()`, and saves them to browser `localStorage`. **Base64 is encoding, not encryption.** Anyone who can access that storage can decode its contents. The application also stores the current vault identifier in `localStorage` and may restore an unlocked session automatically on page load.

The vault identifier should **not** be treated as a cryptographic secret or password. Its current role is a storage lookup and import/export identifier. The JSON backup contains readable record values and is **not encrypted**.

WebAuthn-related interface flows exist, but they do not make the stored vault contents encrypted. Their presence is not evidence of a completed security review.

## Running locally

Requires Node.js and npm:

```bash
npm install
npm run dev
```

The project also includes `npm run build` and `npm run preview`.

The optional Gemini integration uses `GEMINI_API_KEY` injected into browser-side code via Vite's `define` configuration. **Do not deploy this as a production secret-handling integration:** client-bundled keys can be exposed to users. The Gemini functions make external API requests when invoked, so the project is not exclusively offline.

## Development status

First prototype only. It has not been independently audited for security or assessed for production credential storage. The source should be redesigned around authenticated encryption, sound key management, and secure handling of API credentials before any sensitive-data use.

Credit: Joe Nasr

Portfolio: https://joe-nasr-signals.vercel.app/
