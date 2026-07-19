---
title: Macro
date: 2026-06-03
type: "docs"
weight: 5
prev: /artiklar/addons/
---
I wotlk har vi tillgång till en hel del conditionals i våra macro.

Här är ett försök att samla vettiga macros som samtliga klasser har nytta av, för specifika klasser se respektive sida

-  [{{< wow-icon warr >}} Warrior](../warrior-macro)

## Allmänna macro

##### Mouseover raid marks
Detta macrot sätter rädmarkör på nuvurande enhet under musen
- {{< wow-icon Skull >}} Standard - Skalle
- {{< wow-icon Cross >}} Skift - kryss
- {{< wow-icon Square >}} Ctrl - fyrkant
- {{< wow-icon Moon >}} ctrl+skift - måne
- {{< wow-icon Star >}} Alt - Stjärna
```
/script local t,m="mouseover",((IsShiftKeyDown() and IsControlKeyDown() and 5) or (IsShiftKeyDown() and 7) or (IsControlKeyDown() and 6) or 8) if GetRaidTargetIndex(t)~=m then SetRaidTarget(t,m) end
```

Passar alldeles utmärkt att använda med BindPad
{{< page-cards cols="3" >}}
  {{< page-card path="/artiklar/addons/bindpad" >}}
{{< /page-cards >}}