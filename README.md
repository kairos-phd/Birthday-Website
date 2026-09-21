# Birthday-Website

A responsive birthday website template with a letter, photo gallery, timeline, countdown, themes, animated hearts, a surprise section, and optional background audio. The editor supports draft/preview/publish and individual desktop/mobile text sizes.

All photos are SVG placeholders. Names, dates, messages, captions, and music details are sample inputs. No personal photos, audio recordings, saved drafts, real Firebase credentials, or project IDs are included.

## Run locally

Requires Python 3; Node.js is only needed for tests.

```sh
python -m http.server 5173 --directory public
```

Open http://localhost:5173. The template works without Firebase and does not contact a configured database until you add a project ID.

```sh
npm test
```

## Personalize

Edit `public/config.js` for the recipient, dates, letter, timeline, photos, gift, and music. Edit `public/copy.js` for page labels and placeholder copy. Replace `public/assets/placeholder.svg` references with your own images. Place an audio file you can use in `public/assets/`, then set `music.src`, `music.title`, and `music.artist`. Playback may require a user gesture.

## Enable the online editor and Firebase Hosting

1. Create your own Firebase project and web app; enable Email/Password Authentication and Firestore.
2. Create your owner account. Fill `public/firebase-config.js` with your web app configuration and owner UID, then set `authReady` to `true`.
3. Replace `REPLACE_WITH_OWNER_UID` in `firestore.rules` with that same UID. Rules restrict editing to that account.
4. Deploy with Firebase CLI, supplying your own project ID:

```sh
npx firebase-tools login
npx firebase-tools deploy --only hosting,firestore --project YOUR_PROJECT_ID
```

Open `/edit.html`. Save draft keeps changes private; Preview shows the draft; Publish updates the same public URL. Uploaded photos are stored in Firestore with a maximum of 30 photos overall and 12 per timeline entry. Audio is supplied as a hosted file path or HTTPS URL; online audio uploads are not included.

The editor uses origin-root routes and is intended for Firebase Hosting or a server at the domain root. GitHub Pages deployment is not configured in this repository.

## Fonts

Lora and Be Vietnam Pro are bundled with their respective SIL Open Font License files in `public/assets/`. No stock photography or commercial music is distributed.
