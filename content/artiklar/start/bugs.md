---
title: "Support & bugtracker"
type: "docs"
---

Servern är baserad på Azeroth Core och är väldigt nära besläktat med det projektet. De använder inte spelets "ticket" funktion något vidare, istället förlitar de sig på [github issues](https://github.com/chromiecraft/chromiecraft/issues) för bugtracking och [Chromeicrafts discord](https://discord.com/invite/jUdJRhmT3J) `# 🆘 | support-ticket` kanal för direkt assistans.

Skulle du uppleva att något känns konstigt i ett quest eller liknande, gå in på deras [github issues](https://github.com/chromiecraft/chromiecraft/issues), rör det sig om ett quest, sök efter quest namnet - glöm inte bort att det kan finnas värdeful information i avslutade ärenden - ta bort `state:open` ifrån sökfältet för att se avslutade ärenden. Jag nämner detta då de försöker hålla quests blizzlike med allt vad det innebär. Ett praktexempel på ett avslutat ärende med värdeful information:

[`Quest: Icecrown: The Hunter and the Prince #9865 `](https://github.com/chromiecraft/chromiecraft/issues/9865)
> The report may be valid, but the current public AC/CC source says Matthias Lehner should dynamically summon gameobject 194023 for quest 13400 on quest accept, and Wowhead comments warn the stone is easy to miss because it does not sparkle and may appear around Matthias. Ask the reporter to abandon/reaccept and check immediately near the summon coordinates before routing this as a new AC bug.

Det länkas även till relaterat issue i det här senaste till ett mycket äldre.

[`[Quest] The Hunter and the Prince #1937`](https://github.com/azerothcore/azerothcore-wotlk/issues/1937)
> Tested with ali player, as soon as you take in the quest from de npc the Bloodstained Stone are spawn in .go xyz 6331.72 2360.05 477.274 don't use .quest add
> check mouse pointer, also be aware that will despawn in a few seconds (less than a minute)