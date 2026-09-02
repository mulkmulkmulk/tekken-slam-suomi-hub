import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 5173);
const PUBLIC_DIR = path.join(__dirname, "public");

// Load a small .env file without an external dependency. Existing process.env
// values win, so this also works cleanly with systemd EnvironmentFile=.
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const TWITCH_LOGINS = [
  "eryoces",
  "jonssi_",
  "suikkari96",
  "pi4ch",
  "anmiina",
  "huntari_",
  "r1sbe",
  "socaw",
  "iroaoyamada",
  "the_katjaanaa",
  "sitragaming",
  "mr_randomizer_",
  "lancelotssb",
  "z33cus",
  "ouluarcticgaming",
  "theeelio",
];
const TWITCH_CACHE_MS = 30_000;
let twitchTokenCache = { token: "", expiresAt: 0 };
let twitchLiveCache = { payload: null, expiresAt: 0 };

const COACH_MEDIA_ORIGIN = "https://raw.githubusercontent.com/mulkmulkmulk/tekken-slam-suomi-valmentajat/main/docs/media";
const COACH_DATA_URL = "https://raw.githubusercontent.com/mulkmulkmulk/tekken-slam-suomi-valmentajat/main/data/coaches.json";
// The roster changes at most a few times a day right now, so a short cache
// is enough to avoid hammering GitHub while still picking up new coaches
// pushed to the valmentajat repo within a few minutes.
const COACHES_CACHE_MS = 5 * 60 * 1000;
let coachesCache = { payload: null, expiresAt: 0 };

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8"
};

const contentType = (filePath) => mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";

function sendFile(req, res, filePath) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 - Tiedostoa ei löytynyt");
      return;
    }

    const type = contentType(filePath);
    if (type.startsWith("video/")) {
      const range = req.headers.range;
      if (range) {
        const fileSize = stats.size;
        const [rawStart, rawEnd] = range.replace(/bytes=/, "").split("-");
        const start = Number.parseInt(rawStart, 10);
        const end = rawEnd ? Math.min(Number.parseInt(rawEnd, 10), fileSize - 1) : fileSize - 1;
        if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > end || end >= fileSize) {
          res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Content-Type": type,
          "Cache-Control": "no-cache"
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": type,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache"
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(200, { "Content-Length": stats.size, "Content-Type": type, "Cache-Control": "no-cache" });
    fs.createReadStream(filePath).pipe(res);
  });
}


async function proxyCoachMedia(req, res, requestPath) {
  const relativePath = requestPath.replace(/^\/coach-media\/?/, "");
  if (!relativePath || relativePath.includes("..")) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Virheellinen media-polku");
    return;
  }

  const upstreamUrl = `${COACH_MEDIA_ORIGIN}/${relativePath}`;
  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(upstreamUrl, { headers, redirect: "follow" });
    if (!upstream.ok && upstream.status !== 206) {
      res.writeHead(upstream.status || 502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Valmentajamediaa ei löytynyt");
      return;
    }

    const type = contentType(relativePath);
    const responseHeaders = {
      "Content-Type": type,
      "Cache-Control": "public, max-age=3600",
    };

    for (const header of ["content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders[header] = value;
    }
    if (type.startsWith("video/") && !responseHeaders["accept-ranges"]) {
      responseHeaders["accept-ranges"] = "bytes";
    }

    res.writeHead(upstream.status, responseHeaders);
    if (!upstream.body) {
      res.end();
      return;
    }
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    console.error("Coach media proxy failed:", error);
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Valmentajamedian lataaminen epäonnistui");
  }
}

