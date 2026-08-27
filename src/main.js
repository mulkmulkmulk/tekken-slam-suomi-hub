import { players } from "./players.js";

const app = document.querySelector("#app");
let currentView = "info";
let selectedCoach = null;
let twitchState = { status: "loading", updatedAt: null };

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
  } catch (error) {
    console.warn("Coach data could not be loaded:", error);
    coachesState = { status: coaches.length ? "ready" : "error" };
  }
  if (currentView === "coaches") render();
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
    <span>${player.initials}</span>
  </div>
`;

const socialLink = (label, url, handle) => `
  <a class="social-link" href="${url}" target="_blank" rel="noreferrer">
    <span>${label}</span><strong>${handle}</strong>
  </a>
`;

const socialLinks = (player) => [
  player.twitchChannel && socialLink("Twitch", `https://twitch.tv/${player.twitchChannel}`, player.twitchChannel),
  player.instagram && socialLink("Instagram", `https://instagram.com/${player.instagram}`, `@${player.instagram}`),
  player.tiktok && socialLink("TikTok", `https://www.tiktok.com/@${player.tiktok}`, `@${player.tiktok}`),
  player.youtube && socialLink("YouTube", `https://www.youtube.com/@${player.youtube}`, player.youtube),
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
      ${player.isLive ? `<div class="player-live-summary"><strong>${escapeHtml(player.game || "Twitch")}</strong><span>${formatViewers(player.viewerCount)} katsojaa</span></div>` : ""}
      <div class="social-list">${socialLinks(player)}</div>
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
        <div class="hero__number">08</div>
        <div class="hero__word">OSALLISTUJAA</div>
      </div>
    </section>

    <section class="section video-section">
      <div class="section-heading">
        <div><p class="kicker">ESITTELYVIDEO</p><h2>Katso mistä on kyse</h2></div>
        <p>Tutustu tapahtuman ideaan ja matkaan kohti Vaasan live-finaalia.</p>
      </div>
      <div class="video-frame">
        <video controls preload="metadata" playsinline>
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
        <article class="info-card"><strong>03</strong><h3>Live-finaali</h3><p>Kuukausien harjoittelu huipentuu 20.11.2026 Vaasassa. Kahdeksan osallistujaa kohtaavat toisensa osana Kahakka 3 -tapahtumaa ja taistelevat Tekken Slam Suomi -mestaruudesta.</p></article>
      </div>
    </section>

    <section class="section schedule-section">
      <div class="section-heading">
        <div><p class="kicker">MATKA FINAALIIN</p><h2>Syksy 2026</h2></div>
        <p>Harjoituskausi näkyy striimeissä, ja marraskuussa kaikki ratkaistaan yleisön edessä.</p>
      </div>
      <div class="timeline">
        <article class="timeline__item">
          <div class="timeline__date">SYYS–MARRASKUU</div>
          <div class="timeline__content"><p class="eyebrow">TREENIKAUSI</p><h3>Harjoittelu käyntiin</h3><p>Streamerit treenaavat valmentajiensa kanssa ja pelaavat Tekken 8:aa suorissa lähetyksissään koko kauden ajan.</p></div>
        </article>
        <article class="timeline__item timeline__item--final">
          <div class="timeline__date">20.11.2026</div>
          <div class="timeline__content"><p class="eyebrow">LIVE-FINAALI · VAASA</p><h3>Tekken Slam Suomi × Kahakka 3</h3><p>Tekken Slam Suomi huipentuu Smash Room Vaasassa Kahakka 3 -tapahtuman yhteydessä järjestettävään live-finaaliin.</p></div>
        </article>
      </div>
    </section>

    <section class="kahakka-feature">
      <div>
        <p class="kicker">LIVE-FINAALI JÄRJESTETÄÄN OSANA</p>
        <h2>Kahakka 3</h2>
        <p>Tekken-tapahtuman järjestävät videopeliryhmät Wasa Game Scene ja Vaasa Pub Fighters. Vierailijat ovat tervetulleita seuraamaan toimintaa maksutta.</p>
      </div>
      <a class="button button--primary" href="https://www.start.gg/tournament/kahakka-3/details" target="_blank" rel="noreferrer">Kahakka 3 start.gg →</a>
    </section>

    <section class="section event-info">
      <div class="section-heading">
        <div><p class="kicker">TAPAHTUMATIEDOT</p><h2>Finaalipäivä Vaasassa</h2></div>
        <p>Tekken Slam Suomen live-finaali järjestetään Kahakka 3:n yhteydessä Smash Room Vaasassa.</p>
      </div>
      <div class="details-grid details-grid--event">
        <div><span>Päivä</span><strong>20.11.2026</strong><p>Tekken Slam Suomi -live-finaali.</p></div>
        <div><span>Venue</span><strong><a class="inline-link inline-link--strong" href="https://smashroom.fi/" target="_blank" rel="noreferrer">Smash Room Vaasa ↗</a></strong><p><a class="inline-link" href="https://maps.app.goo.gl/AZsoP8snE4ZxhBgAA" target="_blank" rel="noreferrer">Avaa Google Maps →</a></p></div>
        <div><span>Yleisö</span><strong>Vapaa pääsy</strong><p>Vierailijat voivat tulla seuraamaan toimintaa maksutta.</p></div>
        <div><span>Striimi</span><strong>Vaasa Pub Fighters</strong><p><a class="inline-link" href="https://twitch.tv/vaasapubfighters" target="_blank" rel="noreferrer">twitch.tv/vaasapubfighters →</a></p></div>
        <div><span>Järjestäjät</span><strong>VPF × WGS</strong><p>Vaasa Pub Fighters ja Wasa Game Scene.</p></div>
      </div>
    </section>

    <section class="section venue-section">
      <div class="section-heading">
        <div><p class="kicker"><a class="inline-link" href="https://smashroom.fi/" target="_blank" rel="noreferrer">SMASH ROOM VAASA ↗</a></p><h2>Venue & saapuminen</h2></div>
        <p>Tapahtumapaikka on esteetön ja siellä on mahdollista myös yöpyä omilla varusteilla pientä nimellistä maksua vastaan.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card"><p class="eyebrow">ESTEETTÖMYYS</p><h3>Esteetön tapahtumapaikka</h3><p>Kadulta pääsee sisään ilman portaita ja tapahtumapaikalla on esteetön WC.</p></article>
        <article class="feature-card"><p class="eyebrow">YÖPYMINEN</p><h3>Yö Smash Roomissa</h3><p>Venuella voi yöpyä omilla varusteilla, kuten makuualustalla ja peitolla, pientä nimellistä maksua vastaan.</p></article>
        <article class="feature-card"><p class="eyebrow">KATSOMINEN & KUVAUS</p><h3>Tule mukaan tunnelmaan</h3><p>Paikalle saa tulla vain katsomaan ja pelaamaan rentoja matseja. Huomioithan, että tapahtumapaikalla saatat näkyä livestriimissä tai tulla kuvatuksi.</p></article>
      </div>
      <div class="venue-actions"><a class="button button--secondary" href="https://smashroom.fi/" target="_blank" rel="noreferrer">Smash Roomin sivut →</a><a class="button button--secondary" href="https://maps.app.goo.gl/AZsoP8snE4ZxhBgAA" target="_blank" rel="noreferrer">Smash Room Vaasa kartalla →</a></div>
    </section>

    <section class="section day-schedule">
      <div class="section-heading">
        <div><p class="kicker">KAHAKKA 3</p><h2>Päivän aikataulu</h2></div>
        <p>Kahakka 3:n julkaistu tapahtumapäivän aikataulu.</p>
      </div>
      <div class="schedule-list">
        <div><time>15:00</time><span>Ovet aukeavat & casual-matsit</span></div>
        <div><time>17:00</time><span>Poolit 1 & 2 alkavat</span></div>
        <div><time>18:00</time><span>Poolit 3 & 4 alkavat</span></div>
        <div><time>19:00</time><span>Top 16 alkaa</span></div>
        <div><time>21:00</time><span>Top 8 alkaa</span></div>
        <div><time>23:00</time><span>Tapahtuma päättyy</span></div>
      </div>
      <p class="notice"><strong>Huom:</strong> Kahakka 3:n turnausilmoittautuminen sulkeutuu tapahtumaa edeltävänä keskiviikkona klo 23:59 EET. Tarkista ajantasaiset tiedot start.gg:stä.</p>
    </section>

    <section class="section open-tournaments">
      <div class="section-heading">
        <div><p class="kicker">MUUTA PELATTAVAA KAHAKKA 3:ssa</p><h2>Avoimet Tekken 8 -turnaukset</h2></div>
        <p>Nämä ovat Kahakka 3:n avoimia turnauksia ja erillisiä Tekken Slam Suomi -kutsufinaalista.</p>
      </div>
      <div class="tournament-grid">
        <article class="tournament-card tournament-card--main">
          <p class="eyebrow">TEKKEN 8 MAIN TOURNAMENT</p>
          <h3>Pääturnaus</h3>
          <ul>
            <li>10 € osallistumismaksu: 5 € venuelle ja 5 € palkintopottiin. Maksu paikan päällä, vain käteinen.</li>
            <li>Palkinnot kolmelle parhaalle.</li>
            <li>Oman setupin tuomalla osallistuminen pääturnaukseen on maksuton — ota etukäteen yhteyttä järjestäjiin.</li>
            <li>64 pelaajan yläraja.</li>
            <li>Turnaus pelataan PS5-konsoleilla. Ota mukaan PS5-yhteensopiva ohjain.</li>
          </ul>
        </article>
        <article class="tournament-card">
          <p class="eyebrow">TEKKEN 8 AMATEURS</p>
          <h3>Amatööriturnaus</h3>
          <ul>
            <li>Avoin pelaajille, joilla ei ole turnauskokemusta.</li>
            <li>Maksuton osallistuminen.</li>
            <li>16 pelaajan raja.</li>
            <li>Ilmoittautuminen onnistuu myös ilman start.gg-tiliä ottamalla yhteyttä Vaasa Pub Fightersiin tai paikan päällä.</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section practical-info">
      <div class="section-heading">
        <div><p class="kicker">HYVÄ TIETÄÄ</p><h2>Ennen kuin tulet paikalle</h2></div>
        <p>Jos osallistut Kahakka 3:n avoimiin turnauksiin tai saavut katsojaksi, nämä kannattaa tietää.</p>
      </div>
      <div class="practical-list">
        <div><strong>PS5-ohjain mukaan</strong><p>Ota oma PS5-yhteensopiva ohjain. Lainattavia ohjaimia on rajallisesti. PS4-yhteensopivista laitteista kannattaa ilmoittaa järjestäjille etukäteen adapteria varten.</p></div>
        <div><strong>Casual-matsit</strong><p>Turnauspelaamisen lisäksi paikan päällä voi pelata rentoja matseja sivussa.</p></div>
        <div><strong>Discord suositeltu</strong><p>Vaasa Pub Fightersin Discordiin liittyminen on erittäin suositeltavaa, mutta ei pakollista.</p></div>
      </div>
    </section>

    <section class="section contacts-section">
      <div class="section-heading">
        <div><p class="kicker">LISÄTIEDOT & YHTEYSTIEDOT</p><h2>Tapahtuman järjestäjät</h2></div>
        <p>Kysymyksiä voi esittää suomeksi, ruotsiksi tai englanniksi Vaasa Pub Fightersille.</p>
      </div>
      <div class="contact-grid">
        <article class="contact-card"><h3>Vaasa Pub Fighters</h3><div class="contact-links"><a href="https://discord.gg/Wzkn8Es" target="_blank" rel="noreferrer">Discord →</a><a href="https://twitch.tv/vaasapubfighters" target="_blank" rel="noreferrer">Twitch →</a><a href="https://instagram.com/vaasapubfighters" target="_blank" rel="noreferrer">Instagram →</a><a href="https://linktr.ee/VaasaPubFighters" target="_blank" rel="noreferrer">Linktree →</a></div></article>
        <article class="contact-card"><h3>Wasa Game Scene</h3><div class="contact-links"><a href="https://discord.gg/CeYFkk6PkP" target="_blank" rel="noreferrer">Discord →</a><a href="https://instagram.com/wasagamescene" target="_blank" rel="noreferrer">Instagram →</a></div></article>
      </div>
    </section>

    <section class="event event--compact">
      <p class="kicker kicker--live"><span></span> HARJOITUSKAUSI</p>
      <h2>${liveCount ? `${liveCount} osallistujaa on juuri nyt livessä` : "Seuraa harjoittelua suorana"}</h2>
      <p>${liveCount ? "Katso käynnissä olevat harjoitusstriimit ja seuraa kehitystä kohti finaalia." : "Osallistujien Twitch-kanavat löytyvät sivulta jo nyt. Automaattinen live-tila lisätään seuraavaksi."}</p>
      <button class="button button--primary" type="button" data-go="players">Osallistujat</button>
    </section>
  `;
}

function playersView() {
  const live = livePlayers();
  return `
    <section class="page-hero">
      <p class="kicker">TEKKEN SLAM SUOMI</p>
      <h1>Osallistujat</h1>
      <p>Kahdeksan sisällöntuottajaa. Kuukausien harjoitusjakso. Lopuksi kaikki ratkaistaan Tekken 8 -turnauksessa.</p>
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
        <div><p class="kicker">VARMISTUNEET OSALLISTUJAT</p><h2>Tekken Slam Suomi</h2></div>
        <p>${players.length} varmistunutta osallistujaa</p>
      </div>
      <div class="players-grid">${sortedPlayers().map(playerCard).join("")}</div>
    </section>

    <section class="journey">
      <div><p class="kicker">HARJOITUSKAUSI</p><h2>Kehitys näkyväksi.</h2></div>
      <div class="journey__steps">
        <div><strong>01</strong><span>HARJOITTELE</span><p>Striimejä, valmennusta ja Tekken 8 -pelejä koko harjoituskauden ajan.</p></div>
        <div><strong>02</strong><span>KEHITY</span><p>Seuraa hahmovalintoja, oppimista ja osallistujien henkilökohtaisia virstanpylväitä.</p></div>
        <div><strong>03</strong><span>KILPAILE</span><p>Harjoituskausi huipentuu Tekken Slam Suomi -finaaliturnaukseen.</p></div>
      </div>
    </section>
  `;
}

function coachMosaic(coach, compact = false) {
  const items = (coach.allCharacterMosaic || []).slice(0, compact ? 4 : 9);
  if (!items.length) return "";
  return items.map((item) => `<img src="${item.url}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`).join("");
}

