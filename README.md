# KALHARA API UNIVERSE 🚀

Modular Node.js API hub. First module is CineSubz public movie and TV-series metadata.

Run with Node.js 20+: `npm install && npm start`

Endpoints: `/api/health`, `/api/movies`, `/api/movies/info?url=...`, `/api/series`, `/api/series/info?url=...`, `/api/series/seasons?url=...`, `/api/series/episodes?url=...&season=1`, `/api/episodes/info?url=...`, `/api/search?q=ben%2010`, `/api/latest`, `/api/info?url=...`.

Add more APIs under `routes/` and mount them in `index.js`. This service provides source-site metadata, not video downloads or playback. Respect site terms and copyright.
