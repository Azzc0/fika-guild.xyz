const DISCORD_SERVER_ID = "1509567817870082048";
const API_BASE = "https://fika-api-proxy.robin-askelin.workers.dev/raids";

function getLocalDateKey(date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

// Helper to automatically match raid forum tags to your local assets folder
function getLocalRaidImageByTags(forumTags) {
  if (!forumTags || forumTags.length === 0) return null;

  // Convert all tags to lowercase for clean matching
  const tags = forumTags.map(t => t.toLowerCase().trim());

  for (const tag of tags) {
    // Exact overrides/exceptions first
    if (tag.startsWith("togc") || tag.startsWith("toc")) return "/img/raid/toc.png";
    if (tag.startsWith("rs") || tag.includes("ruby")) return "/img/raid/ruby.png";

    // Standard starting matches
    if (tag.startsWith("naxx")) return "/img/raid/naxx.png";
    if (tag.startsWith("os")) return "/img/raid/os.png";
    if (tag.startsWith("eoe")) return "/img/raid/eoe.png";
    if (tag.startsWith("icc")) return "/img/raid/icc.png";
    if (tag.startsWith("ulduar")) return "/img/raid/ulduar.png";
    if (tag.startsWith("voa")) return "/img/raid/voa.png";
  }

  return null;
}

async function fetchAndRenderSchedule() {
  const gridContainer = document.getElementById("rolling-schedule-grid");
  const homeCardAnchor = document.querySelector('a[href="/evenemang"]');
  if (!gridContainer && !homeCardAnchor) return;

  try {
    const response = await fetch(`${API_BASE}?endpoint=scheduledevents`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    const now = new Date();
    
    const sortedEvents = (data.postedEvents || []).map(e => ({
      ...e,
      eventDate: new Date(e.startTime * 1000)
    })).filter(e => e.eventDate >= now)
       .sort((a, b) => a.eventDate - b.eventDate);

    // Process Homepage decoration
    if (homeCardAnchor && sortedEvents.length > 0) {
      const nextEvent = sortedEvents[0];
      try {
        const detailResponse = await fetch(`${API_BASE}?endpoint=event&eventId=${nextEvent.id}`);
        const details = await detailResponse.json();
        renderHomepageCard(homeCardAnchor, { ...nextEvent, ...details });
      } catch (e) {
        console.error("Failed to fetch next event details for home card", e);
        renderHomepageCard(homeCardAnchor, nextEvent);
      }
    } else if (homeCardAnchor) {
      const subtitleEl = homeCardAnchor.querySelector('.hextra-card-subtitle, p');
      if (subtitleEl) subtitleEl.textContent = "Inga planerade event de närmsta dagarna.";
    }

    // Process Main Grid
    if (gridContainer) {
      const hundredDaysFromNow = new Date();
      hundredDaysFromNow.setDate(now.getDate() + 100);

      const gridEvents = sortedEvents.filter(e => e.eventDate <= hundredDaysFromNow);

      const detailedEvents = await Promise.all(gridEvents.map(async (event) => {
        try {
          const detailResponse = await fetch(`${API_BASE}?endpoint=event&eventId=${event.id}`);
          const details = await detailResponse.json();
          return { ...event, ...details };
        } catch (e) {
          console.error(`Failed to fetch details for ${event.id}`, e);
          return event; 
        }
      }));

      renderSchedule(detailedEvents);
    }
  } catch (error) {
    console.error("Schedule core engine error:", error);
    if (gridContainer) {
      gridContainer.innerHTML = `<div class="text-red-500 text-center py-10">Kunde inte hämta schemat. Fel: ${error.message}</div>`;
    }
  }
}

function renderHomepageCard(cardAnchor, event) {
  const cardImg = cardAnchor.querySelector('img');
  const cardTitle = cardAnchor.querySelector('.hextra-card-title, h3');
  const cardSubtitle = cardAnchor.querySelector('.hextra-card-subtitle, p');

  if (cardTitle) cardTitle.textContent = `Nästa räd: ${event.title}`;
  
  const weekdayNames = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const dayName = weekdayNames[event.eventDate.getDay()];
  const timeString = event.eventDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  
  if (cardSubtitle) {
    cardSubtitle.textContent = `Följ med på räd denna ${dayName.toLowerCase()} kl. ${timeString}!`;
  }

  let sizeTag = null;
  let forumTags = [];
  if (event.advancedSettings && event.advancedSettings.forum_tags) {
    const rawTags = event.advancedSettings.forum_tags.split(',').map(t => t.trim());
    rawTags.forEach(tag => {
      if (!tag) return;
      if (/^\d+m$/i.test(tag) && !sizeTag) {
        sizeTag = tag;
      } else {
        forumTags.push(tag);
      }
    });
  }

  // --- Image Selection Fallback Engine ---
  let finalImageUrl = getLocalRaidImageByTags(forumTags); // Priority 1: Smart local match

  if (!finalImageUrl && event.imageUrl) {
    finalImageUrl = event.imageUrl;                      // Priority 2: Event API asset
  }

  // Priority 3 Fallback: If both remain null, cardImg.src is untouched (retains native markdown config)
  if (finalImageUrl && cardImg) {
    cardImg.src = finalImageUrl;
    cardImg.classList.add('home-raid-cover-img');
  }

  const signUps = typeof event.signUpCount !== 'undefined' ? event.signUpCount : (event.signUps ? event.signUps.length : 0);

  let bubblesWrapper = cardAnchor.querySelector('.home-card-bubbles');
  if (!bubblesWrapper) {
    bubblesWrapper = document.createElement('div');
    bubblesWrapper.className = 'home-card-bubbles';
    cardAnchor.style.position = 'relative';
    if (cardTitle) {
      cardTitle.parentNode.insertBefore(bubblesWrapper, cardTitle);
    } else {
      cardAnchor.appendChild(bubblesWrapper);
    }
  }

  const badgeBase = "hx:inline-flex hx:gap-1 hx:items-center hx:rounded-full hx:px-2.5 hx:leading-6 hx:text-[.65rem] hx:border shadow-sm backdrop-blur-xs";
  
  bubblesWrapper.innerHTML = `
    <div class="home-card-left-anchor">
      ${forumTags.map(t => `
        <div class="${badgeBase} badge-home-forum hx:border-neutral-200 hx:bg-neutral-100 hx:text-neutral-900 hx:dark:border-neutral-200/30 hx:dark:bg-neutral-900/30 hx:dark:text-neutral-200">
          <span>${t}</span>
        </div>
      `).join('')}
      <div class="${badgeBase} badge-home-time hx:border-emerald-200 hx:bg-emerald-100 hx:text-emerald-900 hx:dark:border-emerald-200/30 hx:dark:bg-emerald-900/30 hx:dark:text-emerald-200">
        <span>${dayName} - ${timeString}</span>
      </div>
      ${sizeTag ? `
        <div class="${badgeBase} badge-home-size hx:border-blue-200 hx:bg-blue-100 hx:text-blue-900 hx:dark:border-blue-200/30 hx:dark:bg-blue-900/30 hx:dark:text-blue-200">
          <span>${signUps}/${sizeTag.slice(0, -1)}</span>
        </div>
      ` : ''}
    </div>
    <div class="home-card-right-anchor">
      ${event.leaderName ? `
        <div class="${badgeBase} badge-home-leader hx:border-purple-200 hx:bg-purple-100 hx:text-purple-900 hx:dark:border-purple-200/30 hx:dark:bg-purple-900/30 hx:dark:text-purple-200">
          <span>Ledare: ${event.leaderName}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderSchedule(events) {
  const gridContainer = document.getElementById("rolling-schedule-grid");
  if (!gridContainer) return;
  gridContainer.innerHTML = ''; 

  const weekdayNames = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const rollingDaysMap = {};

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + i);
    const dateKey = getLocalDateKey(targetDate);
    let headerTitle = i === 0 ? "Idag" : (i === 1 ? "Imorgon" : weekdayNames[targetDate.getDay()]);

    gridContainer.insertAdjacentHTML('beforeend', `
      <div class="weekly-schedule-col" data-date="${dateKey}">
        <div class="schedule-day-header">${headerTitle}</div>
      </div>
    `);
    rollingDaysMap[dateKey] = 0;
  }

  events.forEach(event => {
    const dateKey = getLocalDateKey(event.eventDate);
    const targetColumn = document.querySelector(`.weekly-schedule-col[data-date="${dateKey}"]`);
    
    if (targetColumn) {
      rollingDaysMap[dateKey]++;
      
      let sizeTag = null;
      let forumTags = [];

      if (event.advancedSettings && event.advancedSettings.forum_tags) {
        const rawTags = event.advancedSettings.forum_tags.split(',').map(t => t.trim());
        rawTags.forEach(tag => {
          if (!tag) return;
          if (/^\d+m$/i.test(tag) && !sizeTag) {
            sizeTag = tag;
          } else {
            forumTags.push(tag);
          }
        });
      }

      const finalImageUrl = event.imageUrl || '';

      const descriptionLines = event.description ? event.description.split('\n') : [];
      const firstLineDescription = descriptionLines[0] || "";
      const discordLink = `https://discord.com/channels/${DISCORD_SERVER_ID}/${event.channelId}/${event.id}`;
      const dayName = weekdayNames[event.eventDate.getDay()];
      const timeString = event.eventDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      const signUps = typeof event.signUpCount !== 'undefined' ? event.signUpCount : (event.signUps ? event.signUps.length : 0);

      const badgeBase = "hx:inline-flex hx:gap-1 hx:items-center hx:rounded-full hx:px-2.5 hx:leading-6 hx:text-[.65rem] hx:border shadow-sm backdrop-blur-xs";

      targetColumn.insertAdjacentHTML('beforeend', `
        <a href="${discordLink}" target="_blank" class="dynamic-card">
          <div class="dynamic-card-header">
            ${finalImageUrl ? `<img class="dynamic-card-img" src="${finalImageUrl}" />` : ''}
            
            <div class="card-anchor-container">
              <div class="card-anchor-left">
                <div class="forum-tags-stack">
                  ${forumTags.map((t) => {
                    const tagClassSafe = t.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    return `
                      <div class="${badgeBase} badge-forum-tag badge-forum-tag-${tagClassSafe} hx:border-neutral-200 hx:bg-neutral-100 hx:text-neutral-900 hx:dark:border-neutral-200/30 hx:dark:bg-neutral-900/30 hx:dark:text-neutral-200">
                        <span>${t}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="consolidated-time-label">
                  ${dayName} - ${timeString}
                </div>
              </div>

              <div class="card-anchor-right">
                ${event.leaderName ? `
                  <div class="${badgeBase} badge-leader hx:border-purple-200 hx:bg-purple-100 hx:text-purple-900 hx:dark:border-purple-200/30 hx:dark:bg-purple-900/30 hx:dark:text-purple-200">
                    <svg height="12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                    <span>Ledare: ${event.leaderName}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          <div class="dynamic-card-body">
            <div class="badges-container">
              ${sizeTag ? `
                <div class="${badgeBase} badge-size hx:border-blue-200 hx:bg-blue-100 hx:text-blue-900 hx:dark:border-blue-200/30 hx:dark:bg-blue-900/30 hx:dark:text-blue-200">
                  <span>${signUps}/${sizeTag.slice(0, -1)}</span>
                </div>
              ` : ''}
            </div>
            <div class="dynamic-card-title">${event.title}</div>
            <div class="dynamic-card-description">${firstLineDescription}</div>
          </div>
        </a>
      `);
    }
  });
}

function initSchedule() {
  const fullGrid = document.getElementById("rolling-schedule-grid");
  const homeCard = document.querySelector('a[href="/evenemang"]');

  if (fullGrid || homeCard) {
    fetchAndRenderSchedule();
  }
}

document.addEventListener("DOMContentLoaded", initSchedule);