async function getCoachesPayload() {
  const now = Date.now();
  if (coachesCache.payload && coachesCache.expiresAt > now) {
    return coachesCache.payload;
  }
  const response = await fetch(COACH_DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Coach data fetch failed (${response.status})`);
  }
  const payload = await response.json();
  coachesCache = { payload, expiresAt: now + COACHES_CACHE_MS };
  return payload;
}

async function serveCoaches(res) {
  try {
    const payload = await getCoachesPayload();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(payload));
  } catch (error) {
    console.error("Coach data fetch failed:", error);
    // Serve the last known-good roster instead of breaking the page if
    // GitHub is briefly unreachable.
    if (coachesCache.payload) {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(coachesCache.payload));
      return;
    }
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Valmentajadataa ei voitu ladata" }));
  }
}

async function getTwitchAppToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && twitchTokenCache.token && twitchTokenCache.expiresAt > now + 60_000) {
    return twitchTokenCache.token;
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is missing");
  }

  const body = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch token request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  twitchTokenCache = {
    token: data.access_token,
    expiresAt: now + Math.max(60, Number(data.expires_in || 3600)) * 1000,
  };
  return twitchTokenCache.token;
}

async function fetchTwitchStreams() {
  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("first", String(TWITCH_LOGINS.length));
  for (const login of TWITCH_LOGINS) url.searchParams.append("user_login", login);

  let token = await getTwitchAppToken();
  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": TWITCH_CLIENT_ID,
    },
  });

  // App access tokens cannot be refreshed. If Twitch rejects one, request a new one once.
  if (response.status === 401) {
    twitchTokenCache = { token: "", expiresAt: 0 };
    token = await getTwitchAppToken(true);
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    });
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch Get Streams failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const players = Object.fromEntries(
    TWITCH_LOGINS.map((login) => [login.toLowerCase(), { live: false }])
  );

  for (const stream of data.data || []) {
    const login = String(stream.user_login || "").toLowerCase();
    if (!(login in players)) continue;
    players[login] = {
      live: true,
      displayName: stream.user_name,
      title: stream.title || "",
      game: stream.game_name || "",
      viewers: Number(stream.viewer_count || 0),
      startedAt: stream.started_at || null,
      thumbnail: String(stream.thumbnail_url || "")
        .replace("{width}", "640")
        .replace("{height}", "360"),
      url: `https://twitch.tv/${login}`,
    };
  }

  return {
    updatedAt: new Date().toISOString(),
    players,
  };
}

// Profile pictures barely change, so they get their own much longer cache
// separate from the 30s live-status one -- no need to re-fetch on every poll.
const TWITCH_AVATAR_CACHE_MS = 60 * 60 * 1000;
let twitchAvatarCache = { avatars: null, expiresAt: 0 };

async function fetchTwitchAvatars() {
  const url = new URL("https://api.twitch.tv/helix/users");
  for (const login of TWITCH_LOGINS) url.searchParams.append("login", login);

  let token = await getTwitchAppToken();
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Client-Id": TWITCH_CLIENT_ID },
  });

  if (response.status === 401) {
    twitchTokenCache = { token: "", expiresAt: 0 };
    token = await getTwitchAppToken(true);
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Client-Id": TWITCH_CLIENT_ID },
    });
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch Get Users failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const avatars = {};
  for (const user of data.data || []) {
    avatars[String(user.login || "").toLowerCase()] = user.profile_image_url || null;
  }
  return avatars;
}

async function getTwitchAvatars() {
  const now = Date.now();
  if (twitchAvatarCache.avatars && twitchAvatarCache.expiresAt > now) {
    return twitchAvatarCache.avatars;
  }
  const avatars = await fetchTwitchAvatars();
  twitchAvatarCache = { avatars, expiresAt: now + TWITCH_AVATAR_CACHE_MS };
  return avatars;
}

async function getTwitchLivePayload() {
  const now = Date.now();
  if (twitchLiveCache.payload && twitchLiveCache.expiresAt > now) {
    return twitchLiveCache.payload;
  }
  const payload = await fetchTwitchStreams();

  try {
    const avatars = await getTwitchAvatars();
    for (const [login, player] of Object.entries(payload.players)) {
      player.avatarUrl = avatars[login] || null;
    }
  } catch (error) {
    // Avatars are a nice-to-have -- don't let a failure here break live status.
    console.error("Twitch avatar fetch failed:", error);
  }

  twitchLiveCache = { payload, expiresAt: now + TWITCH_CACHE_MS };
  return payload;
}

