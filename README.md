# About template

Simple BUN template 

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

# OpenAPI
This template uses OpenAPI in version 3.1.0, raw JSON output is available by default at `localhost:3137/docs`.

# SwaggerUI
This template uses integrated SwaggerUI, which is available at `localhost:3137/ui`.

# Database (PostgreSQL)
Set `DATABASE_URL` or the `DB_*` environment variables in your `.env` file.
Run `bun run db:seed` to create the `users` table and insert dummy data when it is empty.

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.