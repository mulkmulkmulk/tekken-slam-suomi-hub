import { players } from "./players.js";

const app = document.querySelector("#app");

// CSS's scroll-behavior:smooth doesn't cover JS-driven scrollTo calls --
// respect prefers-reduced-motion here too instead of always animating.
function scrollToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

let currentView = "info";
let selectedCoach = null;
let selectedPlayer = null;
let routeNotFound = false;
let twitchState = { status: "loading", updatedAt: null };
let clipsState = { status: "loading", clips: [], updatedAt: null };
let selectedClipPlayers = new Set();
let clipsPage = 1;
const CLIPS_PER_PAGE = 12;

// TEKKEN_SLAM_ROUTING_PATCH
const viewPaths = {
  info: "/",
  players: "/pelaajat",
  coaches: "/valmentajat",
  clips: "/klipit",
};

const normalizePathname = (pathname) => {
  const clean = String(pathname || "/").split("?")[0].split("#")[0];
  if (clean === "/") return "/";
  return clean.replace(/\/+$/, "") || "/";
};

function syncRouteFromLocation() {
  const pathname = normalizePathname(window.location.pathname);
  const parts = pathname.split("/").filter(Boolean);

  selectedPlayer = null;
  selectedCoach = null;
  routeNotFound = false;

  if (pathname === "/") {
    currentView = "info";
    return;
  }

  if (parts[0] === "pelaajat") {
    currentView = "players";
    if (parts.length === 1) return;
    if (parts.length === 2) {
      const playerId = decodeURIComponent(parts[1]).toLowerCase();
      selectedPlayer = players.find((player) => String(player.id).toLowerCase() === playerId) || null;
      routeNotFound = !selectedPlayer;
      return;
    }
    routeNotFound = true;
    return;
  }

  if (parts[0] === "klipit") {
    currentView = "clips";
    routeNotFound = parts.length !== 1;
    return;
  }

  if (parts[0] === "valmentajat") {
    currentView = "coaches";
    if (parts.length === 1) return;
    if (parts.length === 2) {
      const coachSlug = decodeURIComponent(parts[1]).toLowerCase();
      selectedCoach = coaches.find((coach) => String(coach.slug).toLowerCase() === coachSlug) || null;
      routeNotFound = !selectedCoach;
      return;
    }
    routeNotFound = true;
    return;
  }

  currentView = "info";
  routeNotFound = true;
}

function navigateTo(pathname, { replace = false } = {}) {
  const target = normalizePathname(pathname);
  const current = normalizePathname(window.location.pathname);

  if (target !== current) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", target);
  }

  syncRouteFromLocation();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  app.querySelector("#view")?.focus({ preventScroll: true });
}


// Coaches are fetched live from the tekken-slam-suomi-valmentajat repo's
// generated data/coaches.json (via the /api/coaches proxy in server.mjs)
// instead of being hand-copied here, so the roster never goes stale.
const coachMediaBase = "/coach-media";
const coachCharacterBase = `${coachMediaBase}/characters`;
const ALL_CHARACTER_MOSAIC_SLUGS = ["kazuya", "jun", "xiaoyu", "king", "jin", "nina", "paul", "yoshimitsu", "hwoarang"];

function mapCoach(raw) {
  return {
    slug: raw.slug,
    name: raw.name,
    tag: raw.tag,
    mainCharacter: raw.mainCharacter,
    allCharacters: Boolean(raw.allCharacters),
    helpsAll: Boolean(raw.helpsAllCharacters),
    characters: raw.characters,
    experience: raw.experience,
    specialty: raw.specialty,
    style: raw.style,
    availability: raw.availability,
    description: raw.description,
    discord: raw.discord,
    poster: `${coachMediaBase}/${raw.slug}.jpg`,
    posterWide: `${coachMediaBase}/${raw.slug}-wide.jpg`,
    video: `${coachMediaBase}/${raw.slug}.mp4`,
    characterImage: raw.mainCharacter ? `${coachCharacterBase}/${raw.mainCharacter}.png` : null,
    altCharacterImages: (raw.altCharacters || []).map((slug) => ({ slug, url: `${coachCharacterBase}/${slug}-icon.png` })),
    allCharacterMosaic: ALL_CHARACTER_MOSAIC_SLUGS.map((slug) => ({ slug, url: `${coachCharacterBase}/${slug}-icon.png` })),
  };
}

let coaches = [];
let coachesState = { status: "loading" };

async function loadCoaches() {
  try {
    const response = await fetch("/api/coaches", { cache: "no-store" });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const data = await response.json();
    coaches = data.map(mapCoach);
    coachesState = { status: "ready" };

    // A direct visit to /valmentajat/<slug> is resolved before coach data
    // has finished loading. Re-sync the current URL now that the roster
    // exists so valid coach profile routes do not remain stuck on 404.
    if (normalizePathname(window.location.pathname).startsWith("/valmentajat/")) {
      syncRouteFromLocation();
    }
  } catch (error) {
    console.warn("Coach data could not be loaded:", error);
    coachesState = { status: coaches.length ? "ready" : "error" };
  }
  // Also re-render the players view once coach data lands: player cards
  // link to a coach's page and need the loaded roster to resolve that link.
  if (currentView === "coaches" || currentView === "players") render();
}

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatViewers = (count) => new Intl.NumberFormat("fi-FI").format(count || 0);

const avatar = (player, large = false) => `
  <div class="avatar ${large ? "avatar--large" : ""}" aria-hidden="true">
    ${player.avatarUrl
      ? `<img src="${escapeHtml(player.avatarUrl)}" alt="" loading="lazy" onerror="this.remove()">`
      : ""}
    <span>${player.initials}</span>
  </div>
`;

const socialLink = (label, url, handle) => `
  <a class="social-link" href="${url}" target="_blank" rel="noreferrer">
    <span>${label}</span><strong>${handle}</strong>
  </a>
`;

const coachLine = (player) => {
  if (!player.coach) {
    return `<div class="player-coach player-coach--pending"><span>Valmentaja</span><strong>Ilmoitetaan pian</strong></div>`;
  }
  const coach = coaches.find((c) => c.slug === player.coach);
  if (!coach) {
    // Coach data hasn't loaded yet (or the slug doesn't match) -- show the
    // raw value as plain text instead of a dead-looking button.
    return `<div class="player-coach"><span>Valmentaja</span><strong>${escapeHtml(player.coach)}</strong></div>`;
  }
  return `
    <button type="button" class="player-coach player-coach--link" data-view-coach="${coach.slug}">
      <span>Valmentaja</span><strong>${escapeHtml(coach.name)} →</strong>
    </button>`;
};

