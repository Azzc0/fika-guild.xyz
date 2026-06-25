---
title: Macro
date: 2026-06-03
---
I wotlk har vi tillgång till en hel del conditionals i våra macro.

Här är ett försök att samla vettiga macros som samtliga klasser har nytta av, för specifika klasser se respektive sida

-  [{{< icon warr >}} Warrior](../warrior-macro)

## Allmänna macro

##### Mouseover raid marks
Detta macrot sätter rädmarkör på nuvurande enhet under musen
- {{< icon Skull >}} Standard - Skalle
- {{< icon Cross >}} Skift - kryss
- {{< icon Square >}} Ctrl - fyrkant
- {{< icon Moon >}} ctrl+skift - måne
- {{< icon Star >}} Alt - Stjärna
```
/script local t,m="mouseover",((IsShiftKeyDown() and IsControlKeyDown() and 5) or (IsShiftKeyDown() and 7) or (IsControlKeyDown() and 6) or 8) if GetRaidTargetIndex(t)~=m then SetRaidTarget(t,m) end
```