function coachCard(coach) {
  const altIcons = (coach.altCharacterImages || []).slice(0,4).map((item) =>
    `<img src="${item.url}" alt="${item.slug}" title="${item.slug}" loading="lazy">`
  ).join("");

  let art;
  if (coach.allCharacters) {
    art = `
      <div class="coach-tile-mosaic">${coachMosaic(coach)}</div>
      <div class="coach-tile-mosaic__badge">KAIKKI<br>HAHMOT</div>`;
  } else if (coach.helpsAll && coach.characterImage) {
    art = `
      <div class="coach-tile-split">
        <div class="coach-tile-split__character">
          <span class="coach-tile-glow"></span>
          <img class="coach-tile-character" src="${coach.characterImage}" alt="${coach.mainCharacter || coach.name}" loading="lazy">
          ${altIcons ? `<div class="coach-select__alts coach-select__alts--split">${altIcons}</div>` : ""}
        </div>
        <div class="coach-tile-split__all">
          <div class="coach-tile-split__mosaic">${coachMosaic(coach, true)}</div>
          <span>KAIKKI<br>HAHMOT</span>
        </div>
      </div>`;
  } else if (coach.characterImage) {
    art = `
      <span class="coach-tile-glow"></span>
      <img class="coach-tile-character" src="${coach.characterImage}" alt="${coach.mainCharacter || coach.name}" loading="lazy">
      ${altIcons ? `<div class="coach-select__alts">${altIcons}</div>` : ""}`;
  } else {
    art = `<div class="coach-tile-mosaic">${coachMosaic(coach)}</div><div class="coach-tile-mosaic__badge">MONIPUOLINEN</div>`;
  }

  const mainLabel = coach.allCharacters
    ? "Kaikki hahmot"
    : (coach.mainCharacter || "Monipuolinen").replaceAll("-", " ");

  return `
    <button type="button" class="coach-select coach-select--tekken ${coach.allCharacters ? "coach-select--mosaic" : ""}" data-coach="${coach.slug}" aria-label="Avaa valmentajan ${coach.name} profiili">
      <div class="coach-select__art coach-select__art--tekken">${art}</div>
      <div class="coach-select__scrim"></div>
      <div class="coach-select__overlay">
        <p>${mainLabel}</p>
        <h3>${coach.name}</h3>
        ${coach.tag ? `<span>${coach.tag}</span>` : ""}
      </div>
    </button>`;
}