const socialLinks = (player) => [
  player.twitchChannel && socialLink("Twitch", `https://twitch.tv/${player.twitchChannel}`, player.twitchChannel),
  player.instagram && socialLink("Instagram", `https://instagram.com/${player.instagram}`, `@${player.instagram}`),
  player.tiktok && socialLink("TikTok", `https://www.tiktok.com/@${player.tiktok}`, `@${player.tiktok}`),
  player.youtube && socialLink("YouTube", `https://www.youtube.com/@${player.youtube}`, player.youtube),
  player.bluesky && socialLink("Bluesky", `https://bsky.app/profile/${player.bluesky}`, `@${player.bluesky}`),
  player.kick && socialLink("Kick", `https://kick.com/${player.kick}`, player.kick),
].filter(Boolean).join("");

const playerCard = (player) => `
  <article class="player-card ${player.isLive ? "player-card--live" : ""}">
    <div class="player-card__visual ${player.isLive && player.thumbnail ? "player-card__visual--stream" : ""}"
      ${player.isLive && player.thumbnail ? `style="background-image:url('${escapeHtml(player.thumbnail)}')"` : ""}>
      ${player.isLive && player.thumbnail ? "" : avatar(player)}
      ${player.isLive ? '<span class="status status--live">LIVE</span>' : ''}
    </div>
    <div class="player-card__body">
      <p class="eyebrow">TEKKEN SLAM SUOMI</p>
      <h3>${escapeHtml(player.name)}</h3>
      ${coachLine(player)}
      ${player.isLive ? `<div class="player-live-summary"><strong>${escapeHtml(player.game || "Twitch")}</strong><span>${formatViewers(player.viewerCount)} katsojaa</span></div>` : ""}
      <div class="social-list">${socialLinks(player)}</div>
      <button class="text-link text-link--button" type="button" data-player="${player.id}">Avaa profiili →</button>
    </div>
  </article>
`;

const liveCard = (player) => `
  <article class="live-card">
    <div class="live-card__image ${player.thumbnail ? "live-card__image--thumbnail" : ""}"
      ${player.thumbnail ? `style="background-image:url('${escapeHtml(player.thumbnail)}')"` : ""}>
      ${player.thumbnail ? "" : avatar(player, true)}
      <div class="live-pill"><span></span> LIVE</div>
      <div class="viewer-pill">${formatViewers(player.viewerCount)} katsojaa</div>
    </div>
    <div class="live-card__content">
      <p class="eyebrow">LÄHETYKSESSÄ NYT</p>
      <h3>${escapeHtml(player.name)}</h3>
      ${coachLine(player)}
      ${player.game ? `<p class="stream-game">${escapeHtml(player.game)}</p>` : ""}
      <p class="stream-title">${escapeHtml(player.streamTitle || "Tekken Slam Suomi -harjoittelua suorana")}</p>
      <div class="live-card__footer">
        <span>Twitch</span>
        <a class="button button--live" href="https://twitch.tv/${encodeURIComponent(player.twitchChannel)}" target="_blank" rel="noreferrer">Katso livenä</a>
      </div>
    </div>
  </article>
`;

const livePlayers = () => players.filter((player) => player.isLive);
const sortedPlayers = () => [...players].sort((a, b) => Number(b.isLive) - Number(a.isLive));

