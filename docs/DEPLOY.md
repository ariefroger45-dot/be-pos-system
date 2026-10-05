# Deployment (Railway)

The app reads all configuration from environment variables. The `.env` file is
gitignored and `.dockerignore`d, so it is **not** present in the deployed
image. Every variable must be set in the Railway service.

## 1. Required variables

Set these in Railway: **Service -> Variables -> Raw Editor**.

| Variable | Example / source |
|----------|------------------|
| `MONGODB_URI` | `mongodb+srv://<user>:<pass>@<cluster>/<db>?appName=<app>` (copy from local `.env`) |
| `JWT_ACCESS_SECRET` | any long random string |
| `JWT_REFRESH_SECRET` | any long random string |

Optional (email receipts):

| Variable | Notes |
|----------|-------|
| `SMTP_HOST` | leave empty to disable email |
| `SMTP_PORT` | default `587` |
| `SMTP_SECURE` | `true` for port 465 |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `MAIL_FROM` | sender name/address |

`PORT` is provided by Railway automatically. The app already binds it.

## 2. Error this fixes

```
TypeError: Configuration key "MONGODB_URI" does not exist
    at ConfigService.getOrThrow
```

Cause: no `MONGODB_URI` in the Railway environment, so the app crash-loops at
boot. Fix by adding the variable above.

`MONGO_URL`, `MONGODB_URL`, and `DATABASE_URL` are also accepted, matching names
used by the Railway MongoDB plugin and other hosts.

At boot the app prints a masked diagnostic line (no secret values):

```
[env] total=42 port=3000 nodeEnv=production present=[MONGODB_URI] missing=[MONGO_URL,MONGODB_URL,DATABASE_URL]
```

If `MONGODB_URI` is not in `present=[...]`, the variable did not reach the
container. Check that the variable is set on **this** service (not only on
another service or on unlinked project shared variables) and in the same
environment as the deployment.

## 3. MongoDB Atlas network access

Railway connects from dynamic outbound IPs. In Atlas: **Network Access ->
Add IP Address -> Allow access from anywhere (0.0.0.0/0)** for a quick start, or
add Railway's static egress IPs for production.

## 4. Deploy steps

1. Add the required variables.
2. Redeploy the service.
3. Check logs for `Nest application successfully started`.
4. Open `https://<service>.up.railway.app/docs` for Swagger.

## 5. Verify with the API

```bash
curl -X POST https://<service>.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pos.test","password":"admin1234"}'
```

A `200` with `accessToken` means env vars and database access are correct.