function coachInfoRow(label, value) {
  return `<div class="coach-detail-row"><span>${label}</span><p>${value}</p></div>`;
}

function coachProfileView(coach) {
  const mainLabel = coach.allCharacters
    ? "Kaikki hahmot"
    : (coach.mainCharacter || "Monipuolinen").replaceAll("-", " ");

  const characterThumbs = coach.allCharacters
    ? `<div class="coach-character-mosaic coach-character-mosaic--profile">${coachMosaic(coach)}</div>`
    : [
        ...(coach.characterImage ? [{ slug: coach.mainCharacter, url: coach.characterImage }] : []),
        ...(coach.altCharacterImages || [])
      ].slice(0, 6).map((item, index) => `
        <div class="coach-character-chip ${index === 0 ? "coach-character-chip--main" : ""}">
          <img src="${item.url}" alt="${item.slug}" loading="lazy" onerror="this.parentElement.hidden=true">
          <span>${item.slug.replaceAll("-", " ")}</span>
        </div>`).join("");

  const replay = coach.video ? `
    <div class="coach-replay-media">
      <video controls preload="metadata" playsinline data-coach-video>
        <source src="${coach.video}" type="video/mp4">
        Selaimesi ei tue HTML5-videota.
      </video>
      <div class="coach-video-error" hidden>
        <strong>Replay-videota ei voitu toistaa.</strong>
        <p>Videolähde ei vastaa tai tiedosto ei ole selaimen tukemassa muodossa.</p>
        <a href="${coach.video}" target="_blank" rel="noopener">Avaa video →</a>
      </div>
    </div>` : `
    <div class="coach-replay-unavailable">
      <span>REPLAY</span>
      <strong>Video tulossa</strong>
      <p>Tämän valmentajan replay-tiedosto ei ole tällä hetkellä saatavilla lähdeprojektissa.</p>
    </div>`;

  return `
    <section class="coach-profile-hero coach-profile-hero--textonly">
      <button class="back-link" type="button" data-back-coaches>← Takaisin valmentajiin</button>
      <div class="coach-profile-intro">
        <div>
          <p class="kicker">TEKKEN SLAM SUOMI · VALMENTAJA</p>
          <h1>${coach.name}</h1>
          ${coach.tag ? `<p class="coach-tag">${coach.tag}</p>` : ""}
        </div>
        <p class="coach-lead">${coach.description}</p>
      </div>

      <div class="coach-quickfacts coach-quickfacts--hero">
        <div><span>Päähahmo</span><strong>${mainLabel}</strong></div>
        <div><span>Discord</span><strong>${coach.discord}</strong></div>
        <div><span>Saatavuus</span><strong>${coach.availability}</strong></div>
      </div>

      ${characterThumbs ? `<div class="coach-character-strip">${characterThumbs}</div>` : ""}
    </section>

    <section class="section coach-profile-layout">
      <div class="coach-profile-main">
        <div class="coach-section-heading">
          <p class="kicker">VALMENTAJAPROFIILI</p>
          <h2>Miten ${coach.name} auttaa?</h2>
        </div>

        <article class="coach-story-card coach-story-card--featured">
          <p class="eyebrow">VALMENNUSTYYLI</p>
          <h3>Miten valmennan?</h3>
          <p>${coach.style}</p>
        </article>

        <div class="coach-story-grid">
          <article class="coach-story-card">
            <p class="eyebrow">KOKEMUS</p>
            <h3>Tausta</h3>
            <p>${coach.experience}</p>
          </article>
          <article class="coach-story-card">
            <p class="eyebrow">ERIKOISOSAAMINEN</p>
            <h3>Vahvuudet</h3>
            <p>${coach.specialty}</p>
          </article>
        </div>

        <article class="coach-details-card">
          <h3>Pelitiedot</h3>
          ${coachInfoRow("Hahmot", coach.characters)}
          ${coachInfoRow("Saatavuus", coach.availability)}
          ${coachInfoRow("Discord", coach.discord)}
        </article>
      </div>

      <aside class="coach-profile-sidebar">
        <div class="coach-replay-card">
          <div class="coach-replay-card__heading">
            <div><p class="eyebrow">REPLAY</p><h3>${coach.name} pelissä</h3></div>
          </div>
          ${replay}
          <p class="coach-replay-note">Replay on valmentajan oma pelinäyte alkuperäisestä valmentajaprojektista.</p>
        </div>
      </aside>
    </section>`;
}