function infoView() {
  const liveCount = livePlayers().length;
  return `
    <section class="event event--compact">
      <p class="kicker kicker--live"><span></span> HARJOITUSKAUSI</p>
      <h2>${liveCount ? `${liveCount} osallistujaa on juuri nyt livessä` : "Seuraa harjoittelua suorana"}</h2>
      <p>${liveCount ? "Katso käynnissä olevat harjoitusstriimit ja seuraa kehitystä kohti finaalia." : "Käy katsomassa osallistujien profiilit ja Twitch-kanavat."}</p>
      <div class="event__actions">
        <button class="button button--primary" type="button" data-go="players">Osallistujat</button>
        <a
          class="tiktok-follow"
          href="https://www.tiktok.com/@tekken.slam.suomi?_r=1&_t=ZN-99QlC26hTt8"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Seuraa Tekken Slam Suomea TikTokissa"
        >
          <span class="tiktok-follow__label">Seuraa meitä</span>
          <strong>TikTokissa ↗</strong>
        </a>
      </div>
    </section>

    <section class="hero hero--info">
      <div class="hero__copy">
        <p class="kicker">TEKKEN SLAM SUOMI</p>
        <h1>Streamaajat treenaavat.<br><em>Valmentajat hiovat.</em><br>Vaasa ratkaisee.</h1>
        <p class="hero__text">Suomen kovimmat streamaajat saavat kotimaiset arvostetut Tekken-pelaajat valmentajikseen. Streamerit treenaavat valmentajiensa kanssa parin kuukauden ajan, minkä jälkeen he kohtaavat toisensa livenä Tekken 8 -turnauksessa osana Kahakka 3 -tapahtumaa Vaasassa.</p>
        <div class="hero__actions">
          <button class="button button--primary" type="button" data-go="players">Tutustu osallistujiin</button>
          <button class="text-link text-link--button" type="button" data-go="coaches">Tutustu valmentajiin →</button>
        </div>
      </div>
      <div class="hero__graphic" aria-hidden="true">
        <div class="hero__number">${String(players.length).padStart(2, "0")}</div>
        <div class="hero__word">OSALLISTUJAA</div>
      </div>
    </section>

    <section class="section video-section">
      <div class="section-heading">
        <div><p class="kicker">ESITTELYVIDEO</p><h2>Katso mistä on kyse</h2></div>
      </div>
      <div class="video-frame">
        <video controls preload="metadata" playsinline poster="/video/tekken-slam-suomi-poster.jpg">
          <source src="/video/tekken-slam-suomi.mp4" type="video/mp4">
          Selaimesi ei tue HTML5-videota.
        </video>
      </div>
    </section>

    <section class="section info-intro">
      <div class="section-heading">
        <div><p class="kicker">MIKÄ TEKKEN SLAM SUOMI?</p><h2>Valmennuksesta live-turnaukseen</h2></div>
        <p>Osallistujien kehitystä voi seurata koko treenikauden heidän omissa lähetyksissään ennen finaalia Vaasassa.</p>
      </div>
      <div class="info-grid">
        <article class="info-card"><strong>01</strong><h3>Valmennus</h3><p>Jokainen streamer saa tuekseen kokeneen kotimaisen Tekken-pelaajan. Valmentajat auttavat rakentamaan hahmo-osaamista, pelisuunnitelmaa ja turnausvalmiutta.</p></article>
        <article class="info-card"><strong>02</strong><h3>Treenikausi</h3><p>Syys-, loka- ja marraskuun aikana streamerit harjoittelevat Tekken 8:aa ja striimaavat treenejään. Seuraa matkaa osallistujien omilta kanavilta.</p></article>
        <article class="info-card"><strong>03</strong><h3>Live-finaali</h3><p>Kuukausien harjoittelu huipentuu 20.11.2026 Vaasassa. ${players.length} osallistujaa kohtaavat toisensa osana Kahakka 3 -tapahtumaa ja taistelevat Tekken Slam Suomi -mestaruudesta.</p></article>
      </div>
    </section>

    <section class="kahakka-feature">
      <div>
        <p class="kicker">LIVE-FINAALI JÄRJESTETÄÄN OSANA</p>
        <h2>Kahakka 3</h2>
        <p>Tekken-tapahtuman järjestävät videopeliryhmät TekkenOnlineWeeklyt ja Vaasa Pub Fighters. Vierailijat ovat tervetulleita seuraamaan toimintaa maksutta.</p>
      </div>
      <a class="button button--primary" href="https://www.start.gg/tournament/kahakka-3/details" target="_blank" rel="noreferrer">Kahakka 3 start.gg →</a>
    </section>

    <section class="section day-overview">
      <div class="section-heading">
        <div><p class="kicker">VIIKONLOPPU VAASASSA</p><h2>Kaksi päivää, kaksi tapahtumaa</h2></div>
      </div>
      <div class="feature-grid feature-grid--2">
        <article class="feature-card">
          <p class="eyebrow">20.11.2026</p>
          <h3>TekkenOnlineWeeklyt & TSS-finaali</h3>
          <p>Kasuaalipelailua ja Tekken Slam Suomi -finaali.</p>
        </article>
        <article class="feature-card">
          <p class="eyebrow">21.11.2026</p>
          <h3>Kahakka 3 -turnaus</h3>
          <p>Avoin yleisölle: Amateur-lohko uusille pelaajille, Main-lohko kokeneille kilpapelaajille.</p>
        </article>
      </div>
    </section>

    <section class="section event-info">
      <div class="section-heading">
        <div><p class="kicker">TAPAHTUMATIEDOT</p><h2>Finaalipäivä Vaasassa</h2></div>
        <p>Tekken Slam Suomen live-finaali järjestetään Kahakka 3:n yhteydessä Smash Room Vaasassa.</p>
      </div>
      <div class="details-grid details-grid--event">
        <div><span>Päivä</span><strong>20.11.2026</strong><p>Tekken Slam Suomi -live-finaali.</p></div>
        <div class="details-cell--venue"><img class="details-venue-badge" src="/images/smash-room-logo.png" alt=""><span>Venue</span><strong><a class="inline-link inline-link--strong" href="https://smashroom.fi/" target="_blank" rel="noreferrer">Smash Room Vaasa ↗</a></strong><p><a class="inline-link" href="https://maps.app.goo.gl/AZsoP8snE4ZxhBgAA" target="_blank" rel="noreferrer">Avaa Google Maps →</a></p></div>
        <div><span>Yleisö</span><strong>Vapaa pääsy</strong><p>Vierailijat voivat tulla seuraamaan toimintaa maksutta.</p></div>
        <div><span>Striimi</span><strong>Vaasa Pub Fighters</strong><p><a class="inline-link" href="https://twitch.tv/vaasapubfighters" target="_blank" rel="noreferrer">twitch.tv/vaasapubfighters →</a></p></div>
        <div><span>Järjestäjät</span><strong>VPF × TOW</strong><p>Vaasa Pub Fighters ja TekkenOnlineWeeklyt.</p></div>
        <div><span>Discord</span><strong><a class="inline-link inline-link--strong" href="https://discord.gg/WAT85TTCrF" target="_blank" rel="noreferrer">TekkenOnlineWeeklyt ↗</a></strong><p>Täällä tapahtumaa järjestetään ja siitä keskustellaan.</p></div>
      </div>
    </section>

    <section class="section venue-section">
      <div class="section-heading">
        <div class="venue-heading-lockup">
          <img class="venue-logo" src="/images/smash-room-logo.png" alt="Smash Room">
          <div>
            <p class="kicker"><a class="inline-link" href="https://smashroom.fi/" target="_blank" rel="noreferrer">SMASH ROOM VAASA ↗</a></p>
            <h2>Venue & saapuminen</h2>
          </div>
        </div>
        <p>Tapahtumapaikka on esteetön ja siellä on mahdollista myös yöpyä omilla varusteilla pientä nimellistä maksua vastaan.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card"><p class="eyebrow">ESTEETTÖMYYS</p><h3>Esteetön tapahtumapaikka</h3><p>Kadulta pääsee sisään ilman portaita ja tapahtumapaikalla on esteetön WC.</p></article>
        <article class="feature-card"><p class="eyebrow">YÖPYMINEN</p><h3>Yö Smash Roomissa</h3><p>Venuella voi yöpyä omilla varusteilla, kuten makuualustalla ja peitolla, pientä nimellistä maksua vastaan.</p></article>
        <article class="feature-card"><p class="eyebrow">KATSOMINEN & KUVAUS</p><h3>Tule mukaan tunnelmaan</h3><p>Paikalle saa tulla vain katsomaan ja pelaamaan rentoja matseja. Huomioithan, että tapahtumapaikalla saatat näkyä livestriimissä tai tulla kuvatuksi.</p></article>
      </div>
      <div class="venue-actions"><a class="button button--secondary" href="https://smashroom.fi/" target="_blank" rel="noreferrer">Smash Roomin sivut →</a><a class="button button--secondary" href="https://maps.app.goo.gl/AZsoP8snE4ZxhBgAA" target="_blank" rel="noreferrer">Smash Room Vaasa kartalla →</a></div>
    </section>

  `;
}



// TEKKEN_SLAM_CLIPS_V1
const formatClipDate = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fi-FI", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
};

const clipPlayer = (clip) =>
  players.find((player) => player.id === clip.playerId) ||
  players.find((player) => String(player.twitchChannel || "").toLowerCase() === String(clip.broadcasterLogin || "").toLowerCase());

