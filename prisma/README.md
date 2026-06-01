# Prisma (local SQLite)

Producer-only database for episode editing. **Not** the live MySQL `questions` database.

| Context | Database file |
|---------|----------------|
| Prisma CLI (`.env`) | `prisma/dev.db` |
| Electron app runtime | `%APPDATA%/…/producer-data/producer.db` |

```bash
npx prisma generate
npx prisma migrate dev
```