function coachesView() {
  if (selectedCoach) return coachProfileView(selectedCoach);

  if (coachesState.status === "loading") {
    return `
    <section class="page-hero coaches-hero">
      <p class="kicker">TEKKEN SLAM SUOMI</p>
      <h1>Valitse valmentaja</h1>
      <p>Ladataan valmentajia…</p>
    </section>`;
  }

  if (coachesState.status === "error") {
    return `
    <section class="page-hero coaches-hero">
      <p class="kicker">TEKKEN SLAM SUOMI</p>
      <h1>Valitse valmentaja</h1>
      <p>Valmentajadataa ei juuri nyt saatu ladattua. Yritä päivittää sivu hetken kuluttua.</p>
    </section>`;
  }

  return `
    <section class="page-hero coaches-hero">
      <p class="kicker">TEKKEN SLAM SUOMI</p>
      <h1>Valitse valmentaja</h1>
      <p>${coaches.length} kotimaista Tekken-pelaajaa on mukana auttamassa osallistujia harjoituskaudella. Valitse valmentaja nähdäksesi hahmot, kokemuksen, valmennustyylin ja replay-esittelyn.</p>
    </section>

    <section class="section coaches-select-section">
      <div class="section-heading">
        <div><p class="kicker">CHARACTER SELECT</p><h2>Valmentajat</h2></div>
        <p>Klikkaa korttia avataksesi profiilin.</p>
      </div>
      <div class="coach-select-grid">${coaches.map(coachCard).join("")}</div>
      <p class="coach-source-note">Valmentajien profiilit perustuvat Tekken Slam Suomi -valmentajahaun tietoihin. Valitse kortti nähdäksesi tarkemman esittelyn ja replayn.</p>
    </section>`;
}

