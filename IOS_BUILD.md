# God's Eye View for iPhone

This fork preserves the upstream browser interface and loads it in a full-screen iOS shell. The live data proxies, protected credentials, voice token creation, and vessel connection stay on the companion Node server.

## 1. Deploy the server to Railway

1. Push this repository to GitHub.
2. In Railway, choose **New Project → Deploy from GitHub repo** and select it.
3. Generate a public Railway domain after the first deployment.
4. Generate a private random value of at least 32 characters. Add it as the Railway variable `GEV_ACCESS_KEY`.
5. Add optional provider keys as Railway variables. Start with `CESIUM_ION_TOKEN`; add `OPENAI_API_KEY` for voice. Other supported names are listed in `.env.example`.

Do not put secret keys into `capacitor.config.ts`, the IPA, or a public GitHub repository.

## 2. Build the unsigned IPA

1. In the GitHub repository settings, add an Actions variable named `GEV_SERVER_URL` containing the full Railway HTTPS domain, such as `https://your-service.up.railway.app`.
2. Add an Actions secret named `GEV_ACCESS_KEY` containing exactly the same private value used in Railway.
3. Open **Actions → Build unsigned iPhone IPA → Run workflow**.
4. When the workflow finishes, download the `GodsEyeView-unsigned-ipa` artifact.
5. Unzip the downloaded artifact once to obtain `GodsEyeView-unsigned.ipa`.
6. Sign that IPA with the same signer used for your other sideloaded apps, then install it.

## Local verification

```bash
npm ci
npm run doctor
npm test
npm run build
```

The iOS project is generated and synchronized with:

```bash
GEV_SERVER_URL=https://your-service.up.railway.app \
GEV_APP_ACCESS_KEY=your-private-32-character-or-longer-key \
npm run ios:sync
```

The sync command also regenerates the iOS icon and launch artwork from the original `public/logo.svg`, keeping binary build outputs out of the repository.

The URL must use HTTPS. Without `GEV_SERVER_URL`, the shell receives the bundled frontend for development, but server-backed live layers will not work. The access key is exchanged for a secure, HTTP-only cookie on first launch and removed from the visible URL before the interface loads.
