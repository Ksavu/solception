# Solception web

Next.js frontend for the Solception program. Neon Solana theme, Phantom/Solflare/Backpack via Wallet Standard.

Pages: `/` explore · `/create` create launchpad · `/pad/[id]` launchpad + launch token · `/token/[mint]` trade, chart, curve progress · `/dashboard` claim fees.
`/api/meta` serves token metadata JSON so tokens can launch with just an image URL.

## Run locally
```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
```

## Deploy on Vercel
Import the GitHub repo → **Root Directory: `web`** → add the env vars from `.env.example` → Deploy.

## Env
| Var | Value |
|---|---|
| `NEXT_PUBLIC_PROGRAM_ID` | your program ID |
| `NEXT_PUBLIC_CLUSTER` | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_RPC_URL` | RPC endpoint (use Helius/QuickNode for real traffic) |

`scripts/e2e-local.ts` runs every transaction flow against a local validator.
