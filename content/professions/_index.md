---
title: "Yrkesdatabas"
---

{{ define "main" }}
<div class="hextra-custom-container" style="padding: 2rem 1rem; max-width: 1200px; margin: 0 auto; font-family: sans-serif;">
  
  <div style="border-bottom: 2px solid #333; padding-bottom: 1.5rem; margin-bottom: 2.5rem;">
    <h1 style="margin: 0; color: #ffd100; font-size: 2.5rem;">Yrkesdatabaser</h1>
    <p style="margin: 0.5rem 0 0 0; color: #888; font-size: 1.1rem;">Välj ett yrke nedan för att se recept, tillgängliga hantverkare och materialkrav.</p>
  </div>

  {{ $presentation := dict }}
  {{ with resources.Get "skill_presentation.json" }}
    {{ $presentation = . | transform.Unmarshal }}
  {{ end }}

  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
    {{ range $skillId, $data := $presentation }}
      {{ $urlSlug := $data.profession_name | lower | urlize }}
      
      <a href="{{ $urlSlug }}/" style="text-decoration: none; color: inherit; display: block;">
        <div style="background: #151515; border: 1px solid #2a2a2a; border-radius: 6px; padding: 1.5rem; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s; height: 100%; box-sizing: border-box;"
             onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='#ffd100'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.5)';"
             onmouseout="this.style.transform='none'; this.style.borderColor='#2a2a2a'; this.style.boxShadow='none';">
          
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            {{ $iconName := "inv_misc_book_09" }}
            {{ if eq ($data.profession_name | lower) "alchemy" }}{{ $iconName = "trade_alchemy" }}
            {{ else if eq ($data.profession_name | lower) "blacksmithing" }}{{ $iconName = "trade_blacksmithing" }}
            {{ else if eq ($data.profession_name | lower) "enchanting" }}{{ $iconName = "trade_engraving" }}
            {{ else if eq ($data.profession_name | lower) "engineering" }}{{ $iconName = "trade_engineering" }}
            {{ else if eq ($data.profession_name | lower) "first aid" }}{{ $iconName = "spell_holy_sealofsacrifice" }}
            {{ else if eq ($data.profession_name | lower) "cooking" }}{{ $iconName = "inv_misc_food_15" }}
            {{ else if eq ($data.profession_name | lower) "leatherworking" }}{{ $iconName = "trade_leatherworking" }}
            {{ else if eq ($data.profession_name | lower) "tailoring" }}{{ $iconName = "trade_tailoring" }}
            {{ else if eq ($data.profession_name | lower) "jewelcrafting" }}{{ $iconName = "inv_misc_gem_01" }}
            {{ end }}
            
            <img src="https://wowgaming.altervista.org/aowow/static/images/wow/icons/medium/{{ $iconName }}.jpg" 
                 style="width: 36px; height: 36px; border: 1px solid #333; border-radius: 4px;" alt="">
            
            <h2 style="margin: 0; font-size: 1.3rem; color: #fff; font-weight: 600;">{{ $data.profession_name }}</h2>
          </div>

          <div style="font-size: 0.85rem; color: #aaa; display: flex; flex-direction: column; gap: 4px;">
            <div>Kategorier: <strong style="color: #eee;">{{ len $data.groups }} st</strong></div>
            
            {{ $recipeCount := 0 }}
            {{ range $gName, $group := $data.groups }}
              {{ $recipeCount = add $recipeCount (len $group.spells) }}
            {{ end }}
            <div>Totalt antal recept: <strong style="color: #ffd100;">{{ $recipeCount }}</strong></div>
          </div>
          
          <div style="margin-top: 1.25rem; font-size: 0.85rem; color: #ffd100; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            Visa databas <span>→</span>
          </div>
        </div>
      </a>
    {{ else }}
      <p style="color: #666; font-style: italic;">Inga yrkesdatabaser hittades.</p>
    {{ end }}
  </div>
</div>
{{ end }}