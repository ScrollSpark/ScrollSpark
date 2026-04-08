# ScrollSpark

A motivational app that sparks you into action when you've been scrolling too long.

## Tech Stack
- React + Vite
- Tailwind CSS
- Framer Motion
- Supabase (auth, database, edge functions)
- Anthropic Claude (spark generation)

## Project Structure
```
scrollspark/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── supabase/
│   └── functions/
│       └── generate-spark/
│           └── index.ts        # Edge function that calls Claude
└── src/
    ├── main.jsx                # App entry point + routing
    ├── index.css               # Tailwind base styles
    ├── lib/
    │   └── supabaseClient.js   # Supabase client instance
    └── pages/
        └── Dashboard.jsx       # Main dashboard page
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase database
In your Supabase project, create a `user_profiles` table with these columns:
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `hobbies` (text array)
- `onboarding_complete` (boolean, default false)
- `current_streak` (integer, default 0)
- `longest_streak` (integer, default 0)
- `total_sparks` (integer, default 0)
- `last_spark_date` (date)
- `created_at` (timestamp with time zone)

### 3. Deploy the Edge Function
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy generate-spark
```

### 4. Run the app
```bash
npm run dev
```

## Pages to Build Next
- `/onboarding` — hobby selection + profile setup
- `/spark` — displays the generated spark message
- `/premium` — premium upgrade page
