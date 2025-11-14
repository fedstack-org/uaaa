# Maintenance and Operations

This guide covers ongoing maintenance, monitoring, troubleshooting, and operational procedures for UAAA.

::: tip Note on Deployment
This guide assumes Docker Compose deployment as described in the [Deployment Guide](./deployment). Commands and paths may differ for other deployment methods.
:::

## Regular Maintenance Tasks

### Daily Tasks

#### Monitor System Health

```bash
# Check Docker service status
docker compose ps

# Check logs for errors
docker compose logs server --since 24h | grep -i error

# Verify database connectivity
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Check disk space
df -h
docker system df
```

#### Review Access Logs

```bash
# View server logs
docker compose logs server --tail 100

# Filter for specific patterns
docker compose logs server | grep "auth.login"
docker compose logs server | grep "rate_limit"
```

### Weekly Tasks

#### Database Maintenance

```bash
# Compact collections
docker compose exec mongo mongosh uaaa --eval "db.runCommand({compact: 'sessions'})"
docker compose exec mongo mongosh uaaa --eval "db.runCommand({compact: 'tokens'})"

# Rebuild indexes
docker compose exec mongo mongosh uaaa --eval "db.users.reIndex()"
docker compose exec mongo mongosh uaaa --eval "db.credentials.reIndex()"

# Check database stats
docker compose exec mongo mongosh uaaa --eval "db.stats()"
```

#### Review Security

```bash
# Active sessions by user
docker compose exec mongo mongosh uaaa --eval "db.sessions.aggregate([
  { \$match: { validBefore: { \$gt: Date.now() } } },
  { \$group: { _id: '\$userId', count: { \$sum: 1 } } },
  { \$sort: { count: -1 } },
  { \$limit: 20 }
])"

# Issued tokens by app
docker compose exec mongo mongosh uaaa --eval "db.tokens.aggregate([
  { \$group: { _id: '\$appId', count: { \$sum: 1 } } },
  { \$sort: { count: -1 } }
])"
```

### Monthly Tasks

#### Performance Review

```bash
# Review Docker logs for performance patterns
docker compose logs server --since 720h | grep -i "slow\|timeout" | tail -50

# Check container resource usage
docker stats --no-stream
```

#### Update Software

```bash
# Update UAAA (Docker deployment)
docker compose pull
docker compose up -d

# Update system packages (if self-hosting)
sudo apt update && sudo apt upgrade -y
```

#### Rotate Secrets

UAAA uses RS256 key pairs (automatically generated) for JWT signing, not shared secrets. Key rotation is handled internally. If you need to rotate sensitive configuration values (SMTP passwords, API keys):

```bash
# Update configuration file with new values
nano config.json

# Restart service
docker compose restart server
```

## Monitoring

### Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| CPU Usage | 70% | 90% |
| Memory Usage | 80% | 95% |
| Disk Usage | 80% | 90% |
| Database Connections | 80/100 | 95/100 |
| Response Time | 500ms | 1000ms |
| Error Rate | 1% | 5% |
| Failed Logins | 10/min | 50/min |

### Health Checks

UAAA provides `/api/public/health` endpoint:

```bash
curl http://localhost:3000/api/public/health
```

Response:
```json
{
  "status": "ok"
}
```

For detailed monitoring, check Docker container status and MongoDB connectivity:

```bash
docker compose ps
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

### Log Analysis

#### Common Log Patterns

```bash
# Authentication success
docker compose logs server | grep '"event":"auth.login.success"'

# Authentication failures
docker compose logs server | grep '"event":"auth.login.failed"'

# Rate limit hits
docker compose logs server | grep '"event":"rate_limit.exceeded"'

# Database errors
docker compose logs server | grep '"level":"error"' | grep database

# Plugin errors
docker compose logs server | grep '"event":"plugin.error"'
```

## Backup and Recovery

### Backup Strategy

**Full Backup (Daily):**
```bash
#!/bin/bash
# /usr/local/bin/uaaa-backup-full.sh

BACKUP_DIR=/backup/uaaa
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_DIR=/path/to/uaaa  # Update to your docker-compose location

cd "$COMPOSE_DIR"

# Database
docker compose exec -T mongo mongodump --uri="mongodb://localhost:27017/uaaa" \
  --out="/tmp/db-$DATE"
docker compose cp mongo:/tmp/db-$DATE "$BACKUP_DIR/db-$DATE"
docker compose exec -T mongo rm -rf "/tmp/db-$DATE"

# Configuration
cp config.json "$BACKUP_DIR/config-$DATE.json"

