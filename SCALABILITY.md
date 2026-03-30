# Scalability Architecture Note

## Current Architecture

The current system is a well-structured monolith — a single Express app connecting to MongoDB and optionally Redis. This is the right starting point: simple to deploy, easy to reason about, and sufficient for thousands of concurrent users when properly tuned.

---

## Horizontal Scaling (Stateless Design)

The API is designed to scale horizontally from day one:

- **JWT is stateless** — no server-side session storage. Any instance can verify any token.
- **Refresh tokens in DB** — the only stateful element; can be moved to Redis for fast distributed invalidation.
- **No in-memory state** — no in-process caches or global variables that would break with multiple instances.

```
                    ┌─────────────────────────────────────────┐
                    │           Load Balancer (Nginx/ALB)      │
                    └────────┬───────────────────┬────────────┘
                             │                   │
                    ┌────────▼──────┐   ┌────────▼──────┐
                    │  API Node 1   │   │  API Node 2   │  ← Scale out
                    └────────┬──────┘   └────────┬──────┘
                             └──────────┬─────────┘
                                        │
                        ┌───────────────┼──────────────┐
                        │               │              │
                 ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
                 │  MongoDB    │ │    Redis    │ │  File/CDN  │
                 │  Replica    │ │  Cluster    │ │  (future)  │
                 │   Set       │ │  (cache)    │ └────────────┘
                 └─────────────┘ └─────────────┘
```

---

## Caching Strategy (Redis)

Two caching layers are planned:

### 1. Response Caching
Cache expensive read queries (e.g., admin dashboard stats) with a short TTL:

```js
// Pseudocode
const cached = await redis.get('admin:dashboard');
if (cached) return JSON.parse(cached);
const data = await computeDashboard();
await redis.setEx('admin:dashboard', 60, JSON.stringify(data)); // 60s TTL
return data;
```

### 2. Refresh Token Store
Move refresh tokens from MongoDB to Redis for O(1) lookup and automatic expiry:

```js
await redis.setEx(`refresh:${userId}`, 30 * 24 * 3600, token);
```

---

## Database Scaling

### MongoDB Replica Set
- Primary handles writes; secondaries handle reads (`readPreference: secondaryPreferred`)
- Automatic failover in under 10 seconds

### Indexes Already In Place
```js
userSchema.index({ email: 1 });            // Login lookup
taskSchema.index({ owner: 1, status: 1 }); // Filtered task lists
taskSchema.index({ owner: 1, createdAt: -1 }); // Sorted pagination
```

### Future: Sharding
If the task collection grows to 100M+ documents, shard by `owner` (hash-based) to distribute writes across shards.

---

## Microservices Path

When the monolith becomes a bottleneck, split along domain boundaries:

```
API Gateway (Kong / AWS API Gateway)
     │
     ├── Auth Service       (users, tokens)
     ├── Task Service       (tasks, tags)
     ├── Notification Svc   (email, webhooks)
     └── Admin Service      (stats, user mgmt)
```

Communication: REST for sync calls, **message queue (RabbitMQ / Kafka)** for async events (e.g., "task completed → send email notification").

---

## Observability

For production, add:

| Concern     | Tool                          |
|-------------|-------------------------------|
| Logging     | Winston → ELK Stack / Datadog |
| Metrics     | Prometheus + Grafana          |
| Tracing     | OpenTelemetry + Jaeger        |
| Uptime      | Health check endpoint `/health` |
| Alerting    | PagerDuty / OpsGenie          |

---

## Load Testing Targets

Before scaling out, verify the single instance can handle:

- **1,000 RPS** on read endpoints (GET /tasks)
- **200 RPS** on write endpoints (POST /tasks)
- **50 RPS** on auth endpoints (rate-limiter enforced at 10/15min per IP)

Tools: [k6](https://k6.io), Apache JMeter, or Artillery.

---

## Summary Table

| Scale Level        | Strategy                                       |
|--------------------|------------------------------------------------|
| 0 → 10k users      | Single instance + MongoDB Atlas M10            |
| 10k → 100k users   | Horizontal scale (2–4 nodes) + Redis cache     |
| 100k → 1M users    | MongoDB replica set + read replicas + CDN      |
| 1M+ users          | Microservices + Kafka + MongoDB sharding       |
