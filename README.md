## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` in the project root (or copy from `.env.local.example`) and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it to browser code.

## Verify Supabase Connection

With `npm run dev` running, visit [http://localhost:3000](http://localhost:3000):

- If the query to `organizations` succeeds, the page shows `Connected ✅`.
- If it fails, the page shows a clear error message.
# kolkoi
