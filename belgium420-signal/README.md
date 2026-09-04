# belgium420-signal — Signal CLI REST API setup for Hermes Agent

Dockerized [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) that your cloud Hermes agent talks to via REST. Hermes sends messages by calling the MCP-wrapped HTTP endpoints.

## Files
- `docker-compose.yml` — runs the signal-cli-rest-api container
- `register.sh` — first-time phone number registration (QR link mode)
- `send.sh` — send a message via curl
- `receive.sh` — poll for new messages
- `config.yaml.snippet` — add to your Hermes config.yaml to wire the MCP server

## Quick start

```bash
# 1. Start the container
cd /path/to/belgium420-signal
docker compose up -d

# 2. Register (link as secondary device on your phone)
./register.sh

# 3. Send a test message
./send.sh "+1234567890" "Belgium420 bot online — test message"

# 4. Add to Hermes config → hermes config set, then restart
# 5. Use in chat: "Send a Signal to +1234567890: order confirmed B420-..."
```

See `README.md` for full details.
