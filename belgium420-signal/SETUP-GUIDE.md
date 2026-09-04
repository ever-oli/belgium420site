# belgium420-signal Setup Guide

## What's running

- **signal-cli REST API** Docker container (`bbernhard/signal-cli-rest-api`) — up on port `9090` locally
- Health check: `curl http://localhost:9090/v1/about`
- Container managed by docker-compose in this directory

## Registering your phone number

Your number: `+1 956 222 4814`

To link as a secondary device:
```bash
open http://localhost:9090/v1/qrcodelink?device_name=hermes-belgium420
```
Then on your phone: **Signal → Settings → Linked Devices → tap '+' → Scan QR**

Check registration:
```bash
curl "http://localhost:9090/v1/lookup/+19562224814"
```

## Connecting to cloud Hermes

The cloud Hermes agent needs a **public HTTPS URL** to reach your local signal-cli. We tried:

| Method | Result |
|--------|--------|
| localtunnel (`*.loca.lt`) | ❌ TLS handshake timeout from cloud VPS |
| serveo.net (SSH reverse tunnel) | ❌ Remote port forwarding failed |
| Direct public IP | ✅ Your IP is `200.77.201.219`, but you'd need port forwarding on your router |
| SSH reverse tunnel to cloud VPS | ⚠️ Needs SSH access to the cloud VPS |

### Recommended: SSH reverse tunnel

If your cloud Hermes VPS allows incoming SSH (port 22), you can reverse tunnel:

```bash
ssh -R 9090:localhost:9090 user@<cloud-vps-ip>
```

Then the cloud Hermes Signal config would use `http://<cloud-vps-ip>:9090`.

If you don't have SSH access or the cloud VPS blocks incoming SSH, the alternative is to run the signal-cli container **on the same VPS** as your cloud Hermes — that way both run in the same environment with no tunnel needed.

## Hermes config

Once you have a reachable URL, add this to your cloud Hermes `~/.hermes/config.yaml`:

```yaml
platforms:
  signal:
    enabled: true
    signal_http_url: "http://<your-reachable-url>:9090"     # e.g. http://localhost:9090 if co-located
    signal_account: "+19562224814"                          # your Signal number
    signal_allowed_users: "+19562224814"                    # who can message the bot (comma-separated)
```

Then restart: `hermes restart`

## Testing

Send a message:
```bash
curl -X POST "http://localhost:9090/v2/send" \
  -H "Content-Type: application/json" \
  -d '{"message":"Belgium420 bot online","number":"+19562224814","recipients":["+19562224814"]}'
```

Receive messages:
```bash
curl "http://localhost:9090/v1/receive" | jq .
```

## Docker commands

```bash
docker compose up -d          # start
docker compose down           # stop + remove
docker compose logs -f        # follow logs
docker compose restart        # restart
```
