# Deployment Guide

This guide covers deploying UAAA using Docker Compose.

## Prerequisites

### Install Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Other platforms:** Follow [official Docker installation guide](https://docs.docker.com/engine/install/)

Verify installation:
```bash
docker --version
docker compose version
```

## Quick Start

```bash
# Create deployment directory
mkdir uaaa && cd uaaa

# Create configuration
cat > config.json <<EOF
{
  "mongoUri": "mongodb://mongo:27017/uaaa",
  "plugins": ["password"],
  "port": 3030,
  "deploymentUrl": "http://localhost:3030"
}
EOF

# Create docker-compose.yml
cat > docker-compose.yml <<EOF
services:
  server:
    image: git.pku.edu.cn/uaaa/server-full:latest
    ports:
      - "3030:3030"
    volumes:
      - ./config.json:/etc/uaaa/config.json
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
EOF

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

Visit `http://localhost:3030` to access UAAA.

## Docker Images

UAAA provides four Docker images:

| Image | Description |
|-------|-------------|
| `git.pku.edu.cn/uaaa/server` | Backend API only |
| `git.pku.edu.cn/uaaa/server-full` | Backend + Frontend (all-in-one) |
| `git.pku.edu.cn/uaaa/ui` | Frontend only (Caddy) |
| `git.pku.edu.cn/uaaa/proxy` | OAuth2/OIDC proxy |

**Recommendation:** Use `server-full` for simple deployments.

## Configuration

### Minimal Configuration

```json
{
  "mongoUri": "mongodb://mongo:27017/uaaa",
  "plugins": ["password"],
  "port": 3030,
  "deploymentUrl": "http://localhost:3030"
}
```

### Common Configuration

```json
{
  "mongoUri": "mongodb://mongo:27017/uaaa",
  "plugins": ["oidc", "password", "email", "totp", "webauthn"],
  "port": 3030,
  "deploymentUrl": "https://auth.example.com",
  "tokenTimeout": "30min",
  "sessionTimeout": "30d",
  "emailTransport": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@gmail.com",
      "pass": "app-password"
    }
  },
  "emailFrom": "UAAA <noreply@example.com>"
}
```

**Available plugins:** `oidc`, `password`, `email`, `sms`, `totp`, `webauthn`

For complete configuration options, see [Configuration Reference](./configuration).

## Production Deployment

For production, pin image versions and add restart policies:

```yaml
services:
  server:
    image: git.pku.edu.cn/uaaa/server-full:0.4.0  # Pin specific version
    ports:
      - "3030:3030"
    volumes:
      - ./config.json:/etc/uaaa/config.json
    depends_on:
      - mongo
    restart: always

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    restart: always

volumes:
  mongo-data:
```

**Production checklist:**
- Pin Docker image versions (don't use `latest`)
- Configure reverse proxy with SSL/TLS
- Set up regular MongoDB backups
- Configure email SMTP if using email plugin
- Use strong passwords for admin accounts

## Managing Services

### Start services
```bash
docker compose up -d
```

### View logs
```bash
docker compose logs -f
```

### Stop services
```bash
docker compose down
```

### Restart a service
```bash
docker compose restart server
```

### Update to new version
```bash
docker compose pull
docker compose up -d
```

## First-Time Setup

After starting containers, create an admin user:

```bash
docker compose run --rm server register-user --username admin
```

The command will prompt for additional information. You can also specify claims:

```bash
docker compose run --rm server register-user \
  --username admin \
  --claim email admin@example.com verified \
  --claim is_admin true verified
```

## Troubleshooting

### Check container status
```bash
docker compose ps
```

### View logs
```bash
docker compose logs server
docker compose logs mongo
```

### Test MongoDB connection
```bash
docker compose exec mongo mongosh --eval "db.runCommand({ping: 1})"
```

### Access server container
```bash
docker compose exec server sh
```

### Common issues

**Port already in use:**
```yaml
ports:
  - "3031:3030"  # Change host port
```

**MongoDB connection failed:**
- Check `mongoUri` in config.json
- Verify MongoDB container is running: `docker compose ps mongo`

**Plugin not loaded:**
- Check plugin name in config.json
- Ensure plugin is in the `plugins` array

## Next Steps

- **[Configuration Reference](./configuration)**: Complete configuration options
- **[Maintenance Guide](./maintenance)**: Backup and monitoring
- **[Integration Guides](./integrations/oauth2-oidc)**: Integrate applications with UAAA
