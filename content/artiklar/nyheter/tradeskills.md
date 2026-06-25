---
title: "Bakom kulisserna: Vår dynamiska hantverksdatabas"
summary: "En teknisk genomgång av hur vi förvandlar råa bitmasker från World of Warcraft till en kollektiv och sökbar receptdatabas för hela gillet."
---

För att göra det så enkelt som möjligt att koordinera har vi byggt en helt skräddarsydd hantverksdatabas. Istället för att fokusera på enskilda individers personliga profiler, fokuserar det här verktyget helt på **gillets gemensamma kunskap**. 

Målet är enkelt: Att snabbt besvara frågan *"Kan gillet tillverka det här föremålet just nu, och vem ska jag skicka materialet till?"*

## Vad databasen gör

När du besöker `/professions/` på webbplatsen möts du inte av en statisk lista över spelare, utan av en levande hantverksmatris över hela gillet. 

* **Sökbart receptfokus:** Istället för att klicka dig in på "Azzco" för att gissa dig till vad han kan, söker du direkt på det specifika receptet du behöver – till exempel **Runed Bloodstone**.
* **Kollektiv översikt:** Sökningen visar omedelbart en lista över samtliga aktiva hantverkare i gillet som behärskar receptet (i ursprungsläge skulle både Azzco och Ronal dyka upp som tillgängliga juvelerare).
* **Progressionsverktyg:** Det ger gilleledningen och raidgruppen en direkt indikation på vilka sällsynta formler eller mönster vi fortfarande saknar inför kommande innehållsblock.

---

## Hur det fungerar (Det tekniska flödet)

Hela processen sker helt automatiskt utan manuell handpåläggning via tre sammanlänkade komponenter:

### 1. In-game datainsamling via Bitmasker
När spelets yrkesböcker läses av via vårt addon sparas inte data som långa textsträngar. Blizzard komprimerar informationen till en **Base64-bitmask** inuti en hyperlänk (de välkända `|Htrade:...` länkarna). Den här strängen innehåller information om yrkeskategori, nuvarande färdighetsnivå samt en krypterad block-kod (t.ex. `8/7Vu+MtJ...`) som representerar exakt vilka formler karaktären har lärt sig.

### 2. Centraliserad JSON-payload
Dessa strängar sparas i en central JSON-fil på vår lagringsserver (`azzco.xyz`). Varje gång en medlem uppdaterar sin data sparas deras råa länksträngar under deras karaktärsnamn i filen.

### 3. Matrisbyggandet i Hugo (Magin på webbplatsen)
Det är här systemet skiljer sig från traditionella databaser. Webbplatsen bygger på en static site-generator (Hugo). Istället för att göra tunga databasuppslag varje gång en användare laddar en sida, körs hela avkodningsprocessen i minnet när webbplatsen kompileras:

1. **Regex-parsing:** Hugo skannar JSON-filen med hjälp av reguljära uttryck för att extrahera ut relevanta datafält och isolera bitmasken.
2. **Base64 till Binär-dekstruktion:** Hugo dekonstruerar Base64-strängen tecken för tecken och omvandlar den till sekventiella binära bitar (0 och 1). Dessa matchas mot vår kompletta master-lista över spelets alla tillgängliga recept (`skill_map.json`). Om bit nummer 42 är en `1:a`, betyder det att karaktären kan det specifika hantverket.
3. **Omvänd indexering (The Matrix Twist):** Istället för att tilldela recepten till karaktärens egen sida, vänder vi på strukturen. Receptet blir huvudnoden, och karaktären sorteras in under det receptet i en global gällande matris.

Genom att lägga till ett automatiserat tidsschema i vår GitHub-pipeline byggs hela webbplatsen om automatiskt vid varje timslag. Hugo drar då ner den färska JSON-filen från vår MyCloud-server, utvärderar bitmaskerna på nytt och publicerar de uppdaterade hantverkslistorna helt live!