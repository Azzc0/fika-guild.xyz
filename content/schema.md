---
title: "Kommande räder"
---

Nedan ser du planerade event en vecka framåt. De länkar direkt till discord signup. Mer information om de olika räderna hittar du ... (Fyll i detta vid något tillfälle)

<style>
/* The main layout engine wrapper */
  .weekly-schedule-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  /* Responsive fallback for tablets and mobile viewports */
  @media (max-width: 1024px) {
    .weekly-schedule-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    .weekly-schedule-grid {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
  }

  /* Container Box wrapper for each individual day */
  .weekly-schedule-col {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background-color: rgba(243, 244, 246, 0.3);
    align-self: start;
  }

  html[class~="dark"] .weekly-schedule-col {
    border-color: #262626; 
    background-color: rgba(38, 38, 38, 0.2);
  }

  .schedule-day-header {
    text-align: center;
    font-weight: 700;
    font-size: 1.1rem;
    padding-bottom: 0.25rem;
    margin-bottom: 0.15rem;
  }



.dynamic-card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  color: inherit;
  text-decoration: none;
  transition: all 0.15s ease;
}

.dynamic-card-img {
  grid-row: 1; 
  grid-column: 1;
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 4 / 1;
  margin: 0 !important;
  padding: 0 !important;
}

html[class~="dark"] .dynamic-card {
  border-color: #262626;
  background-color: #111111;
}
  .dynamic-card:hover {
    background-color: rgba(243, 244, 246, 0.6);
  }
  html[class~="dark"] .dynamic-card:hover {
    background-color: rgba(38, 38, 38, 0.4);
  }

  /* Position container for Hextra native tag over the image */
  .leader-tag-overlay {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 10;
  }

.dynamic-card-body {
  padding: 0.75rem;
  display: block;
  min-height: 120px; /* Minimum height for consistency */
  overflow: hidden;
}

.dynamic-card-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.dynamic-card-description {
  font-size: 0.85rem;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ensure the badges-container floats naturally; the parent body will grow to accommodate it */
.badges-container {
  float: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  margin-left: 0.75rem;
  margin-bottom: 0.5rem;
  z-index: 10;
}

.badge-size::before {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 0.25rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='9' cy='7' r='4'%3E%3C/circle%3E%3Cpath d='M23 21v-2a4 4 0 0 0-3-3.87'%3E%3C/path%3E%3Cpath d='M16 3.13a4 4 0 0 1 0 7.75'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

</style>

<div class="weekly-schedule-grid" id="rolling-schedule-grid"></div>

<script>
const DISCORD_SERVER_ID = "1509567817870082048";
const API_BASE = "https://fika-api-proxy.robin-askelin.workers.dev/raids";

async function fetchAndRenderSchedule() {
  const gridContainer = document.getElementById("rolling-schedule-grid");
  if (!gridContainer) return;

  try {
    const response = await fetch(`${API_BASE}?endpoint=scheduledevents`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const eventsToFetch = data.postedEvents.filter(event => {
      const eventDate = new Date(event.startTime * 1000);
      return eventDate >= now && eventDate <= sevenDaysFromNow;
    });

    const detailedEvents = await Promise.all(eventsToFetch.map(async (event) => {
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
  } catch (error) {
    console.error("Schedule error:", error);
    gridContainer.innerHTML = `<div class="text-red-500 text-center py-10">Kunde inte hämta schemat. Fel: ${error.message}</div>`;
  }
}

function renderSchedule(events) {
  const gridContainer = document.getElementById("rolling-schedule-grid");
  gridContainer.innerHTML = ''; 

  const weekdayNames = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const rollingDaysMap = {};

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + i);
    const dateKey = targetDate.toISOString().split('T')[0];
    let headerTitle = i === 0 ? "Idag" : (i === 1 ? "Imorgon" : weekdayNames[targetDate.getDay()]);

    gridContainer.insertAdjacentHTML('beforeend', `
      <div class="weekly-schedule-col" data-date="${dateKey}">
        <div class="schedule-day-header">${headerTitle}</div>
      </div>
    `);
    rollingDaysMap[dateKey] = 0;
  }

  events.forEach(event => {
    const eventDate = new Date(event.startTime * 1000);
    const dateKey = eventDate.toISOString().split('T')[0];
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

      const descriptionLines = event.description ? event.description.split('\n') : [];
      const firstLineDescription = descriptionLines[0] || "";
      const discordLink = `https://discord.com/channels/${DISCORD_SERVER_ID}/${event.channelId}/${event.id}`;
      const timeString = eventDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      const signUps = event.signUpCount || 0;

      const badgeBase = "hx:inline-flex hx:gap-1 hx:items-center hx:rounded-full hx:px-2.5 hx:leading-6 hx:text-[.65rem] hx:border shadow-sm backdrop-blur-xs";

      targetColumn.insertAdjacentHTML('beforeend', `
        <a href="${discordLink}" target="_blank" class="dynamic-card">
          <div class="dynamic-card-header">
            ${event.imageUrl ? `<img class="dynamic-card-img" src="${event.imageUrl}" />` : ''}
            
            ${event.leaderName ? `
              <div class="leader-tag-overlay">
                <div class="${badgeBase} badge-leader hx:border-purple-200 hx:bg-purple-100 hx:text-purple-900 hx:dark:border-purple-200/30 hx:dark:bg-purple-900/30 hx:dark:text-purple-200">
                  <svg height="12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                  </svg>
                  <span>${event.leaderName}</span>
                </div>
              </div>
            ` : ''}

          </div>

          <div class="dynamic-card-body">
            <div class="badges-container">
              <div class="${badgeBase} badge-time hx:border-emerald-200 hx:bg-emerald-100 hx:text-emerald-900 hx:dark:border-emerald-200/30 hx:dark:bg-emerald-900/30 hx:dark:text-emerald-200">
                <svg height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>${timeString}</span>
              </div>
              
              ${sizeTag ? `
                <div class="${badgeBase} badge-size hx:border-blue-200 hx:bg-blue-100 hx:text-blue-900 hx:dark:border-blue-200/30 hx:dark:bg-blue-900/30 hx:dark:text-blue-200">
                  <span>${signUps}/${sizeTag.slice(0, -1)}</span>
                </div>
              ` : ''}
              
              ${forumTags.map((t) => {
                const tagClassSafe = t.toLowerCase().replace(/[^a-z0-9]/g, '-');
                return `
                  <div class="${badgeBase} badge-forum-tag badge-forum-tag-${tagClassSafe} hx:border-neutral-200 hx:bg-neutral-100 hx:text-neutral-900 hx:dark:border-neutral-200/30 hx:dark:bg-neutral-900/30 hx:dark:text-neutral-200">
                    <span>${t}</span>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="dynamic-card-title">${event.title}</div>
            <div class="dynamic-card-description">${firstLineDescription}</div>
          </div>
        </a>
      `);
    }
  });
}

document.addEventListener("DOMContentLoaded", fetchAndRenderSchedule);
</script>