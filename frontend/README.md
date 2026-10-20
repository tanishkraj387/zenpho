# Zenpho frontend and local judge

Use two terminals in `frontend/` on the computer hosting the website. Docker Desktop must be installed and running in Linux-container mode.

```powershell
npm install
docker info
docker pull python:3.12-alpine
docker pull node:22-alpine
npm run judge
```

In the second terminal:

```powershell
npm run dev -- --host 0.0.0.0
```

Open the URL shown by Vite. A browser on another device needs access to both the website port and TCP port 8787 on the host computer. The frontend uses the website hostname and port 8787 for the judge by default. Set `VITE_JUDGE_URL` only if the judge runs on a different host; restart Vite after changing a `VITE_` setting.

`npm run judge` starts an HTTP server, not a persistent Docker container. Each Run or Submit request creates a short-lived container, and `--rm` removes it after the tests finish. If `docker info` fails, start Docker Desktop and retry before submitting. If the browser reports that it cannot reach the judge, check the host address, port 8787, and the host firewall.

To check the full Python judging path, leave `npm run judge` running and use a third terminal in `frontend/`:

```powershell
npm run judge:check
```

This submits a known-good two-sum solution to the local judge and reports each checkpoint. It does not save player progress or grant rewards.
