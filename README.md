# Tekken Slam Suomi

Single-page tapahtumasivuston prototyyppi.

## Käynnistys

```bash
npm start
```

Avaa selaimessa:

```text
http://localhost:5173
```

## Osallistujien muokkaus

Kaikki osallistujat ovat tiedostossa:

```text
src/players.js
```

Lisää osallistuja kopioimalla yksi pelaajaolio ja täydentämällä nimi sekä somekanavat.

## Näkymät

- Info
- Osallistujat
- Valmentajat

Kaikki vaihtuvat JavaScriptillä saman URL:n sisällä.

## Seuraava vaihe

Twitch API voidaan myöhemmin yhdistää `twitchChannel`-kenttiin niin, että `isLive`, `streamTitle` ja `viewerCount` päivittyvät automaattisesti.

## Valmentajat-integraatio

Valmentajadata haetaan **elävästi**, ei enää käsin kopioituna. Palvelin (`server.mjs`) hakee ja välimuistittaa (5 min) ystäväprojektin generoiman `data/coaches.json`-tiedoston:
https://github.com/mulkmulkmulk/tekken-slam-suomi-valmentajat

ja tarjoaa sen frontendille reitistä `/api/coaches`. `src/main.js` hakee sen sivun latautuessa (`loadCoaches()`) ja muuntaa kentät näkymän odottamaan muotoon (`mainCharacter`/`altCharacters`/`helpsAllCharacters` → `mainCharacter`/`alts`/`helpsAll` jne.).

**Tämä tarkoittaa: kun valmentajarosteri päivittyy ja pushataan ystäväprojektin `main`-branchiin, tämä sivu näyttää muutoksen automaattisesti seuraavalla latauksella (tai enintään 5 minuutin viiveellä palvelimen välimuistin takia) — ei käsityötä.**

Valmentajien prosessoidut posterit, hahmokuvat ja replay-videot ladataan edelleen suoraan alkuperäisen GitHub-repon `docs/media/`-kansiosta reitin `/coach-media/*` kautta. Näin mediaa ei tarvitse ylläpitää kahdessa repossa. Jos haluat myöhemmin täysin offline-/self-hosted-version, kopioi alkuperäisen repon `docs/media/` tähän projektiin `public/coaches/media/` ja vaihda `coachMediaBase`-vakio tiedostossa `src/main.js` arvoon `/coaches/media`.

Tapahtuman oma esittelyvideo kuuluu edelleen polkuun:
`public/video/tekken-slam-suomi.mp4`

## Valmentajasivun mediahuomiot

- Valmentajakortit käyttävät samaa hahmojen kokovartalografiikkaa ja "kaikki hahmot" -mosaiikkia kuin alkuperäinen valmentajaprojekti.
- Jos jokin valmentaja puuttuu tällä hetkellä lähdeprojektista (esim. video ei ole vielä valmis), hän ei yksinkertaisesti näy `data/coaches.json`:ssa eikä siis tässäkään näkymässä — ei tarvitse erillisiä poikkeuksia täällä.

⚠️ **HUOM:** `tekken-slam-suomi-valmentajat`-repo on tällä hetkellä julkinen, koska `/api/coaches` ja `/coach-media/*` lukevat sitä suoraan `raw.githubusercontent.com`:sta ilman autentikointia. Jos se vaihdetaan takaisin yksityiseksi ennen julkaisua, nämä reitit lakkaavat toimimasta kunnes joko (a) repo on taas julkinen, tai (b) proxy päivitetään käyttämään GitHubin API:a + access tokenia yksityisen sisällön hakemiseen.

Nykyinen roster sisältää 23 valmentajaa. Sivusto käyttää ystäväprojektin generoituja `docs/media`-assetteja `/coach-media/`-proxyn kautta, joten coach-kuvat ja replayt seuraavat upstream-repon nykyisiä tiedostoja.

## Twitch live -integraatio

1. Kopioi `.env.example` nimelle `.env` projektin juureen.
2. Lisää Twitch Developer -sovelluksesi arvot:

   TWITCH_CLIENT_ID=oma_client_id
   TWITCH_CLIENT_SECRET=oma_client_secret

3. Älä koskaan commitoi `.env`-tiedostoa tai laita secret-arvoa `src/`-tiedostoihin.
4. Käynnistä Node-palvelin uudelleen.
5. Testaa backend: `curl http://127.0.0.1:5173/api/twitch/live`

Backend tarkistaa kaikki osallistujien Twitch-kanavat yhdellä Helix Get Streams -pyynnöllä ja cachettaa tuloksen 30 sekunniksi. Frontend päivittää tilan noin minuutin välein.