# Compress
tar -czf "$BACKUP_DIR/full-$DATE.tar.gz" \
  -C "$BACKUP_DIR" "db-$DATE" "config-$DATE.json"

# Cleanup
rm -rf "$BACKUP_DIR/db-$DATE" "$BACKUP_DIR/config-$DATE.json"
find "$BACKUP_DIR" -name "full-*.tar.gz" -mtime +30 -delete
```

**Incremental Backup (Hourly):**
```bash
#!/bin/bash
# /usr/local/bin/uaaa-backup-incremental.sh

BACKUP_DIR=/backup/uaaa/incremental
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_DIR=/path/to/uaaa  # Update to your docker-compose location

cd "$COMPOSE_DIR"

# Export oplog for point-in-time recovery
docker compose exec -T mongo mongodump --uri="mongodb://localhost:27017/local" \
  --collection=oplog.rs \
  --out="/tmp/oplog-$DATE"
docker compose cp mongo:/tmp/oplog-$DATE "$BACKUP_DIR/oplog-$DATE"
docker compose exec -T mongo rm -rf "/tmp/oplog-$DATE"

tar -czf "$BACKUP_DIR/oplog-$DATE.tar.gz" -C "$BACKUP_DIR" "oplog-$DATE"
rm -rf "$BACKUP_DIR/oplog-$DATE"
find "$BACKUP_DIR" -name "oplog-*.tar.gz" -mtime +7 -delete
```

### Recovery Procedures

**Restore from Full Backup:**
```bash
# Stop service
docker compose stop server

# Extract backup
tar -xzf /backup/uaaa/full-20240101_020000.tar.gz -C /tmp

# Restore database
docker compose exec mongo mongorestore --uri="mongodb://localhost:27017" \
  --drop \
  /tmp/db-20240101_020000

# Restore configuration
cp /tmp/config-20240101_020000.json ./config.json

# Start service
docker compose start server
```

**Point-in-Time Recovery:**
```bash
# Restore full backup first (see above)

# Apply oplog entries up to specific timestamp
docker compose exec mongo mongorestore --uri="mongodb://localhost:27017" \
  --oplogReplay \
  --oplogLimit="1704153600:1" \
  /backup/uaaa/incremental/oplog-*/local/oplog.rs.bson
```

## User Management

### List Users

```javascript
// mongosh uaaa
db.users.find({}, {
  _id: 1,
  "claims.username.value": 1,
  "claims.email.value": 1,
  createdAt: 1
}).limit(20)
```

### Disable User

```javascript
// Mark all credentials as disabled
db.credentials.updateMany(
  { userId: "user_id_here" },
  { $set: { disabled: true } }
)

// Terminate all sessions
db.sessions.deleteMany({ userId: "user_id_here" })

// Revoke all tokens
db.tokens.deleteMany({ userId: "user_id_here" })
```

### Reset Password

Password reset must be done through the credential system. Users can reset their password via the email recovery flow in the UI, or you can manually update credentials using the CLI:

```bash
# Find the user's password credential
docker compose run --rm server find-credential --config /etc/uaaa/config.json \
  -u user_id_here -t password

# Delete the old password credential
docker compose exec mongo mongosh uaaa --eval \
  'db.credentials.deleteOne({_id: "credential_id_here"})'

# User can now set a new password through the UI
```

### Grant Admin Permissions

```javascript
// Add admin permissions to user
db.users.updateOne(
  { _id: "user_id_here" },
  {
    $set: {
      "claims.permissions.value": JSON.stringify([
        "uaaa/**",
        "*/admin/**"
      ]),
      "claims.permissions.verified": true
    }
  }
)
```

## Session Management

### View Active Sessions

```javascript
db.sessions.find({
  validBefore: { $gt: Date.now() }
}).sort({ updatedAt: -1 }).limit(20)
```

### Revoke All User Sessions

```bash
# Using API - terminate specific session
curl -X POST https://auth.example.com/api/user/session/{session_id}/terminate \
  -H "Authorization: Bearer <admin_token>"

# Using MongoDB - revoke all sessions for a user
docker compose exec mongo mongosh uaaa --eval \
  'db.sessions.deleteMany({userId: "user_id_here"})'
```

### Force Logout All Users

```javascript
// Emergency: revoke all sessions
db.sessions.deleteMany({})
db.tokens.deleteMany({})
```

## Application Management

### Register Application

```bash
curl -X POST https://auth.example.com/api/console/app \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "_id": "app.example.com",
    "name": "Example App",
    "description": "My application",
    "callbackUrls": ["https://app.example.com/callback"]
  }'
