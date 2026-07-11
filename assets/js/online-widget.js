(function() {
  if (!customElements.get('guild-online-widget')) {
    class GuildOnlineWidget extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `<div style="padding: 1.25rem;"><h4>Online just nu</h4><ul class="widget-list"></ul></div>`;
        this.runCycle();
      }
      async runCycle() {
        const classColors = { 1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569', 5: '#FFFFFF', 6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0', 9: '#9482C9', 11: '#FF7D0A' };
        const emojiIds = { 1: '579532030153588739', 2: '579532029906124840', 3: '579532029880827924', 4: '579532030086217748', 5: '579532029901799437', 6: '599012538935410701', 7: '579532030056857600', 8: '579532030161977355', 9: '579532029851336716', 11: '579532029675438081' };
        
        let nextDelay = 60000;
        const listContainer = this.querySelector('.widget-list');

        try {
          const cacheBuster = "?_t=" + Date.now();
          const [rosterRes, charRes] = await Promise.all([
            fetch('https://www.azzco.xyz/data/roster.json' + cacheBuster, { cache: 'no-store' }),
            fetch('https://www.azzco.xyz/data/characters.json' + cacheBuster, { cache: 'no-store' })
          ]);
          
          const roster = await rosterRes.json();
          const charData = await charRes.json();
          
          let isStale = false;
          let formattedTime = "Okänd tid";

          const lastModifiedHeader = rosterRes.headers.get('Last-Modified');
          if (lastModifiedHeader) {
            const fileModifiedTime = new Date(lastModifiedHeader).getTime();
            const serverTimeEstimate = new Date(rosterRes.headers.get('Date') || Date.now()).getTime();
            const ageInMs = Math.max(0, serverTimeEstimate - fileModifiedTime);
            
            const dateObj = new Date(fileModifiedTime);
            formattedTime = dateObj.toTimeString().split(' ')[0];

            if (ageInMs >= 600000) {
              isStale = true;
              nextDelay = 10000;
            } else if (ageInMs < 60000) {
              nextDelay = (60000 - ageInMs) + 1000;
            } else {
              nextDelay = 5000;
            }
          }

          if (isStale) {
            listContainer.innerHTML = `
              <li style="color: #ef4444; font-size: 0.85rem; line-height: 1.4; list-style: none; margin-top: 0.5rem;">
                Listan är troligtvis inaktuell.<br>
                <span style="color: #71717a; font-size: 0.8rem;">Senaste uppdatering: ${formattedTime}</span>
              </li>`;
          } else {
            const online = (roster.members || []).filter(m => m.isOnline && m.name !== "Kyparen");
            
            listContainer.innerHTML = online.map(m => {
              const charInfo = charData[m.name];
              const color = classColors[m.classId] || '#FFFFFF';
              const icon = emojiIds[m.classId] ? `<img src="https://cdn.discordapp.com/emojis/${emojiIds[m.classId]}.png" style="width:14px; height:14px; vertical-align:middle; flex-shrink:0;">` : '';
              
              let mainLink = '';
              if (charInfo && charInfo.main && charInfo.main !== m.name) {
                mainLink = ` <span style="color:#71717a; font-size:0.8em;">(<a href="https://chromiecraft.com/en/armory/?character/ChromieCraft/${encodeURIComponent(charInfo.main)}" target="_blank" style="text-decoration:none; color:#71717a;">${charInfo.main}</a>)</span>`;
              }

              return `
                <li style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem; font-size:0.85rem;">
                  ${icon}
                  <a href="https://chromiecraft.com/en/armory/?character/ChromieCraft/${encodeURIComponent(m.name)}" target="_blank" style="text-decoration:none; color:${color}; font-weight:600; white-space:nowrap;">
                    ${m.name}
                  </a>
                  <span style="flex:1; overflow:hidden;">${mainLink}</span>
                  <span style="color:#71717a; margin-left:auto;">${m.level}</span>
                </li>`;
            }).join('');
          }
        } catch(e) {
          nextDelay = 15000;
        } finally { 
          setTimeout(() => this.runCycle(), nextDelay); 
        }
      }
    }
    customElements.define('guild-online-widget', GuildOnlineWidget);
  }

  const observer = new MutationObserver((mutations) => {
    const card = document.querySelector('a[href="/medlemslista"]');
    if (card && card.querySelector('img.hextra-card-image')) {
      card.querySelector('img.hextra-card-image').remove();
      if (!card.querySelector('guild-online-widget')) {
        card.prepend(document.createElement('guild-online-widget'));
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();