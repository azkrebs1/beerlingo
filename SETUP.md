# Beerlingo setup

Follow this once. It takes ~10 minutes. You'll create a free Supabase project
(the backend that stores accounts + the leaderboard), then run the app on your
iPhone.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> and sign up (free).
2. Click **New project**. Give it a name (e.g. `beerlingo`), set a database
   password (save it somewhere), pick a region near you, and create it.
3. Wait ~1 minute for it to finish provisioning.

## 2. Create the database table

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this repo, copy all of it, paste it in, and
   click **Run**. You should see "Success".

This creates the `profiles` table and the security rules for the leaderboard.

> **Heads up on how "logins" work:** this app has no passwords. People sign in
> by typing a name — that name *is* the account. Anyone who types "Alex" becomes
> Alex, and the database is open to anyone with the app. That's intentional for a
> casual friends' beer tracker; just don't store anything private in it.

## 3. Get your API keys into the app

1. In Supabase, go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key.
3. In this repo, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and paste your values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

> The `anon` key is safe to ship in a client app — the database security rules
> (from step 2) are what actually protect your data.

## 4. Run it

```bash
npm install
npx expo start
```

- Install **Expo Go** from the App Store on your iPhone.
- Make sure your phone and computer are on the **same Wi-Fi**.
- Scan the QR code shown in the terminal with the iPhone Camera → it opens in
  Expo Go.

Type your name to start, tap the screen to log your first beer, and check the
Leaderboard tab. Have your friends do the same and you'll all show up on each
other's leaderboards. If someone reinstalls or uses a new phone, typing the same
name gets their streak back.

---

## Notifications

**Reminders** (every 4 hours + 30 minutes before midnight) are local notifications
and work out of the box in Expo Go — the app asks permission on first launch, tap
**Allow**.

**"Someone else drank a beer" push** needs a free Expo project ID. Once, in your
own terminal (NOT the `! ` prompt — it needs internet):

```bash
npx eas init
```

Log in with a free Expo account when prompted. This writes `extra.eas.projectId`
into `app.json`. Restart Metro (`npx expo start -c`) and reload. From then on each
device registers a push token and a beer tap notifies everyone else.

Caveats: cross-user push is officially supported only in a **development build**;
in **Expo Go it may work on iOS but not Android**. You also need **two devices** to
see it (you never get notified about your own beer).

## Later: putting it on the App Store / TestFlight

Expo Go is perfect for testing with friends. When you want a real installable
app with its own icon (no Expo Go), you'll build with EAS:

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

That step needs an Apple Developer account ($99/yr) to distribute via
TestFlight. Not needed for now — Expo Go covers a few friends fine.

## Troubleshooting

- **"Missing Supabase config" warning** → `.env` isn't filled in, or you didn't
  restart `npx expo start` after editing it. Stop and re-run it.
- **Leaderboard is empty** → pull down to refresh; make sure friends have
  entered a name and logged at least one beer.
