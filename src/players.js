// Tekken Slam Suomi -osallistujat.
// Lisää uusi osallistuja kopioimalla yksi olio ja täydentämällä tiedot.
// Live-tiedot (isLive, streamTitle, viewerCount) korvataan myöhemmin Twitch API -integraatiolla.
// `coach`: streamerin oma valmentaja -- valmentajan SLUG (ei nimi!), esim. "mauste",
// "erkka", "ka-fu". Slugin näkee valmentajan profiilisivun URL:sta tai
// tekken-slam-suomi-valmentajat-repon build/coach-map.mjs:stä. Oikea slug tekee
// rivistä napin joka vie suoraan kyseisen valmentajan sivulle.
// Jätetty tyhjäksi kunnes parit on julkistettu -- tyhjänä sivu näyttää
// "Valmentaja: Ilmoitetaan pian" -placeholderin, ei piilota riviä kokonaan.
//
// Pelaajaesittelyn kentät:
// whoAreYou          -> "Kuka olet?"
// aboutYou           -> "Kerro itsestäsi"
// feelGoodSong       -> "Lempibiisi josta tulee hyvä fiilis"
// tournamentThoughts -> "Mitä mietteitä turnaukseen / fiiliksiä?"

export const players = [
  {
    id: "eryoces",
    name: "Eryoces",
    initials: "ER",
    twitchChannel: "eryoces",
    instagram: "erythewolf",
    tiktok: "Eryoces",
    coach: "julumettu",
    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "jonssi",
    name: "Jönssi",
    initials: "JÖ",
    twitchChannel: "jonssi_",
    coach: "varathar",

    whoAreYou: `Jönssi, tarviiko enempää edes sanoa. Hyvinkäältä päin, suuri oluen ystävä.`,

    aboutYou: `Entinen PUBG-kilpapelaaja ja wannabe-bodari, jolla on vähän liiankin huumorintajua. Paljon eri pelejä tulee pelattua, mutta suurimmaksi osaksi FPS-/kauhulinjalla mennään. On sitten vähän pehmeämpikin puoli kolmen kissan elättäjänä. Myös moottoripyörällä tulee rälläiltyä ihan mukavasti!`,

    feelGoodSong: `Ööhh... no jos joku Rauli Baddingin iskelmäbiisi tulee karaokessa, niin oon in!

Mr. Polska - Polska Jumpstyle`,

    tournamentThoughts: `Vara vähän painosti, mutta lupas tarjota parit jos osallistun 😉 Ei mitään hajua tasosta, mutta annetaan oma panos ja katsotaan minne riittää!`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "suikkari96",
    name: "Suikkari96",
    initials: "S9",
    twitchChannel: "suikkari96",
    instagram: "antti_sg96",
    tiktok: "suikkari96",
    coach: "munapoolo",

    whoAreYou: `Suikkari96, ja heti selvennys että nimi juontaa juurensa lempinimestä oikeasta pelitägistä SuicideGamer96 😄

30v, mieslapsi Turusta.`,

    aboutYou: `Pikkupojasta asti videopelien suurkuluttaja. Soulspelit ja vanhat pleikkapelit lähellä sydäntä. Striimannut kohta kolmisen vuotta, hyviä viboja. Verrataan ihmisenä Trailer Park Boys -sarjan Rickyyn 😅

Laulaja, kitaristi. Villi länsi ja synkkä keskiaika teemoina kiinnostelee.`,

    feelGoodSong: `Annan kaksi.

Hyvä fiilis: Bruce Springsteen - Waitin' for a Sunny Day

Lempibiisi: tällä hetkellä viimeiset 3 kk suurkulutuksessa Metal Gear Solidin soundtrackilta Encounter.`,

    tournamentThoughts: `Jännittää. Iso kiitos Mulkille, kun tuli agentin lailla Assyilla pysäyttämään ja kysymään.

Hauska päästä kohtaamaan kentällä itselleen tuttuja striimaajia, joista osa on ihan kavereita kanssa. Yläviistoon niin perkeleesti — sen verran voidaan antaa armoa, että vastustaja saa päättää lentoradan 😉`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "pi4ch",
    name: "pi4ch",
    initials: "P4",
    twitchChannel: "pi4ch",
    instagram: "pi4ch",
    tiktok: "pi4ch",
    coach: "xeroh",

    whoAreYou: `Internetistä tuttu pi4ch!`,

    aboutYou: `Videopelailua on tullut harrastettua laidasta laitaan vuosikymmeniä, mutta taistelupeleihin en oikeastaan ole ikinä koskenut, niin nyt tuli oiva syy haastaa itseä silläkin alueella! 🤩

Internetin kontentin osalta striimejä oon pyöritellyt Twitchissä vuodesta 2014 ja YouTubesta löytyy videoita mm. MoonTV-ryhmän matkasta.

Nörttikuplan ulkopuolella harrastelen moottoriurheilua moottoripyörien parissa enimmäkseen. Edellä mainittuja asioita elämästäni voi seurailla Instagramista ja Twitchistä samalla tutulla nimimerkillä: pi4ch.`,

    feelGoodSong: `[Paradise (w/ Bipolar Sunshine) - DJ Snake, Bipolar Sunshine](https://open.spotify.com/album/6V5S9DCZk49kkNsnIh9gt7?si=MWLbkJOSSCqrZdk2Vtcbhg)`,

    tournamentThoughts: `Vielä ei puntit tutise jännityksestä, kun onhan noissa turnauksissa ja kilpailuissa tullut ennenkin hävittyä (ja voitettua ✨).

Vaasan vierailua odotan todella innolla, kun siellä päin Suomea ei ole tullut oikein käytyä 🤩🤩🤩`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "anmiina",
    name: "anmiina",
    initials: "AN",
    twitchChannel: "anmiina",
    instagram: "anmiina",
    tiktok: "anmiinaoriginal",
    coach: "jarsos",

    whoAreYou: `Moi, oon Anmiina, oikealta nimeltäni Miia. Nicki tulee koko nimestä Miia Anniina, kun sitä aikoinaan hiukan pyöritteli.

Ikää 35, mut jutut ja kasvot 20v. Alun perin Kainuusta, Joensuun kautta eksynyt Hesuleihin (eli Helsinkiin).`,

    aboutYou: `Superintrovertti, mutta striimissä höpöttäjä, ysärin lapsi. Pelisivistyksessä isoja aukkoja, joita striimissä täytellään.

23 vuotta judoa alla, mutta nyt judo alkoi kyllästyttää ja laitan takit naulaan toistaiseksi. Treenailen omaan tahtiin kehonpainoharjoitteilla, mutta on mukavaa kun ei ole aikatauluja.`,

    feelGoodSong: `Musiikkimaku on tosi laaja ja riippuu päivästä, kuukaudesta ja kuun ja tähtien asennosta, mikä biisi iskee milloinkin.

All time -suosikkeja on Phil Collinsin Easy Lover, Guns N' Rosesin Welcome to the Jungle ja Coldplayn A Sky Full of Stars.`,

    tournamentThoughts: `Innostuneet fiilikset! Tykkään hypätä erilaisiin haasteisiin ja haastaa itseäni — mennään syvään päätyyn suoraan.

On kivaa päästä tapaamaan kanssastriimaajia livenä ja pitämään hauskaa. Vaikka oon tosi kilpailuhenkinen, niin tosissaan en jaksa ottaa. Hauskanpito edellä!`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "huntari",
    name: "huntari",
    initials: "HU",
    twitchChannel: "huntari_",
    instagram: "anssikosola",
    youtube: "huntari",
    tiktok: "huntarifin",
    coach: "big-boss",

    whoAreYou: `Meikäläinen on Huntari, suomen twitch jeesus, Asmongold, Jason Momoa mitä näitä nyt on mitä chatti on lempinimiä antanut! 35-vuotias Turkulainen (Kaarinalainen ikuisesti, koska kotikaupunki mutta asun Turus 😄)`,

    aboutYou: `Suorapuheinen tarinasetä joka tykkään haasteista kuin haasteista. Varsinkin peleissä mitä vaikeampaa sen parempi. Entisenä kilpaurheilijana meriittejä löytyy niin jalkapallosta, koripallosta kuin kilpacheerleadingistä. Alotin 2021 livettämisen loukkaantumisen takia maajoukkueleirillä. Pääsääntöisesti livetän Twitchiin, mutta suattapi olla/suattapi olla olemati jotain muutakin on tulossa!`,

    feelGoodSong: `Hollywood Undead - Whatever it takes. Kuvastaa hyvin sitä, että kaikkeni teen oli kyse sitten itsestäni tai lähimmäisistäni. Tässä turnauksessa nimenomaa tämä henkilö on johon sitä heijastan valmentajani **@Big_Boss/Onikage** !`,

    tournamentThoughts: `Erittäin innostuneena ja tykkään hypätä tapahtumiin mitä järjestetään, pyydetään mukaan sekä pääsee verkostoitumaan uusiin vaikuttajiin ja ihmisiin! Kiitos Mulk siitä scouttauksesta Assyilla! Kiitollinen mahdollisuudesta ja tietenkin entisenä kilpaurheilijana. First we give some siima and then we pull a matto alta! 😉`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "r1sbe",
    name: "r1sbe",
    initials: "R1",
    twitchChannel: "r1sbe",
    instagram: "risbekti",
    coach: "",
    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "soca",
    name: "SoCa",
    initials: "SC",
    twitchChannel: "socaw",
    instagram: "Arvo_j",
    tiktok: "socaws",
    coach: "",
    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "iroaoyamada",
    name: "Iro Aoyamada",
    initials: "IA",
    twitchChannel: "iroaoyamada",
    youtube: "iroaoyamada",
    bluesky: "Aoyamadakun",
    coach: "tumefin",

    whoAreYou: `Mä oon Iro Aoyamada, 23v kajaanilainen, geneettisesti seinäjokinen striimaaja.`,

    aboutYou: `Fighting-pelit on ehkä hieman hämärämpi alue, kun en ole hirveästi niitä harrastanut. Korkeintaan Mortal Kombat X:n oon käynnistänyt, mutta story moden äänet oli rikki.

Mainstream-pelit joita pelaan on autopelit, pääsääntöisesti Forza-pelit. Tällä hetkellä striimaan kerran viikossa Forza Horizon 6:ta. Koitan saada joskus Forza Motorsport 2023:n mahtumaan joukkoon, koska siinä käytän rattia ja polkimia, ja näin ollen Wheelcamia.

Forzan lisäksi on myös pieni pool satunnaisia pelejä. Tällä hetkellä joukosta löytyy Minecraft (Hexxit II -modipaketti), My Summer Car, My Winter Car, Animal Crossing: New Horizons ja paljon muuta.

Striimaajan ura alkoi syksyllä 2019, mutta aktiivisempi striimaus alkoi 2022 ja saman vuoden joulukuussa musta tuli Twitch Affiliate. Eli kohta on 4 vuotta siitä, kun musta tuli Affiliate, mutta Partneriksi on vielä pitkä matka.

Tykkään kovasti myös metallimusiikista tai muustakin hieman raskaammasta ja synkemmästä, esim. industrial metal, goth metal, aggrotech, dark electro, DnB, EBM/IBM, ja sit vähän sellanen retrompi trance, breakbeat yms. menee kans.

Oon valmistunut mediapalvelujen toteuttajaksi eli teen valokuvausta, grafiikkaa (omat Twitchin kanavailmeet on mun tekemiä), videoita yms.`,

    feelGoodSong: `Paha! Aika paha. Biisejä on monenlaisia.

Varmaan ehkä sellanen mistä syttyy hyvä fiilis on [Combichrist - Never Surrender](https://open.spotify.com/track/5BPpMjVqRjTQdjo772YKPn?si=974866df94b64510) tai sitten [Rammstein - Amerika](https://open.spotify.com/track/1a8JpAL3vbAdXYrEABvOtb?si=736fa485e69e4f39).`,

    tournamentThoughts: `Jänskättää. Aivan mahtavaa saada Tekken 8 sponssattuna ja näin hyvällä mahdollisuudella tehdä jotakin mun striimausuran osalta merkittävää.`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "the_katjaana",
    name: "The_katjaana",
    initials: "TK",
    twitchChannel: "the_katjaanaa",
    tiktok: "the_katjaana",
    youtube: "thekatjaana",
    coach: "zleepys",

    whoAreYou: `Oon the_katjaanaa, oikeelta nimeltä Katja ja tuun Hyvinkäältä.`,

    aboutYou: `Meikäläinen on sosiaalinen perhonen, joka rakastaa striimata, jutella ja ottaa haasteita vastaan, on se sitten iso tai pieni!

Striimaan pääsääntöisesti Twitchiin, mutta teen myös TikTokia. Minulla on menossa myös 5-vuotisjuhlavuosi, joten tää turnaus tuli oikeeseen aikaan ja paikkaan!`,

    feelGoodSong: `Näitä on paljon, mutta toi Dancing with the Devil on kova Ran-D:iltä.`,

    tournamentThoughts: `Jännittää, mutta hyvä fiilis! Eniten odotan, että pääsen muita striimaajia vastaan pelaamaan ja pääsen nauttimaan treenailuista valmentajan kanssa.

Kuten joku sanoisi: "koutsi hoitaa".

Nähdään areenalla ❤️`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "sitra",
    name: "Sitra",
    initials: "SI",
    twitchChannel: "SitraGaming",
    youtube: "Sitra",
    tiktok: "sitragamingyt",
    instagram: "officialsitra_",
    coach: "nixxoks",

    whoAreYou: `Sitra nimellä tunnetaan somen puolella. YouTube on se mistä alotettiin ja siellä nähdään enimmäkseen nykyisin minecraftin kauhumodi videoita, mutta saattaa sinne eksyä millon mitäkin 🙂`,

    aboutYou: `YouTubea tullut tehtä noin 5 vuotta ja siihen mukaan tullu pikkuhiljaa TikTok. YouTuben puolella tulee pelailtua, mutta TikTokissa tulee tehtyä ruokasisältöä. Oikeastaan aika normi perheen faija Helsingistä, joka tykkää pelata, striimata ja touhuilla kaikkee erilaista somessa.`,

    feelGoodSong: `Eppu normaalit ku laittaa tulille ni onha siinä fiilistä. Mut oikeestaan mikä vaan menee 😁`,

    tournamentThoughts: `Turha tätä sen kummemmin jännittää tms, kunhan pidetää hauskaa 🙂 Jos voitto tulis niin olishan se hienoa mutta katotaan nyt mihin asti mennää.`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "mr_randomizer",
    name: "Mr Randomizer",
    initials: "MR",
    twitchChannel: "mr_randomizer_",
    coach: "levis",

    whoAreYou: `Randomizer Kotkasta, 34v.`,

    aboutYou: `Harrastan speedrunaamista ja Overwatchin kilpapelaamista. Streamerina ja SoMe-persoonana melko kokematon ja minimalistinen, mutta eipä ole ennenkään haitannut menoa!

Rakastan todella paljon matkustamista (mutten sen rahoittamista tai siitä johtuvia selkävaivoja)!`,

    feelGoodSong: `Arch Enemy - Nemesis

Raised Fist - Sound of the Republic`,

    tournamentThoughts: `Hyvällä tavalla jännittävää! Tulen hyvin juttuun coachmänin kanssa ja oon päässyt tosi hyvin porukkaan mukaan. Odotan innolla Vaasan officialeja!`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "lancelot",
    name: "Lancelot",
    initials: "L1",
    twitchChannel: "lancelotssb",
    instagram: "lancelotssb",
    tiktok: "lancelotssb",
    youtube: "lancelotssb",
    coach: "visatron",
    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "z33cus",
    name: "✞Z33cus✞",
    initials: "Z3",
    twitchChannel: "z33cus",
    instagram: "z33cus_viral",
    tiktok: "z33cus",
    youtube: "z33cus",
    kick: "z33cus",
    coach: "ka-fu",
    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "nanhari",
    name: "nänhäri",
    initials: "NÄ",
    twitchChannel: "ouluarcticgaming",
    instagram: "ouluarcticgaming",
    youtube: "ouluarcticgaming",
    coach: "erkka",

    whoAreYou: `Oulu Arctic Gamingin tuottaja, selostaja ja tapahtumakoordinaattori. Kaikki tuntevat nänhärin, mutta nänhäri ei tunne ketään.

Selostelen CS2-turnauksia vähän väliä ja autan tuotannossa striimaajana ja melkein joka roolissa.`,

    aboutYou: `Olen pelannut FPS-pelejä 20 vuotta, joista Counter-Strikeä ylivoimaisesti suurimman osan.

Turhin flexi joka löytyy on, että olin Valven Premier Season 1:n aikana top 50 -pelaaja maailmassa. Ei oteta enempää kantaa sen suhteen, kuinka tosissaan Premierin rankingeja kannattaa ottaa 😄

Erittäin kilpailuhenkinen persoona, joten vaikka tänne hauskaa tultiin pitämään, ei kannata ihmetellä jos pelitunteja tulee 60h viikkoon 😄

Oulu Arctic Gamingia (OAG) pystyy seuraamaan Twitchissä, Instagramissa ja YouTubessa.`,

    feelGoodSong: `Kingslayer - Bring Me The Horizon, BABYMETAL`,

    tournamentThoughts: `Tappelupeleistä kokemusta aika vähän. 28-vuotisen elämäni aikana käyttänyt niihin noin 50 tuntia, kun taas Counter-Strike-sarjaan noin 9000 tuntia.

Fiilikset aika hyvät tapahtumasta. Kiva konsepti ja pääsee haastamaan itseään uudenlaisella tavalla.`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
  {
    id: "eel",
    name: "Eel",
    initials: "EE",
    twitchChannel: "theeelio",
    coach: "heddy",

    whoAreYou: `Eel, tällä hetkellä elelen sen valtameren pohjassa, siinä Rixun kohdalla.`,

    aboutYou: `Videopelit ovat lähellä sydäntä, ja joskus olen niitä työkseniikin päässyt tekemään. Kaikki pelaaminen menee, vaikka kaikissa niissä en hyvä väitä olevanikaan, mutta hyvän mielen kilpailullisuutta ehdottomasti löytyy, pikku banter ja huumori mukana, totta kai. Vaikka hirvee nörtti, niin bilehenkinen oon myös, kun jaksaa.`,

    feelGoodSong: `Hyvä musiikki luo fiilistä. Itsellä ei ole niinkään merkitystä, millainen se fiilis sitten on, kunhan musa on hyvä. Varsinaisia lempibiisejä ei ole, mutta pääsääntöisesti musiikki shuffle usein kaikenlaisen rockin, metallin ja niiden alalajien piirissä. Toki Spotify-tili pitää sisällään kaikkea muutakin jännää.

Jos tälleen turnaus mielessä pitää ns. hype-päällä olla, niin ainakin seuraavat ajavat asiaa:

No Cure - Elwood Stray
The Narrator - Elwood Stray
The Free Life - Turbowolf
Overconfidence - Tallah
Hatef--k - The Bravery`,

    tournamentThoughts: `Hyvin mielin uusia kokemuksia kohti. Taso voi nopeasti tässä joukossa muuttua kovaksi ja se on hyvällä tavalla jännää!`,

    isLive: false,
    streamTitle: "",
    viewerCount: 0,
  },
];
