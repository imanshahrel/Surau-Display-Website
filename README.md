# Paparan Surau (Surau Display Screen)

A static website for the surau's TV/monitor. Plain HTML, CSS and JS: no build step, free on GitHub Pages.

## Put it online (GitHub Pages)
1. Create a new **public** repository on GitHub (e.g. `surau-display`).
2. Upload everything in this folder (drag and drop on the repo page works).
3. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`. Save.
4. After a minute your link is `https://<your-username>.github.io/surau-display/`. Open that link on the surau's monitor (browser full screen with F11).

## Things you will edit
| What | File | Notes |
|---|---|---|
| Scrolling text | `ticker.txt` | One message per line. Edit on GitHub (pencil icon), commit, and the screen updates within about a minute without a reload. Lines starting with `#` are ignored. |
| Slideshow | `slides.json` + `slides/` folder | Upload images (PNG/JPG, e.g. exported from Canva) into `slides/`, then list the file names in `slides.json`. Also updates live. |
| Surau name, logo, location, alert timing | `config.js` | Set `latitude`/`longitude` to your surau. |
| Logo | `assets/logo.svg` | Replace with your own file, or change the path in `config.js` (e.g. `assets/logo.png`). |

## Prayer times
Fetched from the aladhan.com API (JAKIM method) for the surau's coordinates, once a month, then stored in the browser, so a short internet outage will not break it. Compare the first few days with the official JAKIM e-solat table for your zone. If a time is off by a minute or two, use `adjustMinutes` in `config.js`.

## Hijri date
If the Hijri date is a day off compared with the Malaysian calendar, set `hijriOffsetDays` to `1` or `-1` in `config.js`.

## Testing alerts
Add `?at=13:02` to the link to pretend it is 1:02 PM and see the alert.

## Notes
- The page always uses Malaysia time, whatever the device clock's timezone is.
- The page reloads itself at 3:30 AM daily to pick up any code changes.
- Browsers block sound on pages nobody has clicked, so the alert is visual only.