async function serveTwitchLive(res) {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    res.writeHead(503, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({
      error: "Twitch integration is not configured on the server",
      configured: false,
    }));
    return;
  }

  try {
    const payload = await getTwitchLivePayload();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ ...payload, configured: true }));
  } catch (error) {
    console.error("Twitch API failed:", error);
    res.writeHead(502, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ error: "Twitch live data could not be loaded", configured: true }));
  }
}

const server = http.createServer(async (req, res) => {
  // Baseline security headers (OWASP Secure Headers) on every response --
  // set once here via setHeader so they merge into whatever writeHead()
  // each route handler calls below instead of needing to repeat them.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // Browsers only honor this over an actual HTTPS connection, so it's safe
  // to send unconditionally even though this app itself doesn't terminate TLS.
  res.setHeader("Strict-Transport-Security", "max-age=15552000");

  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Virheellinen pyyntö");
    return;
  }

  if (requestPath === "/api/twitch/live") {
    await serveTwitchLive(res);
    return;
  }

  if (requestPath === "/api/coaches") {
    await serveCoaches(res);
    return;
  }

  if (requestPath.startsWith("/coach-media/")) {
    await proxyCoachMedia(req, res, requestPath);
    return;
  }

  if (requestPath === "/robots.txt") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("User-agent: *\nAllow: /\n\nSitemap: https://tekkenslam.fi/sitemap.xml\n");
    return;
  }

  if (requestPath === "/sitemap.xml") {
    // Single-page app -- everything lives under one URL, the different
    // views (Info/Osallistujat/Valmentajat) are client-side state, not
    // separate server routes, so there's only one real URL to list.
    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    res.end(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://tekkenslam.fi/</loc>\n  </url>\n</urlset>\n`
    );
    return;
  }

  // Only these three roots are servable directly. This used to fall through
  // to a catch-all that served ANY file under the project root for anything
  // else, including .env (real Twitch API secrets), server.mjs, package.json.
  let filePath;
  let allowedRoot;
  // TEKKEN_SLAM_SPA_ROUTING
  // Only these client-side routes may fall back to index.html.
  // This is intentionally NOT a catch-all, so .env, server.mjs and
  // package.json remain inaccessible over HTTP.
  const isSpaRoute =
    requestPath === "/" ||
    requestPath === "/pelaajat" ||
    requestPath === "/pelaajat/" ||
    /^\/pelaajat\/[a-z0-9_-]+\/?$/i.test(requestPath) ||
    requestPath === "/valmentajat" ||
    requestPath === "/valmentajat/" ||
    /^\/valmentajat\/[a-z0-9_-]+\/?$/i.test(requestPath);

  if (isSpaRoute) {
    filePath = path.join(__dirname, "index.html");
    allowedRoot = __dirname;
  } else if (requestPath.startsWith("/src/")) {
    filePath = path.join(__dirname, requestPath);
    allowedRoot = __dirname;
  } else if (requestPath.startsWith("/video/") || requestPath.startsWith("/images/") || requestPath.startsWith("/players/")) {
    filePath = path.join(PUBLIC_DIR, requestPath);
    allowedRoot = PUBLIC_DIR;
  } else {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 - Tiedostoa ei löytynyt");
    return;
  }

  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(allowedRoot) || path.basename(normalizedPath).startsWith(".")) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 - Pääsy estetty");
    return;
  }
  sendFile(req, res, normalizedPath);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Tekken Slam Suomi: http://127.0.0.1:${PORT}`);
  console.log(`Twitch integration: ${TWITCH_CLIENT_ID && TWITCH_CLIENT_SECRET ? "configured" : "not configured"}`);
});
