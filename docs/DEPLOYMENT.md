# HTTPS and self-hosted TURN deployment

Do the localhost walkthrough first. This guide is a deployment template, not a claim that a public server has already been provisioned or tested. Replace all example domains/IPs/secrets. A VM with public networking is required; ordinary static website hosting cannot run this signaling/TURN stack.

## 1. Plan the endpoints

| Endpoint | Runs | Public ports |
| --- | --- | --- |
| calls.example.com | Caddy -> Node app on loopback:3001 | TCP 80 and 443 |
| turn.example.com (separate public IP recommended) | coturn | UDP/TCP 3478, TCP 443 for TURN/TLS, UDP 49160–49200 relay range |

TURN over TLS on TCP 443 is useful on restrictive networks, but cannot bypass every firewall. On the same IP, Caddy HTTPS and coturn TLS cannot both bind TCP 443. This guide therefore uses a dedicated TURN VM/IP. If sharing an IP, use coturn TLS port 5349 and update URLs/firewalls; some restrictive networks may still block it. An HTTP reverse proxy is not a replacement for a TURN relay.

Point DNS A records at the right public IPv4 addresses. Only publish AAAA records if IPv6 is also fully configured. Set records to direct DNS (do not put an ordinary HTTP CDN proxy in front of TURN).

Choose VM/GPU sizing later based on measurements; this two-person media path does not require an AI GPU. TURN bandwidth can dominate costs if both peers use relay. This POC's small relay port range and in-memory room state are not a high-concurrency design.

## 2. Prepare the application VM

Install Node.js 24 LTS, npm and Caddy using the official installation instructions for your distribution. Transfer the extracted source to `/opt/webrtc-poc`. Run as an unprivileged account. In that folder:

```bash
npm ci
npm run build
cp .env.example .env
```

Configure `.env`:

```dotenv
PORT=3001
HOST=127.0.0.1
ALLOWED_ORIGINS=https://calls.example.com
TRUST_PROXY=true
STUN_URL=stun:turn.example.com:3478
TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:443?transport=tcp
TURN_SECRET=YOUR_LONG_RANDOM_SECRET
ICE_TRANSPORT_POLICY=all
```

Generate a secret locally on the server:

```bash
openssl rand -hex 32
```

Use the SAME value for TURN_SECRET and coturn static-auth-secret. Do not commit .env or the populated TURN config. A valid room member receives a temporary username/password, not this shared secret. Credentials last three hours; rooms last at most two hours in this POC.

Run `npm start` briefly and check `curl http://127.0.0.1:3001/api/health`. Stop it before starting the systemd service to avoid a port conflict.

## 3. Run under systemd and add HTTPS

Create a dedicated `webrtc` system user, make the source readable to it and protect .env. The sample assumes this account exists and Node is at `/usr/bin/node`; check `command -v node` and adjust.

```bash
sudo useradd --system --home /opt/webrtc-poc --shell /usr/sbin/nologin webrtc
sudo chown -R webrtc:webrtc /opt/webrtc-poc
sudo chmod 600 /opt/webrtc-poc/.env
sudo cp deploy/webrtc-poc.service.example /etc/systemd/system/webrtc-poc.service
sudo systemctl daemon-reload
sudo systemctl enable --now webrtc-poc
sudo journalctl -u webrtc-poc -n 50
```

Use `deploy/Caddyfile.example` as the site block in `/etc/caddy/Caddyfile`, replacing the domain. Preserve any existing sites in that file. Validate and reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains trusted HTTPS certificates when DNS is correct and ports 80/443 are reachable. No Vite dev server is used in deployment. Keep Node port 3001 private. TRUST_PROXY=true assumes exactly one trusted proxy between the internet and Node; do not expose Node directly with that setting.

## 4. Install coturn on the TURN VM

For an Ubuntu VM:

```bash
sudo apt update
sudo apt install coturn certbot
```

Obtain a certificate for the TURN hostname. With no other service on port 80:

```bash
sudo certbot certonly --standalone -d turn.example.com
```