```

### Update Application

```javascript
db.apps.updateOne(
  { _id: "app.example.com" },
  {
    $set: {
      name: "Updated Name",
      redirectUris: ["https://app.example.com/callback", "https://app.example.com/auth"]
    }
  }
)
```

### Revoke Application Tokens

```javascript
db.tokens.deleteMany({ appId: "app.example.com" })
```

## Performance Tuning

### Database Indexes

```javascript
// Verify indexes
db.users.getIndexes()
db.credentials.getIndexes()
db.sessions.getIndexes()
db.tokens.getIndexes()

// Add custom indexes if needed
db.tokens.createIndex({ appId: 1, userId: 1 })
db.sessions.createIndex({ userId: 1, securityLevel: 1 })
```

### Connection Pooling

```json
{
  "db": {
    "options": {
      "maxPoolSize": 100,
      "minPoolSize": 10,
      "maxIdleTimeMS": 30000
    }
  }
}
```

### Caching

Consider Redis for token validation caching:

```json
{
  "cache": {
    "enabled": true,
    "redis": {
      "host": "localhost",
      "port": 6379,
      "ttl": 300
    }
  }
}
```

## Troubleshooting

### Common Issues

#### High CPU Usage

**Causes:**
- Too many authentication requests
- Inefficient database queries
- Plugin issues

**Solutions:**
```bash
# Check top processes
top

# Review slow queries
mongosh uaaa --eval "db.setProfilingLevel(2, 100)"
mongosh uaaa --eval "db.system.profile.find().sort({ts:-1}).limit(10)"

# Enable query profiling
echo "slowms=100" >> /etc/mongod.conf
```

#### High Memory Usage

**Causes:**
- Memory leaks
- Too many cached sessions
- Large log files

**Solutions:**
```bash
# Check memory usage
docker stats --no-stream

# Clear old sessions
docker compose exec mongo mongosh uaaa --eval \
  "db.sessions.deleteMany({validBefore: {\$lt: Date.now()}})"

# Restart service
docker compose restart server
```

#### Database Connection Errors

**Causes:**
- MongoDB not running
- Network issues
- Connection pool exhausted

**Solutions:**
```bash
# Check MongoDB container
docker compose ps mongo
docker compose logs mongo

# Test MongoDB connectivity
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Check inter-container networking
docker compose exec server ping mongo

# Review MongoDB connection string in config.json
```

#### Failed Authentications

**Causes:**
- Incorrect credentials
- Rate limiting
- Plugin errors
- Network issues (SMTP, SMS)

**Solutions:**
```bash
# Check Docker logs
docker compose logs server | grep -i error | tail -20

# Test SMTP connection
docker compose exec server node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({/* your config */});
transport.verify().then(console.log).catch(console.error);
"

# Check enabled plugins in configuration
cat config.json | grep plugins
```

## Security Incidents

### Suspected Breach

1. **Immediate Actions:**
```bash
# Revoke all sessions and tokens
docker compose exec mongo mongosh uaaa --eval "db.sessions.deleteMany({})"
docker compose exec mongo mongosh uaaa --eval "db.tokens.deleteMany({})"

# Disable service temporarily
docker compose stop server

# Backup current state
docker compose exec mongo mongodump --uri="mongodb://localhost:27017/uaaa" \
  --out=/backup/incident-$(date +%s)
```

2. **Investigation:**
```bash
# Review logs for suspicious activity
docker compose logs server | grep "auth.login" > /tmp/auth-analysis.log

# Analyze IP addresses
docker compose logs server | grep -oP 'ip":\s*"\K[^"]+' | sort | uniq -c | sort -rn
```

3. **Remediation:**
- Revoke all active sessions (done in step 1)
- Reset compromised admin passwords
- Review and update user permissions
- Rotate sensitive configuration values (SMTP passwords, API keys)
- Notify affected users
- Update security measures and monitoring

### Credential Compromise

```bash
# Find compromised user
# Disable account
# Reset credentials
# Revoke all sessions/tokens
# Audit access history
```

## Disaster Recovery

### Recovery Time Objectives

- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 15 minutes

### Recovery Procedures

1. **Provision new infrastructure**
2. **Restore from backup**
3. **Update DNS/load balancer**
4. **Validate functionality**
5. **Resume operations**

## Next Steps

- **[Configuration](./configuration)**: Review configuration options
- **[Deployment](./deployment)**: Deployment procedures
- **[Security Best Practices](./architecture#security-considerations)**: Security guidelines
