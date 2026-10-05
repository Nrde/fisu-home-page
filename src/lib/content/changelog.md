<!--
	Muutosloki — ihmiselle luettava yhteenveto siitä mitä sivustolle on
	tehty JULKAISUN (eli GitHub-pushin) tarkkuudella, EI raaka git-
	commit-loki. Uusin julkaisu YLIMPÄNÄ. Sävy: hieman leikkisä mutta
	silti oikeasti informatiivinen — ei pelkkää sisäistä tekniikkapuhetta.

	Muoto (tarkoituksella yksinkertainen, ei täyttä Markdownia — ks.
	`src/lib/utils/changelog.ts`:n `parseChangelog`):
	  ## PP.K.VVVV HH:MM
	  - Yksi rivi per muutoskohta.
-->

## 5.10.2026 18:53

- Uusi "Arvostelut"-sivu: kirjaudu Steam ID:llä ja FISU:n Discordista löytyvällä salasanalla, ja anna 1–5 tähden arvosana ajamillesi autoille, radoille ja auto+rata-yhdistelmille. Arvostelut ovat täysin anonyymejä — kukaan ei näe kuka arvioi mitäkin.
- Autojen ja ratojen listoissa sekä niiden omilla sivuilla näkyy nyt yhteisön keskiarvo ja arvostelujen määrä, plus radan sivulla lista "parhaista autoista tällä radalla" muiden arvostelujen perusteella.
- Kisasivulta pääsee nyt suoraan radan omalle sivulle linkistä otsikon alla — aiemmin piti etsiä rata erikseen Radat-valikosta.
- Sivujen latautuessa näkyy nyt ohut latauspalkki ruudun yläreunassa heti linkkiä klikatessa, jotta sivusto ei tunnu jumittavan hiljaisella hetkellä ennen kuin seuraava sivu ilmestyy.
- Korjattu pieni ulkoasubugi: "Parhaat autot tällä radalla" -otsikolla oli liian vähän marginaalia

## 1.10.2026 21:03

- Selaimen välilehdessä ja kirjanmerkeissä näkyvä kuvake ("favicon") on nyt vihdoin FISU:n oma logo — Vihdoin myös lukutaidottomat osaavat valita sivun bookmarkeista.
- Sivu latautuu nyt nopeammin: logo pieneni 146 kilotavusta muutamaan kilotavuun, ja sivun CSS/JS-tiedostot niputettiin yhdeksi isommaksi sen sijaan että selain joutui lataamaan kymmeniä pieniä tiedostoja peräkkäin ennen kuin mitään näkyi ruudulla.
- Himmeä teksti (esim. pisteet/kisa-lukema) ja korttien reunaviivat säädettiin selvemmin erottuviksi taustasta — osa oli hieman liian himmeää näkörajoitteisille.
- Discord-nappi otsikkopalkissa ei enää "hyppää" ylöspäin kun sitä hiirellä osoittaa — pelkkä reunan värinvaihto. Ja "olen sivun tärkein nappi" koko muutettiin "olen yksi nappi muiden joukossa" kokoiseksi.
- (Konepellin alla: Lighthouse-raportin pohjalta tehty siivous — kuvan pakkaus, tiedostojen niputus, väri- ja kontrastisäädöt. Selaimen takaisin/eteenpäin-välimuisti (bfcache) jäi vielä tutkittavaksi, ei korjattavaksi tällä kertaa.)

## 30.9.2026 21:00

- Uusi "Rating"-sivu: kuljettajien reittauksen kehitys kisa kisalta animoituna pylväskaaviona, plus tavallinen sijoituslista alla niille joita animaatiot eivät kiinnosta.
- Kaaviota selataan nyt raahaamalla — kiinteät "1–15 / 16–30..." -välilehdet vaihtuivat yhteen jatkuvaan liukuikkunaan, joka näyttää myös vihreällä kuinka moni sijoitus on kussakin kisassa ylipäätään jo ratkaistu.
- Tiettyä kuljettajaa voi hakea nimellä ja "seurata" — hänen palkkinsa korostuu ja liukuikkuna seuraa automaattisesti hänen sijoitustaan koko kauden ajan, sekä ylös että alas, ilman että sitä tarvitsee itse metsästää.
- Korjattu bugi, jossa kisa jolta puuttui tallennettu aika-ajotulos (esim. Road Atlanta -osakilpailu) näytti KAIKKIEN kuljettajien menettäneen sijoja lähdöstä — syy oli JavaScriptin oma kepponen ("" muuttuu laskennassa nollaksi), ei kenenkään oikea ajosuoritus.
- Otsikkopalkin logon ja "FISU."-tekstin pisteen väliin livahtanut ylimääräinen väli korjattu.
- (Konepellin alla: pylväiden pituusanimaatio korjattu toimimaan luotettavasti kaikissa selaimissa, kaavion otsikon fonttikoot ja marginaalit siistitty, kaavio levenee lähemmäs sivun muuta sisältöä.)

## 27.9.2026 16:00

- Otsikkopalkkiin ilmestyi FISU-logo "FISU."-tekstin viereen — sivusto näyttää nyt vihdoin siltä että joku oikeasti suunnitteli sen, eikä vain kirjoittanut sitä Internet Assistant for Microsoft Wordillä. Lisäksi Silverspeed on tyytyväinen.
- (Konepellin alla: ensimmäinen logotiedosto oli 453 kilotavun kokoinen jäljitetty SVG. Vaihdettiin kevyempään kuvaan ennen kuin kukaan ehti valittaa latausajoista.)

## 27.9.2026 12:30

- Autotiedot saapuivat kausi- ja kilpailusivuille: jokaisen kauden ja kisan autot näkyvät nyt suoraan, ja jokaiselle autolle löytyy oma tarkennussivunsa ("Autot"-valikosta) kausi- ja kisahistorioineen.
- Kisatulossivu osaa nyt näyttää KUKA ajoi MILLÄ autolla — ei enää pelkkää fiksua arvausta "jos kaudella oli vain yksi auto, sillä kaikki varmaan ajoivat".
- Kisan voittajan kokonaisaika näkyy nyt tuloksissa tyhjän kohdan sijaan, muiden erotus voittajaan näkyy edelleen ennallaan.
- Karsintasplitit (Split 1 / Split 2 jne.) otettiin käyttöön: kuljettajat järjestetään nyt oikein splitin mukaan sen sijaan että kaikki näkyisivät yhtenä isona vääränlaisena listana, jossa splitin 2 voittaja näytti paremmalta kuin splitin 1 viimeinen.
- Pitkät kuljettajanimet (kiitos siitä, "Lucky like Fauntleroy") mahtuvat nyt siististi kisakortteihin törmäämättä DNF-merkintöihin.
- (Konepellin alla: API ehti muuttaa autodatan muotoa kolmesti parin päivän sisällä turvotuksen välttämiseksi. Jokainen muutos fiksattiin samana päivänä. APIa vahditaan nyt automaattisesti ja koodaria huomautetaan heti jos näin käy vielä uudestaan.)
