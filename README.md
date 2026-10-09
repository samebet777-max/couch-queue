# Couch Queue

A shared TV tracker for two phones: one list of your shows, where each of you is in every season, the network or streamer, trailers, cast bios, review highlights, and what's next for every show.

Built with Expo (React Native) and Expo Router. Show data comes from [TMDB](https://www.themoviedb.org/); the shared list syncs through [Supabase](https://supabase.com/).

## What's in this version

- **Our shows:** the shared list, grouped into Watching, Waiting, Want to see and Done, with a progress bar for each person.
- **Show page:** backdrop and poster, network and years, trailer, where to watch (US), next-season status, seasons (tap the last one you finished), cast, and viewer review highlights.
- **Star bio:** photo, birthday, hometown, biography, and their other shows.
- **Next season:** every show you're watching or waiting on, sorted by what's coming soonest.
- **Search:** find any show and add it to the list.
- **Us:** your name, who's on the list, and the invite code for the other phone.

Starting a new list adds Peaky Blinders, General Hospital and Star Trek: Strange New Worlds.

Not yet built: phone alerts and news articles (planned for the next update).

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `EXPO_PUBLIC_TMDB_TOKEN`: a free TMDB account, then Settings > API > "API Read Access Token".
   - `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (optional, for sharing): create a free Supabase project, run `supabase/schema.sql` in its SQL editor, then copy the URL and anon key from Project Settings > API. Without these the list stays on one phone.
3. Start it: `npx expo start`, then scan the QR code with the iPhone camera to open it in Expo Go.

## How sharing works

Each household is one JSON document in Supabase, keyed by an 8-character invite code. Phones call two database functions (`get_household`, `put_household`) and never read the table directly. Every show, member and progress entry carries its own `updatedAt`, and the server keeps the newest of each, so both phones can edit at the same time. Phones sync on every change, every 30 seconds while open, and when the app comes back to the foreground.

Anyone with the invite code can see and edit the list, so treat it like a shared password.

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
