# Redis Cache Implementation

This implementation adds Redis support to the UAAA server cache system.

## Configuration

Add the following to your configuration file to use Redis cache:

```json
{
  "cacheType": "redis",
  "redisUrl": "redis://localhost:6379"
}
```

Configuration options:
- `cacheType`: Either "mongo" (default) or "redis"
- `redisUrl`: Redis connection URL (optional, defaults to `redis://localhost:6379` or `REDIS_URL` environment variable)

## Environment Variables

You can also configure Redis using environment variables:
- `REDIS_URL`: Redis connection URL

## Example Configuration

For development with Docker Compose:
```json
{
  "appId": "uaaa.local",
  "mongoUri": "mongodb://localhost:27017/uaaa",
  "cacheType": "redis",
  "redisUrl": "redis://localhost:6379",
  "plugins": [],
  "port": 3000,
  "deploymentUrl": "http://localhost:3000",
  "jwtTimeout": "1h",
  "refreshTimeout": "7d",
  "tokenTimeout": "10m"
}
```

For production:
```json
{
  "appId": "uaaa.prod",
  "mongoUri": "mongodb://mongo:27017/uaaa",
  "cacheType": "redis",
  "redisUrl": "redis://redis:6379",
  "plugins": [],
  "port": 3000,
  "deploymentUrl": "https://your-domain.com",
  "jwtTimeout": "1h",
  "refreshTimeout": "7d",
  "tokenTimeout": "10m"
}
```