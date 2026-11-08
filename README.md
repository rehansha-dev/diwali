# Light Up the Festival — Happy Diwali

Clap (or tap) to light a golden diya in 5 stages: rangoli petals, decorative base, clay diya,
wick and flame, final details. Fireworks, glow and a "Happy Diwali" finale. Plain HTML/CSS/JS, no build step.

## Music
The song is `assets/music.mp3` and plays on a loop (replace the file to change it).
If that file is missing, the site plays a built-in raga-style ambience instead.
Sound effects (chimes, fireworks, flame) are always synthesized.

## Claps vs taps
- Click "Start celebration" and allow the microphone: each clap lights the next stage.
- No microphone, or you decline: tap anywhere, press Space, or use the play button.
- The microphone only works on https or localhost, which Netlify/Vercel/GitHub Pages give you automatically.
- If claps are missed or triggered by the music, change `CLAP_SENSITIVITY` at the top of `script.js`
  (0.7 = more sensitive, 1.5 = needs louder claps). Headphones avoid the music being heard by the mic.

## Run locally
Double-click `index.html`, or `python -m http.server 8000` and open http://localhost:8000

## Deploy (static)
Deploy the folder that directly contains `index.html`.
- Netlify: https://app.netlify.com/drop, drag the folder in.
- Vercel: `npx vercel` here (framework "Other", no build command), then `npx vercel --prod`.
- GitHub Pages: push to a repo, Settings > Pages > Deploy from branch (root).

## Customise (top of script.js)
`TOP` and `MAIN` change the big greeting. `MESSAGE` is the personal note that is typed out at the end.
