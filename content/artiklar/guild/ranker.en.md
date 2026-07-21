---
type: "docs"
prev: /artiklar/guild/regler
next: /artiklar/guider
weight: 4
title: "Ranker i gillet"
---
<!-- 
I world of warcraft har högsta ranken lägst numerisk siffra, denna artikeln drivs väldigt mycket av en data fil och skulle de följande sektionerna inte stämma överens med denna listan så är något lite fel. Rank nummer

- Rank: 0 - {{< guild_rank_label 0 >}}
- Rank: 1 - {{< guild_rank_label 1 >}}
- Rank: 2 - {{< guild_rank_label 2 >}}
- Rank: 3 - {{< guild_rank_label 3 >}}
- Rank: 4 - {{< guild_rank_label 4 >}}
- Rank: 5 - {{< guild_rank_label 5 >}}
- Rank: 6 - {{< guild_rank_label 6 >}}
- Rank: 7 - {{< guild_rank_label 7 >}}
- Rank: 8 - {{< guild_rank_label 8 >}}
- Rank: 9 - {{< guild_rank_label 9 >}} 

layouts/shortcodes/guild_rank_permissions.html-13: {{- range seq 1 4 -}}
Begränsar vilka flikar som syns, den ligger ganska djupt in i raden anvädn Ctrl+F-->


## Rank: 0 - Guild Master
Högsta hönset men också högsta ansvaret. Den som besitter ranken guild master har full behörighet till i princip allt och lite till.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 0 >}}

{{< /details >}}


## Rank: 1 - Officer

Kaffekokarna i officergänget hjälper {{< guild_rank_label 0 >}} sköta gillet.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 1 >}}

{{< /details >}}

## Rank: 2 - Officer - Alt

Kaffekokarnas alter har samma befogenheter överlag men lite mer begränsad tillgång till guildbanken.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 2 >}}

{{< /details >}}


## Rank: 3 - Inventarie

Det är egentligen ärkekaffekokar ranken som enbart "Kyparen" besitter.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 3 >}}

{{< /details >}}

## Rank: 4 - Kärnmedlem

Kärnmedlemmar är de som tar oss framåt och, som i namnet, utgör kärnan i Fika. Dessa får förtur när det kommer till platser i våra räder och vi kan därför behöva begränsa antalet i denna ranken så att alla får plats i våra räder.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 4 >}}

{{< /details >}}

## Rank: 5 - Veteran

Gamla hederliga godingar som tidigare varit kärnmedlemmar en längre period eller högre och som av någon anledning tagit ett kliv tillbaka i aktivitet.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 5 >}}

{{< /details >}}

## Rank: 6 - Medlem

En medlem i fika förväntas vara intresserad av att räda och ha ambitioner på att avancera till {{< guild_rank_label 4 >}}

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 6 >}}

{{< /details >}}

## Rank: 7 - Social

En medlem i fika som inte är intresserad av att faktiskt räda med oss men som gärna hänger med i gillet ändå.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 7 >}}

{{< /details >}}

## Rank: 8 - Alt

En karaktär som tillhör någon som redan är med i gillet på en annan karaktär. Kan hända att vi kommer plocka bort denna ranken i favör för en nivå mellan kärnmedlem och vanlig medlem.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 8 >}}

{{< /details >}}

## Rank: 9 - Provmedlem

Här landar man när man fått inbjudan till gillet. Eftersom man kan bjuda in sig själv till gillet med addonet så har denna ranken väldigt begränsade behörigheter. Skicka en bild på en kopp kaffe eller te i [`# 💬-general`](https://discord.com/channels/1509567817870082048/1509567818750754918) så vi ser att du faktiskt är en riktig fikare [^1].

[^1]: Guldstjärna och plus i kanten om du har hembakade kanelbullar med i bilden.

{{< details title="Befogenheter" closed="true">}}

{{< guild_rank_permissions 9 >}}

{{< /details >}}
