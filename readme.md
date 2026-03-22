# open-feed

A self-hosted news and social media aggregator.

[Documentation](https://docs.openfeed.dev)

## Quick start

```bash
npm install -g open-feed
open-feed
```

## UI components

Reusable UI primitives live in `src/ui_components/`. These are self-contained components styled with Tailwind CSS — no external platform dependency. Import from the barrel:

```ts
import { Badge, EmptyState, PageSpinner } from "./ui_components";
```

Add new components here when they are generic enough to be reused across pages. Keep app-specific logic in `src/components/` and `src/pages/`.

## Keeping things in sync

Whenever you add or change a feature, update:

- This readme
- The docs (`docs/`)
- The marketing website (`www/index.html`)