function clipCard(clip) {
  const player = clipPlayer(clip);
  const playerName = player?.name || clip.broadcasterName || clip.broadcasterLogin || "Osallistuja";
  const thumbnail = clip.thumbnailUrl
    ? `<img src="${escapeHtml(clip.thumbnailUrl)}" alt="" loading="lazy">`
    : `<div class="clip-card__fallback">TEKKEN 8</div>`;

  return `
    <article class="clip-card" data-clip-card="${escapeHtml(clip.id)}">
      <div class="clip-card__media">
        ${thumbnail}
        <span class="clip-card__player">${escapeHtml(playerName)}</span>
        <button class="clip-card__play" type="button" data-play-clip="${escapeHtml(clip.id)}" aria-label="Toista klippi ${escapeHtml(clip.title || "")}">
          <span>▶</span>
        </button>
      </div>
      <div class="clip-card__body">
        <div class="clip-card__meta">
          <span>TEKKEN 8</span>
          <span>${formatClipDate(clip.createdAt)}</span>
        </div>
        <h3>${escapeHtml(clip.title || "Twitch-klippi")}</h3>
        <div class="clip-card__footer">
          <button class="clip-player-link" type="button" data-clip-player="${escapeHtml(player?.id || clip.playerId || "")}">
            ${escapeHtml(playerName)}
          </button>
          <span>${formatViewers(clip.viewCount)} katselukertaa</span>
        </div>
      </div>
    </article>
  `;
}

function clipsView() {
  const allClips = clipsState.clips || [];
  const playersWithClips = players.filter((player) =>
    allClips.some((clip) => clip.playerId === player.id)
  );
  const filteredClips = selectedClipPlayers.size === 0
    ? allClips
    : allClips.filter((clip) => selectedClipPlayers.has(clip.playerId));

  const totalPages = Math.max(1, Math.ceil(filteredClips.length / CLIPS_PER_PAGE));
  clipsPage = Math.min(Math.max(1, clipsPage), totalPages);
  const pageStart = (clipsPage - 1) * CLIPS_PER_PAGE;
  const visibleClips = filteredClips.slice(pageStart, pageStart + CLIPS_PER_PAGE);

  const filterOptions = playersWithClips.map((player) => {
    const count = allClips.filter((clip) => clip.playerId === player.id).length;
    const checked = selectedClipPlayers.has(player.id) ? " checked" : "";
    return `
      <label class="clip-check">
        <input type="checkbox" value="${escapeHtml(player.id)}" data-clip-check${checked}>
        <span class="clip-check__box" aria-hidden="true"></span>
        <span class="clip-check__label">${escapeHtml(player.name)}</span>
        <span class="clip-check__count">${count}</span>
      </label>`;
  }).join("");

  let content = "";
  if (clipsState.status === "loading") {
    content = `
      <div class="clips-status">
        <span class="clips-status__spinner"></span>
        <strong>Haetaan Tekken 8 -klippejä Twitchistä…</strong>
        <p>Kirjastoon otetaan vain osallistujien Tekken 8 -kategorian klipit.</p>
      </div>`;
  } else if (clipsState.status === "error") {
    content = `
      <div class="clips-status clips-status--error">
        <strong>Klippejä ei saatu ladattua</strong>
        <p>Twitch-yhteydessä oli hetkellinen ongelma. Kokeile päivittää sivu.</p>
      </div>`;
  } else if (!visibleClips.length) {
    content = `
      <div class="clips-status">
        <strong>${selectedClipPlayer === "all" ? "Tekken 8 -klippejä ei ole vielä löytynyt" : "Tälle osallistujalle ei löytynyt vielä Tekken 8 -klippejä"}</strong>
        <p>Kun harjoitusstriimeistä tehdään Twitch-klippejä, ne ilmestyvät tänne automaattisesti.</p>
      </div>`;
  } else {
    content = `<div class="clips-grid">${visibleClips.map(clipCard).join("")}</div>`;
  }

  const pagination = clipsState.status === "ready" && filteredClips.length > CLIPS_PER_PAGE
    ? `
      <nav class="clips-pagination" aria-label="Klippisivut">
        <button type="button" class="clips-page-button" data-clips-prev${clipsPage <= 1 ? " disabled" : ""}>← Edellinen</button>
        <span class="clips-page-status">Sivu ${clipsPage} / ${totalPages}</span>
        <button type="button" class="clips-page-button" data-clips-next${clipsPage >= totalPages ? " disabled" : ""}>Seuraava →</button>
      </nav>`
    : "";

  return `
    <section class="coach-hero clips-hero">
      <p class="coach-eyebrow"><span class="coach-dot"></span>Tekken Slam Suomi &mdash; Harjoituskausi</p>
      <h1 class="coach-title"><span class="clips-title-nowrap">Treeniklipit</span></h1>
      <p class="coach-subhead">Seuraa osallistujien kehitystä kohti finaalia. Kirjastossa näytetään automaattisesti vain osallistujien Tekken 8 -kategorian treeniklippejä, uusimmat ensin.</p>
    </section>

    <section class="clips-library">
      <div class="clips-toolbar">
        <div>
          <div class="clip-filter-multi">
            <span class="kicker">SUODATA OSALLISTUJIEN MUKAAN</span>
            <details class="clip-filter-dropdown">
              <summary>
                <span>${selectedClipPlayers.size === 0 ? "Kaikki osallistujat" : `${selectedClipPlayers.size} osallistujaa valittu`}</span>
                <span class="clip-filter-dropdown__arrow">⌄</span>
              </summary>
              <div class="clip-filter-dropdown__panel">
                <div class="clip-filter-dropdown__actions">
                  <button type="button" data-clip-clear>Kaikki</button>
                </div>
                <div class="clip-filter-checks">
                  ${filterOptions}
                </div>
              </div>
            </details>
          </div>
        </div>
        ${clipsState.updatedAt ? `<p class="clips-updated">Päivitetty ${formatClipDate(clipsState.updatedAt)}</p>` : ""}
      </div>
      ${content}
      ${pagination}
    </section>
  `;
}

