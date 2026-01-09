This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PostgreSQL Access (เข้าฐานข้อมูล Postgres)

Use these commands to connect to the Postgres database running in Docker.

- Start the database (if not already running):

```bash
docker compose up -d postgres
```

- Connect via `docker exec` (interactive, prompts for password):

```bash
docker exec -it chat_aio_postgres psql -U postgres -d chat-aio
```

- Connect via `docker exec` without password prompt (set env var inline):

```bash
docker exec -e PGPASSWORD=1234 -it chat_aio_postgres psql -U postgres -d chat-aio
```

- Connect from host machine using `psql` (alternative):
	- Windows PowerShell

```powershell
$Env:PGPASSWORD = "1234"; psql -h localhost -p 5432 -U postgres -d chat-aio
```

	- Windows CMD

```cmd
set PGPASSWORD=1234 && psql -h localhost -p 5432 -U postgres -d chat-aio
```

Helpful psql commands: `\l` list databases, `\dt` list tables, `\q` quit.
