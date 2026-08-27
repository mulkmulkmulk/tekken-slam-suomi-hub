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

Valmentajat-näkymä käyttää `src/coaches.js`-tiedostoa. Tiedot perustuvat projektiin:
https://github.com/mulkmulkmulk/tekken-slam-suomi-valmentajat

Valmentajien prosessoidut posterit, hahmokuvat ja replay-videot ladataan tällä hetkellä suoraan alkuperäisen GitHub-repon `docs/media/`-kansiosta. Näin mediaa ei tarvitse ylläpitää kahdessa repossa. Jos haluat myöhemmin täysin offline-/self-hosted-version, kopioi alkuperäisen repon `docs/media/` tähän projektiin `public/coaches/media/` ja vaihda `mediaBase` tiedostossa `src/coaches.js` arvoon `/coaches/media`.

Tapahtuman oma esittelyvideo kuuluu edelleen polkuun:
`public/video/tekken-slam-suomi.mp4`

## Valmentajasivun mediahuomiot

- Valmentajakortit käyttävät samaa hahmojen kokovartalografiikkaa ja "kaikki hahmot" -mosaiikkia kuin alkuperäinen valmentajaprojekti.
- Tilis-replay ei ole tällä hetkellä saatavilla alkuperäisen GitHub-repon `docs/media/tilis.mp4`-polussa, joten sivu näyttää sille hallitun "Video tulossa" -tilan rikkinäisen videosoittimen sijaan.
- Kun Tilis-video saadaan takaisin, poista `coach.slug === "tilis" ? null :` -poikkeus `src/coaches.js`:stä tai vaihda video paikalliseen URL:iin.

## Valmentajadata

Valmentajalista on synkronoitu 26.8.2026 ystäväprojektin nykyiseen `main`-branchiin:
https://github.com/mulkmulkmulk/tekken-slam-suomi-valmentajat

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
