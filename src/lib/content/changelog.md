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

## 30.10.2026 01:00

- Kuljettajan omalla sivulla on nyt "Rating historia" -viivagraafi: koko uran reittaus kisa kisalta, skaalattuna juuri SEN kuljettajan omaan nousu-/laskuväliin eikä kaikkien 250+ kuljettajan yhteiseen — näkyy siis selvästi vaikka oma reittaus pyörisi aina samalla sadalla pisteellä. Vie hiiri käyrän päälle niin näet tarkan pisteluvun, kisan ja kauden kohdalta.
- Käyrä piirtyy nyt pehmeästi auki sivun latautuessa sen sijaan että läiskähtäisi kerralla näkyviin.
- Rating-sivun kisajärjestys oli hetken aikaa sekaisin — aloitti tuoreimmasta kaudesta ja vanheni taaksepäin, lähestulkoon kuin Memento-elokuva. Syy löytyi lopulta API:n omasta cache-tiedostosta eikä täältä, mutta ehdimme silti kääntää koodia väärään suuntaan pari kertaa matkalla ennen kuin tajusimme sen.
- (Konepellin alla: kuljettajan uran haku ja reittausdata yhdistetty yhdeksi rinnakkaiseksi API-kutsusarjaksi, ja kausien nimet luetaan nyt luotettavasti API:n omasta listasta sen sijaan että niitä arvattaisiin kisan nimen väliviivoista — jälkimmäinen hajosi aina kun kisan OMA nimi sattui sisältämään väliviivan.)

## 27.10.2026 14:20

- Kisasivun otsikko VIE suoraan radan sivulle, ja kauden nimi kauden omalle sivulle, ilman että välissä pitää erikseen klikata "← Takaisin kauteen" -nappia, pikkuhiljaa UI suunnittelu siirtyy 2000 -luvulle
- "← Kaikki kaudet/autot/radat/kuljettajat" -paluunuolet poistettu kisasivuilta — yläreunan valikko toimii
- Fontit kasvavat/pienenevät nyt uuden, hipsterimmän `progress()`-CSS-funktion avulla selaimissa jotka sen jaksavat tukea — muille mikään ei muuttunut, koska vanha kunnon `clamp()` odottaa yhä nurkan takana turvaverkkona. Lopputulos näyttää käytännössä identtiseltä, mikä on tavallaan koko operaation hauskin osa. Kiitokset Kevin Powelille, mutta Kevin, laita jatkossa koodi githubiin niin ei tarvitse kopsata ruudulta. 
- Kierroksen jääneet kuljettajat saavat VIHDOIN lukea "+1 kierros" eron sarakkeessa sen sijaan että rivi jäisi mystisesti tyhjäksi, ikään kuin kuljettaja olisi hiljaa poistunut aika-tila-jatkumosta. Kiitos API:n uudelle `lapsDown`-kentälle — tyhjä sarake oli muuten teknisesti "ei bugi", mutta kukaan ei uskonut sitä.
- API-tiimi korjasi omalta puoleltaan kauden kilpailujen järjestyksen (nyt oikeasti kisapäivän mukaan, ei arvonta-numeron) ja sen kummallisen kisan jossa KAIKKI maaliin ajaneet kuljettajat oli merkitty keskeyttäneiksi.
- (Konepellin alla: arvostelusivun API-kutsut päivitetty vastaamaan API:n uutta, yhtenäistä `{success, data}`-kääremuotoa — "arvostelut lakkaavat toimimasta huomenna" -tyyppinen hiljainen katastrofi vältetty etukäteen, ei jälkikäteen.)

## 15.10.2026 22:30

- Etusivun otsikon ikuisesti puolittunut "g"-kirjain sai vihdoin itsensä näkyviin kokonaan — riittää, että rivi hengittää hieman enemmän.
- Teksti on taas mahdollista valita ja NÄHDÄ että se on valittu — aiemmin valitun pätkän väri hukkui taustaan kuin hyvä naamiomaalaus.
- Napit ja pienet valitsimet kutistuivat ja saivat pyöreämmät nurkat.
- Kauden kisalistalla kisa, jota ei ikinä ajettu, on nyt "Ei ajettu" sen sijaan että väittäisi vuosia vanhaa kisaa yhä "Tulevaksi".
- Tilastot-sivulla "1 kisa" ei enää taivu väärin monikkoon, otsikko "Kausien kehitys" vaihtui kuvaavammaksi "Kilpailut ja kuljettajat", ja ratalistan turha sisennys katosi.
- Jos API pätkii hetkeksi, sivu näyttää nyt OIKEAN virheilmoituksen sen sijaan että huusi aina samaa ympäripyöreää "500 Internal Error" -viestiä riippumatta siitä mikä oikeasti meni pieleen.
- Kuljettajan ajamat kaudet näkyvät nyt uusimmasta vanhimpaan, ei puolisekaisessa järjestyksessä.

## 11.10.2026 15:30

- Autoilla on nyt kasvot! Autolistassa ja auton omalla sivulla näkyy esikatselukuva — jos ylläpito on sellaisen jaksanut ladata, tietysti, muuten näkyy edelleen vaatimaton "Kuvaa ei vielä lisätty" -teksti.
- Auton sivu muutettiin näyttämään vähän enemmän radan sivulta: kuva ja tietolaatikko rinnakkain, kuvaus omassa siistissä laatikossaan.

## 10.10.2026 10:15

- Etusivun "Yhteisö numeroina" -laatat ovat nyt siististi keskitetty, eikä "Ensimmäinen kausi" väitä enää FISU:n ensimmäisen kisan olleen "2 018".
- Jos auto on ajanut jonkin kauden aikana vain yhden kisan (muiden autojen seassa), sen omalla sivulla näkyy nyt se kisa — aiemmin sivulla vain geneerinen "ei tiedossa" tieto, vaikka tieto olisi ollut koko ajan kädenulottuvilla.
- Muutaman radan kartta ja muita tietoja lisätty, vielä muutama odottaa pöytälaatikossa.
- Arvostelu sivu alkaa olla julkaisukunnossa.

## 9.10.2026 22:42

- ISO API päivitys, ehkä kaikki bugit korjattu, riivitty kasaan kadonneet kisat ja kaudet jne. 
- Kahden tai useamman lähdön kisat, kahden tai useamman splitin kisat ja niiden yhdistelmät näkyvät nyt toivottavasti oikein.

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
