# FIFA WC 2026 Sticker Album Tracker

A mobile-friendly web app to track your World Cup 2026 sticker collection, find trades with friends, and manage your doubles.

## Stack
- **Frontend:** Vanilla HTML/CSS/JS — hosted on GitHub Pages
- **Backend:** Supabase (Postgres database + Auth + REST API) + Google Cloud Console (OAuth)

---

## 1. Supabase Setup

### Create a project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project — note your **project URL** and **anon public key** (found in Project Settings → API)

### Run the schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Paste the contents of `supabase-schema.sql` and click **Run**

### Configure Auth
1. Go to **Authentication → Providers** — Email is enabled by default
2. Go to **Authentication → URL Configuration**
   - Set **Site URL** to your GitHub Pages URL: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
   - Add the same URL to **Redirect URLs**
3. Optional: Go to **Authentication → Email Templates** and disable email confirmation for easier testing (set "Confirm email" to off under Auth settings)

---

## 2. Configure the App

Open `index.html` and find the configuration block near the top of the `<script>` section:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY'
```

Replace both values with your Supabase project's URL and anon key.

---

## 3. Deploy to GitHub Pages

1. Create a new GitHub repository (can be private)
2. Push `index.html` (and this README) to the repo
3. Go to **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` / `(root)`
4. Your app will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

---

## 4. Usage

### First time
- Open the app URL and tap **Sign Up**
- Choose a username and password
- Your sticker collection starts empty (all stickers at count 0)

### Adding stickers
- Tap **Check / Add Stickers** from the home screen
- Select a group and country (or FWC)
- Select the sticker number
- The app shows your current count and status
- Tap **+ Add Sticker** to increment your count

### Finding trades
- Tap **Find Trades**
- See a list of other users ranked by number of possible trades with you
- Tap a user to see the specific stickers you can swap
- Tap **Execute Trade** to confirm — your stickers update immediately and the other user sees a pending trade notification next time they open the app

### Third-party trades
- In **Find Trades**, tap **Trade with someone outside the app**
- Tap stickers from your doubles to give away (count decrements)
- Tap stickers from your missing list to mark as received (count increments)

### Edit lists
- Tap **Edit Lists** to browse your full collection by country
- Toggle collected status or adjust doubles count directly

---

## Notes
- All sticker data is stored in Supabase and syncs across devices automatically
- The anon key in the frontend is safe to expose — Row Level Security (RLS) ensures users can only modify their own data
- Free Supabase tier allows up to 50,000 monthly active users and 500MB storage — more than sufficient
