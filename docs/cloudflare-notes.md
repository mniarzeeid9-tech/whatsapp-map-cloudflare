# Cloudflare deployment notes

These implementation decisions follow the Cloudflare documentation checked on 2026-10-04:

- Static assets can be configured with `[assets] directory = "./dist"` and an optional `binding = "ASSETS"`; the Worker can serve them with `env.ASSETS.fetch(request)`.
  Source: https://developers.cloudflare.com/workers/static-assets/binding/
- A Worker can route WebSocket upgrades to a Durable Object. Durable Objects support a standard WebSocket pair and can keep ephemeral connection state in memory when the application does not call the storage API.
  Source: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- New Durable Object namespaces should use the SQLite-backed migration syntax `new_sqlite_classes`; this project declares the class but intentionally never writes user data to `ctx.storage`.
  Source: https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/
- Cloudflare documents the Worker `deploy` command through Wrangler. Deployment is not executed by this repository change; it requires the operator's Cloudflare authentication and account/zone choice.
  Source: https://developers.cloudflare.com/workers/wrangler/commands/workers/