You need temporary/public port 80 for this HTTP challenge and for future standalone renewals, or choose a supported DNS challenge. Follow the certbot prompts with your real administrator email.

Copy `deploy/turnserver.conf.example` to `/etc/turnserver.conf`. Replace PUBLIC_IP, realm/domain and static-auth-secret. If the VM interface has a private address behind one-to-one NAT, use `external-ip=PUBLIC_IP/PRIVATE_IP`. Match the provider's actual network setup.

The sample uses copied certificates to give coturn restricted read access to its private key:

```bash
sudo install -d -m 750 -o turnserver -g turnserver /etc/turnserver/certs
sudo install -m 640 -o turnserver -g turnserver /etc/letsencrypt/live/turn.example.com/fullchain.pem /etc/turnserver/certs/fullchain.pem
sudo install -m 640 -o turnserver -g turnserver /etc/letsencrypt/live/turn.example.com/privkey.pem /etc/turnserver/certs/privkey.pem
sudo chown root:turnserver /etc/turnserver.conf
sudo chmod 640 /etc/turnserver.conf
sudo systemctl enable --now coturn
sudo systemctl restart coturn
sudo journalctl -u coturn -n 80
```

Confirm the installed package's service user/group (`systemctl cat coturn` / `getent passwd turnserver`) and adapt ownership if different. Some older distro packages also require enabling TURNSERVER_ENABLED in `/etc/default/coturn`; follow the installed package's service instructions.

Certificate renewals must copy renewed files and restart coturn. Install a root-owned deploy hook in `/etc/letsencrypt/renewal-hooks/deploy/` performing the two `install` commands above and `systemctl restart coturn`, restricted to this domain if the machine hosts other certificates. Test renewal with `sudo certbot renew --dry-run`. Do not leave TLS certificate renewal as a manual surprise.

## 5. Configure BOTH firewalls

Open the relevant ports in the cloud security group AND the VM firewall. Preserve your SSH access when changing firewall rules.

- Application VM: TCP 80/443; SSH only from your administrator IP where practical.
- TURN VM: UDP 3478, TCP 3478, TCP 443, UDP 49160–49200; port 80 for the certificate challenge if used.
- TURN VM outbound: permit traffic needed to reach public peers and DNS/certificate services.
- Keep room-service port 3001 off the public internet.

The TURN config rejects private/loopback peer destinations for this public-internet scenario. Adapt that policy deliberately for an internal-only deployment; do not disable authentication or create an anonymous public relay.

## 6. Verify real internet calls

1. Restart the Node app after .env changes: `sudo systemctl restart webrtc-poc`.
2. Open https://calls.example.com and create a NEW room.
3. Join from another laptop on a DIFFERENT network (e.g. a phone hotspot).
4. Confirm video/audio/chat and actual screen selection.
5. In Node .env, set `ICE_TRANSPORT_POLICY=relay`; restart the app and create a fresh room.
6. Join from both devices. The app's call footer should show **TURN relay** after the stats refresh.
7. If forced relay fails, inspect coturn logs, certificate/domain, TURN secret, external-ip mapping and relay UDP ports. Direct success does not validate TURN.
8. Separately test TURN/TLS: temporarily configure only the `turns:...:443?transport=tcp` URL and keep relay mode. Create a fresh room and retest. This proves TLS relay rather than only UDP TURN.
9. Restore normal URLs and `ICE_TRANSPORT_POLICY=all`, restart and create a new room.

Test Chrome/Edge desktop, multiple physical devices, blocked-UDP networks where available, a long call, screen-share stop from browser UI, peer refresh, and loss/recovery of connectivity. Automated fake-device tests cannot certify these paths.

## 7. Before using real interviews/appointments

Add application authentication and participant-specific room grants; protect room creation and TURN issuance with real account quotas. Add monitoring, structured redacted logs, a shared room store/adapter if multiple Node instances are needed, reliable recording storage if required, and explicit retention/deletion controls. Review dependency updates and benchmark under expected concurrent load.

This deliverable does not deploy any service, modify DNS or connect to the existing LiveKit project. Complete acceptance testing before moving that project to this transport.
