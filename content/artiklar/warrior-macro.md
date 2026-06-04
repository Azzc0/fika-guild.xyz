---
title: "Warrior macron"
date: 2026-06-03
---

I wrath så är macros relativt begränsade jämfört med vanilla men samtidigt finns det fler funktioner att nyttja.

Här är lite samlingar på macron som kan vara av nytta för en warrior.

## Allmänna

##### CD

Visar din stora cooldown aktuellt för nuvarande stance.

```
#showtooltip
/cast [stance:1] Retaliation;[stance:3]Recklessness; Shield Wall
```

##### AoE

Visar din AoE beroende på vilken stance du står i

```
#showtooltip
/cast [stance:1/2] Thunder Clap; Whirlwind
```

##### Interrupt
Visar din interrupt ability beroende på vilken stance du står i eller beroende på om du har sköld på i battle stance.
```
#showtooltip
/cast [stance:3] Pummel; [stance:2] Shield Bash; [equipped:shield] Shield Bash; [] Pummel
```


## Protection Warrior

##### Warbringer
Använder Intervene på party/raid target annars charge, om den är på cd, intercept.
```
#showtooltip
/cast [help] Intervene
/castsequence reset=15 Charge, Intercept
```