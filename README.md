# EverythingszDash

This repo is a static dashboard (HTML/CSS + `app.js`) that can be deployed as a static site.

## Render deploy note

Some hosts (including Render) may be configured to start the app with `node app.js`. `app.js` contains browser code, so it also includes a small Node static-file server fallback when no DOM globals are available.

- Start command: `node app.js`
- Serves: `index.html`, `app.js`, `style.css`, `manifest.json`, `sw.js`, icons, and other static files from the repo root

