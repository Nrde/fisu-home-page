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
