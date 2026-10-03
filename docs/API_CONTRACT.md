# DayTrail API contract

Base URL local mac dinh: `http://localhost:4000`.

## GET /api/health

HTTP 200 khi API process dang hoat dong. Endpoint khong phu thuoc MongoDB.

```json
{ "status": "ok", "service": "daytrail-api" }
```

## GET /api/ready

Ping MongoDB voi timeout huu han.

- HTTP 200: `{ "status": "ready" }`
- HTTP 503: `{ "status": "not_ready" }`

Response khong chua URI, hostname, username, password hay thong tin noi bo cua Atlas.
