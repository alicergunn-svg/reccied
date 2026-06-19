# Setting up Reccied

Three services, all free (except ~£4 of Anthropic credit). Takes about 20 minutes.

---

## 1. Supabase — your database and login system

**What it is:** Where all your places, reccies, and user accounts live.

1. Go to **https://supabase.com** → click **Start your project**
2. Sign up with GitHub or email
3. Click **New project** → name it "reccied" → pick a region near you → set a database password → **Create new project**
4. Wait about 2 minutes for it to set up

**Set up your tables:**
1. In the left sidebar click **SQL Editor**
2. Click **New query**
3. Open `supabase-schema.sql` from this folder, copy everything, paste it in, click **Run**
4. You should see "Success. No rows returned"

**Copy your keys:**
1. In the left sidebar click **Settings** (gear icon) → **API**
2. Copy **Project URL** → save it as `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon / public** key → save it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Anthropic — the AI that reads accommodation pages

**What it is:** Powers the "paste a URL and it fills in the details" feature.

1. Go to **https://console.anthropic.com** → sign up
2. Click **API Keys** in the left menu → **Create Key** → copy it → save as `ANTHROPIC_API_KEY`
3. Click **Billing** → add a card and top up £5 (this lasts hundreds of extractions)

---

## 3. Vercel — hosts the website

**What it is:** Makes the app live on the internet so you and your friends can open it.

1. Go to **https://github.com** → sign up for a free account
2. Click the **+** icon → **New repository** → name it "reccied" → **Create repository**
3. On the next screen, click **uploading an existing file** and drag in all the files from this folder
4. Go to **https://vercel.com** → **Sign up with GitHub**
5. Click **Add New → Project** → find your "reccied" repo → click **Import**
6. Before deploying, open **Environment Variables** and add these three:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
| `ANTHROPIC_API_KEY` | your Anthropic API key |

7. Click **Deploy** — takes about 2 minutes
8. You'll get a URL like `reccied-abc123.vercel.app` — that's your live app!

---

## 4. One last Supabase setting

Magic links need to know where to send people after they click.

1. In Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://reccied-abc123.vercel.app`)
3. Add the same URL to **Redirect URLs**
4. Click **Save**

---

## Done! 🎉

Open your Vercel URL, enter your email, and you'll receive a magic sign-in link.

Your first move: add a couple of reccies, then share your profile link with your founding group so they can follow you.

---

## Optional: run locally first

If you want to test on your computer before deploying:

1. Install Node.js from **https://nodejs.org** (LTS version)
2. Open Terminal → `cd ~/Claude/Projects/Reccie`
3. Copy `.env.local.example` to `.env.local` and fill in your three keys
4. Run `npm install` then `npm run dev`
5. Open **http://localhost:3000**