function shell(content) {
  return `
    <header class="site-header">
      <button class="brand brand--button" type="button" data-go="info" aria-label="Tekken Slam Suomi etusivulle">TEKKEN SLAM <span>SUOMI</span></button>
      <nav aria-label="Päänavigaatio">
        <button type="button" data-go="info" class="${currentView === "info" ? "active" : ""}">Info</button>
        <button type="button" data-go="players" class="${currentView === "players" ? "active" : ""}">Osallistujat</button>
        <button type="button" data-go="coaches" class="${currentView === "coaches" ? "active" : ""}">Valmentajat</button>
      </nav>
      <button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">Valikko</button>
      <div class="mobile-nav" id="mobile-nav" hidden>
        <button type="button" data-go="info">Info</button>
        <button type="button" data-go="players">Osallistujat</button>
        <button type="button" data-go="coaches">Valmentajat</button>
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

function render() {
  const views = { info: infoView, players: playersView, coaches: coachesView };
  app.innerHTML = shell(views[currentView]());

  app.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.go;
      if (!views[next] || next === currentView) return;
      currentView = next;
      if (next !== "coaches") selectedCoach = null;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      app.querySelector("#view")?.focus({ preventScroll: true });
    });
  });

  app.querySelectorAll("[data-coach]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCoach = coaches.find((coach) => coach.slug === button.dataset.coach) || null;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  app.querySelector("[data-back-coaches]")?.addEventListener("click", () => {
    selectedCoach = null;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const coachVideo = app.querySelector("[data-coach-video]");
  coachVideo?.addEventListener("error", () => {
    coachVideo.hidden = true;
    const errorBox = coachVideo.parentElement?.querySelector(".coach-video-error");
    if (errorBox) errorBox.hidden = false;
  });

  const menuToggle = app.querySelector(".mobile-menu-toggle");
  const mobileNav = app.querySelector("#mobile-nav");
  menuToggle?.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    mobileNav.hidden = expanded;
  });
}

render();
refreshTwitchStatus();
setInterval(() => refreshTwitchStatus(), 60_000);
loadCoaches();