async function loadClips() {
  clipsState = { ...clipsState, status: clipsState.clips.length ? "ready" : "loading" };
  if (currentView === "clips") render();

  try {
    const response = await fetch("/api/twitch/clips", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    clipsState = {
      status: "ready",
      clips: Array.isArray(data.clips) ? data.clips : [],
      updatedAt: data.updatedAt || null,
    };
  } catch (error) {
    console.warn("Twitch clips could not be loaded:", error);
    clipsState = {
      ...clipsState,
      status: clipsState.clips.length ? "ready" : "error",
    };
  }

  if (currentView === "clips" || currentView === "players") render();
}


// TEKKEN_SLAM_STRUCTURED_PLAYER_INTRO_V2
function escapePlayerProfileText(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPlayerProfileText(value = "") {
  let html = escapePlayerProfileText(value);

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return html.replace(/\n/g, "<br>");
}

function renderPlayerIntroSection(title, value) {
  const text = String(value || "").trim();
  if (!text) return "";

  return `
    <article class="player-intro__section">
      <p class="kicker player-intro__kicker">ESITTELY</p>
      <h2 class="player-intro__heading">${escapePlayerProfileText(title)}</h2>
      <div class="player-intro__body">${renderPlayerProfileText(text)}</div>
    </article>
  `;
}

function renderStructuredPlayerIntroduction(player) {
  const sections = [
    renderPlayerIntroSection("Kuka olet?", player.whoAreYou),
    renderPlayerIntroSection("Kerro itsestäsi", player.aboutYou),
    renderPlayerIntroSection(
      "Lempibiisi josta tulee hyvä fiilis",
      player.feelGoodSong
    ),
    renderPlayerIntroSection(
      "Mitä mietteitä turnaukseen / fiiliksiä?",
      player.tournamentThoughts
    ),
  ].filter(Boolean);

  if (!sections.length) return "";

  return `
    <section class="section player-introduction">
      <div class="section-heading">
        <div>
          <p class="kicker">OSALLISTUJAPROFIILI</p>
          <h2>Tutustu ${escapePlayerProfileText(player.name)}</h2>
        </div>
        <p>Pelaajan omin sanoin.</p>
      </div>
      <div class="player-intro">
        ${sections.join("")}
      </div>
    </section>
  `;
}


function playerProfileClips(player) {
  const clips = (clipsState.clips || [])
    .filter((clip) => clip.playerId === player.id)
    .slice(0, 6);

  if (clipsState.status === "loading") {
    return `
      <section class="section player-clips-section">
        <div class="section-heading">
          <div><p class="kicker kicker--nowrap">Treeniklipit</p><h2>${escapeHtml(player.name)}n klipit</h2></div>
        </div>
        <div class="clips-status clips-status--compact">
          <span class="clips-status__spinner"></span>
          <strong>Haetaan klippejä…</strong>
        </div>
      </section>`;
  }

  if (clipsState.status === "error") {
    return `
      <section class="section player-clips-section">
        <div class="section-heading">
          <div><p class="kicker kicker--nowrap">Treeniklipit</p><h2>${escapeHtml(player.name)}n klipit</h2></div>
        </div>
        <div class="clips-status clips-status--compact clips-status--error">
          <strong>Klippejä ei saatu ladattua</strong>
          <p>Twitch-yhteydessä oli hetkellinen ongelma.</p>
        </div>
      </section>`;
  }

  if (!clips.length) {
    return `
      <section class="section player-clips-section">
        <div class="section-heading">
          <div><p class="kicker kicker--nowrap">Treeniklipit</p><h2>${escapeHtml(player.name)}n klipit</h2></div>
        </div>
        <div class="clips-status clips-status--compact">
          <strong>Ei Tekken 8 -klippejä vielä</strong>
          <p>Kun harjoitusstriimistä tehdään klippejä, ne ilmestyvät tähän automaattisesti.</p>
        </div>
      </section>`;
  }

  return `
    <section class="section player-clips-section">
      <div class="section-heading">
        <div>
          <p class="kicker kicker--nowrap">Treeniklipit</p>
          <h2>${escapeHtml(player.name)}n uusimmat klipit</h2>
        </div>
        <button class="text-link text-link--button" type="button" data-open-player-clips="${escapeHtml(player.id)}">
          Katso kaikki ${clipsState.clips.filter((clip) => clip.playerId === player.id).length} klippiä →
        </button>
      </div>
      <div class="clips-grid clips-grid--player">
        ${clips.map(clipCard).join("")}
      </div>
    </section>`;
}

function playerProfileView(player) {
  const live = Boolean(player.isLive);
  return `
    <section class="page-hero">
      <button class="back-link" type="button" data-back-players>← Takaisin osallistujiin</button>
      <p class="kicker">TEKKEN SLAM SUOMI · OSALLISTUJA</p>
      <h1>${escapeHtml(player.name)}</h1>
      <p>Seuraa ${escapeHtml(player.name)}n harjoittelua ja matkaa kohti Tekken Slam Suomi -finaalia.</p>
      <div class="social-list">${socialLinks(player)}</div>
    </section>

    ${live ? `
      <section class="section">
        <div class="section-heading">
          <div><p class="kicker kicker--live"><span></span> LIVE NYT</p><h2>${escapeHtml(player.name)} on lähetyksessä</h2></div>
          <p>${formatViewers(player.viewerCount)} katsojaa</p>
        </div>
        <div class="live-grid">${liveCard(player)}</div>
      </section>
    ` : `
      <section class="live-notice">
        <span class="live-notice__dot"></span>
        <div>
          <strong>${escapeHtml(player.name)} ei ole juuri nyt livessä</strong>
          <p>Live-status tarkistetaan automaattisesti. Twitch-kanavan voit avata yllä olevasta linkistä.</p>
        </div>
      </section>
    `}

    ${playerProfileClips(player)}

    ${renderStructuredPlayerIntroduction(player)}

    <section class="section">
      <div class="section-heading">
        <div><p class="kicker">OSALLISTUJAPROFIILI</p><h2>Kanavat</h2></div>
        <p>Suorat linkit osallistujan Tekken Slam Suomi -harjoittelun seuraamiseen.</p>
      </div>
      <div class="details-grid">
        ${player.twitchChannel ? `<div><span>Twitch</span><strong>${escapeHtml(player.twitchChannel)}</strong><p><a class="inline-link" href="https://twitch.tv/${encodeURIComponent(player.twitchChannel)}" target="_blank" rel="noreferrer">Avaa Twitch →</a></p></div>` : ""}
        ${player.instagram ? `<div><span>Instagram</span><strong>@${escapeHtml(player.instagram)}</strong><p><a class="inline-link" href="https://instagram.com/${encodeURIComponent(player.instagram)}" target="_blank" rel="noreferrer">Avaa Instagram →</a></p></div>` : ""}
        ${player.tiktok ? `<div><span>TikTok</span><strong>@${escapeHtml(player.tiktok)}</strong><p><a class="inline-link" href="https://www.tiktok.com/@${encodeURIComponent(player.tiktok)}" target="_blank" rel="noreferrer">Avaa TikTok →</a></p></div>` : ""}
        ${player.youtube ? `<div><span>YouTube</span><strong>${escapeHtml(player.youtube)}</strong><p><a class="inline-link" href="https://www.youtube.com/@${encodeURIComponent(player.youtube)}" target="_blank" rel="noreferrer">Avaa YouTube →</a></p></div>` : ""}
      </div>
    </section>
  `;
}

function playersView() {
  if (selectedPlayer) return playerProfileView(selectedPlayer);
  const live = livePlayers();
  return `
    <section class="coach-hero">
      <p class="coach-eyebrow"><span class="coach-dot"></span>Tekken Slam Suomi &mdash; Osallistujat</p>
      <h1 class="coach-title">TUTUSTU<br><em>OSALLISTUJIIN</em></h1>
      <p class="coach-subhead">${players.length} osallistujaa treenaa kohti finaalia. Selaa profiileja ja katso ketkä ovat livenä juuri nyt.</p>
    </section>

    ${live.length ? `
      <section class="section" id="live">
        <div class="section-heading">
          <div>
            <p class="kicker kicker--live"><span></span> LIVE NYT</p>
            <h2>Harjoittelemassa juuri nyt</h2>
          </div>
          <p>${live.length} / ${players.length} osallistujasta livessä</p>
        </div>
        <div class="live-grid">${live.map(liveCard).join("")}</div>
      </section>
    ` : `
      <section class="live-notice ${twitchState.status === "error" ? "live-notice--error" : ""}">
        <span class="live-notice__dot"></span>
        <div>
          <strong>${twitchState.status === "loading" ? "Tarkistetaan Twitch-lähetyksiä…" : twitchState.status === "error" ? "Live-tilaa ei saatu päivitettyä" : "Kukaan osallistujista ei ole juuri nyt livessä"}</strong>
          <p>${twitchState.status === "error" ? "Twitch-yhteydessä oli hetkellinen ongelma. Osallistujien kanavat toimivat edelleen normaalisti." : twitchState.status === "loading" ? "Live-status päivittyy automaattisesti." : "Live-status tarkistetaan automaattisesti noin minuutin välein."}</p>
        </div>
      </section>
    `}

    <section class="section">
      <div class="section-heading">
        <div><p class="kicker">TEKKEN SLAM SUOMI</p><h2>Osallistujat</h2></div>
      </div>
      <div class="players-grid">${sortedPlayers().map(playerCard).join("")}</div>
    </section>
  `;
}

function coachMosaic(coach, compact = false) {
  const items = (coach.allCharacterMosaic || []).slice(0, compact ? 4 : 9);
  if (!items.length) return "";
  return items.map((item) => `<img src="${item.url}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`).join("");
}

function coachTileAlts(coach) {
  const alts = (coach.altCharacterImages || []).slice(0, 4);
  if (!alts.length) return "";
  const icons = alts.map((item) => `<img src="${item.url}" alt="${item.slug}" title="${item.slug}" loading="lazy">`).join("");
  return `<span class="coach-tile-alts">${icons}</span>`;
}

function coachAllRibbon() {
  return `<span class="coach-all-ribbon" title="Auttaa tarvittaessa myös kaikkien muiden hahmojen kanssa">+ Kaikki hahmot</span>`;
}

function coachTileArt(coach) {
  if (coach.allCharacters) {
    return `
        <span class="coach-tile-mosaic">${coachMosaic(coach)}</span>
        <span class="coach-tile-mosaic-badge">KAIKKI<br>HAHMOT</span>`;
  }
  if (coach.mainCharacter && coach.helpsAll) {
    return `
        <span class="coach-tile-split">
          <span class="coach-tile-split-char">
            <span class="coach-tile-glow"></span>
            <img class="coach-tile-char" src="${coach.characterImage}" alt="${coach.mainCharacter}" loading="lazy">
          </span>
          <span class="coach-tile-split-all">
            ${coachTileAlts(coach)}
            <span class="coach-tile-split-mosaic">${coachMosaic(coach, true)}</span>
            <span class="coach-tile-split-label">KAIKKI<br>HAHMOT</span>
          </span>
        </span>`;
  }
  if (coach.mainCharacter) {
    return `
        <span class="coach-tile-glow"></span>
        <img class="coach-tile-char" src="${coach.characterImage}" alt="${coach.mainCharacter}" loading="lazy">`;
  }
  return `<img class="coach-tile-img" src="${coach.poster}" alt="" loading="lazy">`;
}

// Coaches already paired with a participant (see players.js `coach` field) --
// shown as a "Valittu" badge on the roster tile so visitors can see at a
// glance which coaches are still available.
const takenCoachSlugs = () => new Set(players.map((p) => p.coach).filter(Boolean));

function coachCard(coach, index) {
  const usesSplit = Boolean(coach.mainCharacter && coach.helpsAll);
  const mainLabel = coach.mainCharacter
    ? coach.mainCharacter.replaceAll("-", " ")
    : coach.allCharacters
      ? "Kaikki hahmot"
      : null;
  const taken = takenCoachSlugs().has(coach.slug);

  return `
    <a class="coach-tile${coach.mainCharacter ? " coach-tile--character" : ""}${coach.allCharacters ? " coach-tile--mosaic" : ""}${usesSplit ? " coach-tile--split" : ""}" href="/valmentajat/${encodeURIComponent(coach.slug)}" data-coach="${coach.slug}" aria-label="Avaa valmentajan ${coach.name} profiili" style="--i:${index}">
      ${coachTileArt(coach)}
      <span class="coach-tile-scrim"></span>
      <span class="coach-tile-num">P${String(index + 1).padStart(2, "0")}</span>
      ${usesSplit ? "" : coachTileAlts(coach)}
      <span class="coach-tile-info">
        ${taken ? `<span class="coach-tile-taken">Valittu</span>` : ""}
        <span class="coach-tile-name">${coach.name}</span>
        ${mainLabel ? `<span class="coach-tile-tag coach-tile-tag-char">${mainLabel}</span>` : coach.tag ? `<span class="coach-tile-tag">${coach.tag}</span>` : ""}
      </span>
    </a>`;
}

function coachStat(label, value, emphasis = false) {
  if (!value) return "";
  return `
      <div class="coach-stat">
        <div class="coach-stat-label">${label}</div>
        <div class="coach-stat-value${emphasis ? " coach-stat-value--emphasis" : ""}">${value}</div>
      </div>`;
}

function coachProfileView(coach, index) {
  const mainLabel = coach.mainCharacter
    ? coach.mainCharacter.replaceAll("-", " ")
    : coach.allCharacters
      ? "Kaikki hahmot"
      : coach.tag || "";

  const portraitArt = coach.allCharacters
    ? `<span class="coach-tile-mosaic">${coachMosaic(coach)}</span><span class="coach-tile-mosaic-badge">KAIKKI<br>HAHMOT</span>`
    : coach.mainCharacter
      ? `<span class="coach-profile-glow"></span><img class="coach-profile-char" src="${coach.characterImage}" alt="${coach.mainCharacter}">`
      : `<img src="${coach.poster}" alt="">`;

  const replay = coach.video ? `
    <video class="coach-stage-video" controls playsinline preload="metadata" poster="${coach.posterWide}" data-coach-video>
      <source src="${coach.video}" type="video/mp4">
      Selaimesi ei tue HTML5-videota.
    </video>
    <span class="coach-stage-corner tl"></span>
    <span class="coach-stage-corner tr"></span>
    <span class="coach-stage-corner bl"></span>
    <span class="coach-stage-corner br"></span>
    <span class="coach-stage-label"><span class="coach-dot"></span>Replay</span>
    <div class="coach-video-error" hidden>
      <strong>Replay-videota ei voitu toistaa.</strong>
      <p>Videolähde ei vastaa tai tiedosto ei ole selaimen tukemassa muodossa.</p>
      <a href="${coach.video}" target="_blank" rel="noopener">Avaa video →</a>
    </div>` : `
    <div class="coach-replay-unavailable">
      <span>REPLAY</span>
      <strong>Video tulossa</strong>
      <p>Tämän valmentajan replay-tiedosto ei ole tällä hetkellä saatavilla lähdeprojektissa.</p>
    </div>`;

  return `
    <button class="coach-back-link" type="button" data-back-coaches>← Takaisin valmentajiin</button>

    <div class="coach-profile-head">
      <div class="coach-profile-portrait${coach.mainCharacter ? " coach-profile-portrait--character" : ""}">
        ${portraitArt}
        ${coach.helpsAll ? coachAllRibbon() : ""}
        <span class="coach-profile-num">P${String(index + 1).padStart(2, "0")}</span>
      </div>
      <div>
        <p class="coach-eyebrow"><span class="coach-dot"></span>Valmentajaprofiili</p>
        <h1 class="coach-profile-name">${coach.name}</h1>
        <p class="coach-profile-tag">${mainLabel}${coach.tag && coach.mainCharacter ? ` &middot; ${coach.tag}` : ""}</p>
        ${(coach.altCharacterImages || []).length ? `<div class="coach-profile-alts">${coachTileAlts(coach)}</div>` : ""}
      </div>
    </div>

    <div class="coach-stage">${replay}</div>

    <div class="coach-sheet">
      ${coachStat("Hahmot", coach.characters, true)}
      ${coachStat("Kokemus", coach.experience)}
      ${coachStat("Erikoisosaaminen", coach.specialty)}
      ${coachStat("Valmennustyyli", coach.style)}
      ${coachStat("Saatavuus", coach.availability)}
      ${coachStat("Pelaajana", coach.description)}
    </div>

    <div class="coach-cta-row">
      <div class="coach-cta-box">
        <p class="coach-cta-label">Ota yhteyttä Discordissa</p>
        <p class="coach-cta-discord">${coach.discord}</p>
      </div>
      <button class="coach-cta" type="button" data-back-coaches>Selaa muita valmentajia</button>
    </div>`;
}

function coachesView() {
  if (selectedCoach) {
    const idx = coaches.findIndex((c) => c.slug === selectedCoach.slug);
    return `<div class="coach-profile-wrap">${coachProfileView(selectedCoach, idx)}</div>`;
  }

  if (coachesState.status === "loading") {
    return `
    <section class="coach-hero">
      <p class="coach-eyebrow"><span class="coach-dot"></span>Tekken Slam Suomi &mdash; Valmentaja Rosteri</p>
      <h1 class="coach-title">VALITSE<br><em>VALMENTAJASI</em></h1>
      <p class="coach-subhead">Ladataan valmentajia…</p>
    </section>`;
  }

  if (coachesState.status === "error") {
    return `
    <section class="coach-hero">
      <p class="coach-eyebrow"><span class="coach-dot"></span>Tekken Slam Suomi &mdash; Valmentaja Rosteri</p>
      <h1 class="coach-title">VALITSE<br><em>VALMENTAJASI</em></h1>
      <p class="coach-subhead">Valmentajadataa ei juuri nyt saatu ladattua. Yritä päivittää sivu hetken kuluttua.</p>
    </section>`;
  }

  return `
    <section class="coach-hero">
      <p class="coach-eyebrow"><span class="coach-dot"></span>Tekken Slam Suomi &mdash; Valmentaja Rosteri</p>
      <h1 class="coach-title">VALITSE<br><em>VALMENTAJASI</em></h1>
      <p class="coach-subhead">${coaches.length} valmentajaa jakaa osaamistaan osallistujille. Selaa profiileja ja tutustu valmentajan hahmoihin, tyyliin sekä esittelyvideoon.</p>
    </section>
    <section class="coach-roster-section">
      <div class="coach-roster">${coaches.map((c, i) => coachCard(c, i)).join("")}</div>
      <p class="coach-source-note">Valmentajien profiilit perustuvat Tekken Slam Suomi -valmentajahaun tietoihin.</p>
    </section>`;
}

function shell(content) {
  const current = (view) => currentView === view ? ' aria-current="page"' : "";
  return `
    <a class="skip-link" href="#view">Siirry sisältöön</a>
    <header class="site-header">
      <button class="brand brand--button" type="button" data-go="info" aria-label="Tekken Slam Suomi etusivulle">TEKKEN SLAM <span>SUOMI</span></button>
      <nav aria-label="Päänavigaatio">
        <button type="button" data-go="info" class="${currentView === "info" ? "active" : ""}"${current("info")}>Info</button>
        <button type="button" data-go="players" class="${currentView === "players" ? "active" : ""}"${current("players")}>Osallistujat</button>
        <button type="button" data-go="coaches" class="${currentView === "coaches" ? "active" : ""}"${current("coaches")}>Valmentajat</button>
        <button type="button" data-go="clips" class="${currentView === "clips" ? "active" : ""}"${current("clips")}>Klipit</button>
      </nav>
      <button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">Valikko</button>
      <div class="mobile-nav" id="mobile-nav" hidden>
        <button type="button" data-go="info"${current("info")}>Info</button>
        <button type="button" data-go="players"${current("players")}>Osallistujat</button>
        <button type="button" data-go="coaches"${current("coaches")}>Valmentajat</button>
        <button type="button" data-go="clips"${current("clips")}>Klipit</button>
      </div>
    </header>
    <main id="view" tabindex="-1">${content}</main>
    <footer><span>TEKKEN SLAM SUOMI</span><span>Virallinen tapahtumasivusto</span></footer>
  `;
}

function applyTwitchData(data) {
  const byLogin = data?.players || {};
  for (const player of players) {
    const live = byLogin[player.twitchChannel.toLowerCase()];
    player.isLive = Boolean(live?.live);
    player.streamTitle = live?.title || "";
    player.viewerCount = Number(live?.viewers || 0);
    player.game = live?.game || "";
    player.startedAt = live?.startedAt || null;
    player.thumbnail = live?.thumbnail || "";
    player.avatarUrl = live?.avatarUrl || "";
  }
}

async function refreshTwitchStatus({ rerender = true } = {}) {
  try {
    const response = await fetch("/api/twitch/live", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    applyTwitchData(data);
    twitchState = { status: "ready", updatedAt: data.updatedAt || null };
  } catch (error) {
    console.warn("Twitch live status could not be loaded:", error);
    twitchState = { status: "error", updatedAt: twitchState.updatedAt };
  }

  if (rerender && (currentView === "players" || currentView === "info")) render();
}

function notFoundView() {
  return `
    <section class="page-hero">
      <p class="kicker">404</p>
      <h1>Sivua ei löytynyt</h1>
      <p>Pyydettyä osallistujaa tai valmentajaa ei löytynyt.</p>
      <button class="button button--primary" type="button" data-go="info">Takaisin etusivulle</button>
    </section>
  `;
}

function render() {
  const views = { info: infoView, players: playersView, coaches: coachesView, clips: clipsView };
  const view = routeNotFound ? notFoundView : views[currentView];
  app.innerHTML = shell(view());

  app.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.go;
      if (!views[next]) return;
      navigateTo(viewPaths[next]);
    });
  });

  app.querySelectorAll("[data-player]").forEach((button) => {
    button.addEventListener("click", () => {
      const player = players.find((item) => item.id === button.dataset.player);
      if (!player) return;
      navigateTo(`/pelaajat/${encodeURIComponent(player.id)}`);
    });
  });

  app.querySelectorAll("[data-view-coach]").forEach((button) => {
    button.addEventListener("click", () => {
      const coach = coaches.find((item) => item.slug === button.dataset.viewCoach);
      if (!coach) return;
      navigateTo(`/valmentajat/${encodeURIComponent(coach.slug)}`);
    });
  });

  app.querySelectorAll("[data-coach]").forEach((link) => {
    link.addEventListener("click", (event) => {
      // Real <a href> now -- only take over plain left-clicks for the fast
      // client-side route change. Ctrl/Cmd/Shift/middle-click etc. fall
      // through to the browser's own "open in new tab" handling.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const coach = coaches.find((item) => item.slug === link.dataset.coach);
      if (!coach) return;
      event.preventDefault();
      navigateTo(`/valmentajat/${encodeURIComponent(coach.slug)}`);
    });
  });

  app.querySelector("[data-back-players]")?.addEventListener("click", () => {
    navigateTo("/pelaajat");
  });

  app.querySelector("[data-back-coaches]")?.addEventListener("click", () => {
    navigateTo("/valmentajat");
  });

  const coachVideo = app.querySelector("[data-coach-video]");
  // Default playback volume for replay clips (viewers can still adjust with
  // the player's own volume slider) -- matches the original valmentajat
  // site's default. 1.0 = 100%.
  if (coachVideo) coachVideo.volume = 0.4;
  coachVideo?.addEventListener("error", () => {
    coachVideo.hidden = true;
    const errorBox = coachVideo.parentElement?.querySelector(".coach-video-error");
    if (errorBox) errorBox.hidden = false;
  });


  app.querySelectorAll("[data-clip-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const playerId = checkbox.value;
      if (!playerId) return;
      if (checkbox.checked) {
        selectedClipPlayers.add(playerId);
      } else {
        selectedClipPlayers.delete(playerId);
      }
      clipsPage = 1;
      render();
    });
  });

  app.querySelector("[data-clip-clear]")?.addEventListener("click", () => {
    selectedClipPlayers.clear();
    clipsPage = 1;
    render();
  });

  app.querySelectorAll("[data-clip-player]").forEach((button) => {
    button.addEventListener("click", () => {
      const playerId = button.dataset.clipPlayer;
      if (!playerId) return;
      selectedClipPlayers = new Set([playerId]);
      clipsPage = 1;
      render();
    });
  });

  app.querySelectorAll("[data-open-player-clips]").forEach((button) => {
    button.addEventListener("click", () => {
      const playerId = button.dataset.openPlayerClips;
      if (!playerId) return;
      selectedClipPlayers = new Set([playerId]);
      clipsPage = 1;
      navigateTo("/klipit");
    });
  });

  app.querySelector("[data-clips-prev]")?.addEventListener("click", () => {
    if (clipsPage <= 1) return;
    clipsPage -= 1;
    render();
    scrollToTop();
  });

  app.querySelector("[data-clips-next]")?.addEventListener("click", () => {
    const allClips = clipsState.clips || [];
    const filteredClips = selectedClipPlayers.size === 0
      ? allClips
      : allClips.filter((clip) => selectedClipPlayers.has(clip.playerId));
    const totalPages = Math.max(1, Math.ceil(filteredClips.length / CLIPS_PER_PAGE));
    if (clipsPage >= totalPages) return;
    clipsPage += 1;
    render();
    scrollToTop();
  });

  app.querySelectorAll("[data-play-clip]").forEach((button) => {
    button.addEventListener("click", () => {
      const clipId = button.dataset.playClip;
      const card = button.closest("[data-clip-card]");
      const media = card?.querySelector(".clip-card__media");
      if (!clipId || !media) return;

      const parent = window.location.hostname || "localhost";
      const iframe = document.createElement("iframe");
      iframe.className = "clip-card__embed";
      iframe.src = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clipId)}&parent=${encodeURIComponent(parent)}&autoplay=true`;
      iframe.title = "Twitch-klippi";
      iframe.allow = "autoplay; fullscreen";
      iframe.allowFullscreen = true;
      iframe.setAttribute("loading", "lazy");
      media.replaceChildren(iframe);
    });
  });

  const menuToggle = app.querySelector(".mobile-menu-toggle");
  const mobileNav = app.querySelector("#mobile-nav");
  menuToggle?.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    mobileNav.hidden = expanded;
  });
}

syncRouteFromLocation();
window.addEventListener("popstate", () => {
  syncRouteFromLocation();
  render();
  window.scrollTo({ top: 0 });
});

render();
refreshTwitchStatus();
setInterval(() => refreshTwitchStatus(), 60_000);
loadCoaches();
loadClips();