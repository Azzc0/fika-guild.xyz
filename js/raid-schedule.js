// raid-schedule.js
// import { raidJSONData } from './mock-data.js';

// Configuration
const API_BASE = "https://raid-helper.dev/api";
const SERVER_ID = "1085816654358921256";
const SUPABASE_FUNCTION_URL = "https://lwzqxzqxuihcwnpgoqcz.supabase.co/functions/v1/raid-helper-proxy"; // TODO: Replace with your actual Supabase project URL

// Date filtering - dynamically set to show one week from today
function getDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Today + 6 days = 7 days total
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
}

const { start: FILTER_START, end: FILTER_END } = getDateRange();

const daysOfWeek = [
    "Måndag", "Tisdag", "Onsdag", "Torsdag",
    "Fredag", "Lördag", "Söndag"
];

// Raid image mapping - detects raid from title
const RAID_IMAGES = {
    // Map of keywords/patterns to image paths
    'molten core': 'mc',
    'mc': 'mc',
    'blackwing lair': 'bwl',
    'bwl': 'bwl',
    'temple of ahn\'qiraj': 'aq40',
    'aq40': 'aq40',
    'naxxramas': 'naxx',
    'naxx': 'naxx',
    'tower of karazhan': 'returntokara',
    'kara40': 'returntokara',
    'karazhan lower halls': 'kara',
    'kara10': 'kara',
    'lower halls': 'kara',
    'ruins of ahn\'qiraj': 'aq20',
    'aq20': 'aq20',
    'zul\'gurub': 'zg',
    'zg': 'zg',
    'onyxia': 'Onyxia', // Note: different path structure
    'ony': 'Onyxia'
};

const placeholderImage = "https://res.cloudinary.com/dhmmkvcpy/image/upload/raid/Scenario";

// --- Popover tracking ---
const openPopovers = new Set();
const eventDataCache = new Map(); // Cache for full event data

// ============================================
// SECTION 1: RAID CARD DATA (Scheduled Events)
// ============================================

/**
 * Detect raid image from title
 */
function detectRaidImage(title) {
    if (!title) return null;
    
    const titleLower = title.toLowerCase();
    
    // Check each raid pattern
    for (const [pattern, imagePath] of Object.entries(RAID_IMAGES)) {
        if (titleLower.includes(pattern)) {
            // Special handling for Onyxia with different CDN path
            if (imagePath === 'Onyxia') {
                return `https://res.cloudinary.com/dhmmkvcpy/image/upload/t_250x100/bgs/${imagePath}`;
            }
            return `https://res.cloudinary.com/dhmmkvcpy/image/upload/raid/${imagePath}`;
        }
    }
    
    return null; // Will fallback to placeholder
}

/**
 * Check if event is within our date filter range
 */
function isEventInDateRange(startTime) {
    if (!startTime) return false;
    
    const eventDate = new Date(startTime * 1000);
    return eventDate >= FILTER_START && eventDate <= FILTER_END;
}

/**
 * Fetch scheduled events from API (v3/servers/SERVERID/scheduledevents)
 * This provides lightweight data for displaying raid cards
 */
async function fetchScheduledEvents() {
    try {
        console.log('Fetching scheduled events from:', `${SUPABASE_FUNCTION_URL}?endpoint=scheduledevents`);
        
        const response = await fetch(`${SUPABASE_FUNCTION_URL}?endpoint=scheduledevents`);
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // Check for error in response
        if (data.error) {
            console.error('API returned error:', data);
            throw new Error(data.error);
        }
        
        console.log('Scheduled events API response:', data);
        
        return filterAndProcessScheduledEvents(data);
    } catch (error) {
        console.error('Failed to fetch scheduled events:', error);
        // Fallback to mock data on error
        console.log('Falling back to mock data');
        return buildScheduledEventsFromMock();
    }
}

/**
 * Process API response for scheduled events
 */
function filterAndProcessScheduledEvents(apiData) {
    // TODO: Adjust this based on actual API response structure
    // The API might return: { events: [...] } or just [...]
    const events = Array.isArray(apiData) ? apiData : (apiData.events || apiData.postedEvents || []);
    
    const scheduledEvents = events
        .filter(event => isEventInDateRange(event.startTime))
        .map(event => {
            const title = event.title || event.displayTitle || "Raid";
            const detectedImage = detectRaidImage(title);
            
            return {
                eventId: event.id || event.eventId,
                title: title,
                startTime: event.startTime,
                endTime: event.endTime,
                image: detectedImage || placeholderImage,
                color: event.color || "#444",
                day: getDayFromTimestamp(event.startTime)
            };
        });
    
    console.log(`Filtered ${scheduledEvents.length} events from API`);
    return scheduledEvents;
}

/**
 * Get day name from unix timestamp
 */
function getDayFromTimestamp(unixSeconds) {
    if (!unixSeconds) return null;
    const date = new Date(unixSeconds * 1000);
    const dayIndex = date.getDay();
    // Convert JS day (0=Sunday) to Swedish week (0=Monday)
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return daysOfWeek[adjustedIndex];
}

/**
 * Transform mock data into scheduled events format
 * This mimics what we expect from the API
 */
function buildScheduledEventsFromMock() {
    const scheduledEvents = [];
    
    daysOfWeek.forEach(day => {
        const raidsJSON = raidJSONData[day] || [];
        raidsJSON.forEach((str, index) => {
            try {
                const parsed = JSON.parse(str || "{}");
                
                // Extract basic info for card display
                const startUnix = parsed.startTime || parsed.start_time || null;
                const endUnix = parsed.endTime || parsed.end_time || null;
                
                // Filter by date range
                if (!isEventInDateRange(startUnix)) {
                    return; // Skip events outside date range
                }
                
                const title = parsed.title || parsed.displayTitle || "Raid";
                const detectedImage = detectRaidImage(title);
                
                scheduledEvents.push({
                    eventId: `mock-${day}-${index}`,
                    title: title,
                    startTime: startUnix,
                    endTime: endUnix,
                    image: detectedImage || placeholderImage,
                    color: parsed.color || "#444",
                    day: day
                });
            } catch (err) {
                console.warn("Failed to parse mock data for day", day, err);
            }
        });
    });
    
    return scheduledEvents;
}

/**
 * Organize scheduled events by day of week
 */
function organizeEventsByDay(events) {
    const organized = {};
    daysOfWeek.forEach(day => organized[day] = []);
    
    events.forEach(event => {
        if (event.day && organized[event.day]) {
            organized[event.day].push(event);
        }
    });
    
    return organized;
}

// ============================================
// SECTION 2: FULL EVENT DATA (Popover Content)
// ============================================

/**
 * Fetch full event data from API (v2/events/EVENTID)
 * This provides detailed data for popover display
 */
async function fetchEventDetails(eventId) {
    // Check cache first
    if (eventDataCache.has(eventId)) {
        console.log(`Using cached data for event ${eventId}`);
        return eventDataCache.get(eventId);
    }
    
    try {
        const response = await fetch(`${SUPABASE_FUNCTION_URL}?endpoint=event&eventId=${eventId}`);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for error in response
        if (data.error) {
            throw new Error(data.error);
        }
        
        console.log(`Event details API response for ${eventId}:`, data);
        
        const processedData = processEventDetails(data);
        eventDataCache.set(eventId, processedData);
        return processedData;
    } catch (error) {
        console.error(`Failed to fetch event details for ${eventId}:`, error);
        // Fallback to mock data if this is a mock event ID
        if (eventId.startsWith('mock-')) {
            console.log('Falling back to mock data');
            return fetchEventDetailsFromMock(eventId);
        }
        return null;
    }
}

/**
 * Get full event details from mock data
 */
function fetchEventDetailsFromMock(eventId) {
    const [, day, index] = eventId.split('-');
    const raidsJSON = raidJSONData[day] || [];
    
    if (!raidsJSON[index]) {
        console.warn("No mock data found for eventId:", eventId);
        return null;
    }
    
    try {
        const parsed = JSON.parse(raidsJSON[index]);
        return processEventDetails(parsed);
    } catch (err) {
        console.warn("Failed to parse event details:", err);
        return null;
    }
}

/**
 * Process raw event data into standardized format for popover
 * Works with both API data and mock data
 */
function processEventDetails(rawData) {
    const specialStatuses = ["late", "bench", "tentative"];
    const absenceStatus = "absence";
    
    const allPlayers = Array.isArray(rawData.signUps) ? rawData.signUps : [];
    
    const normalized = allPlayers.map(p => ({
        ...p,
        classLower: (p.className || "").toLowerCase()
    }));
    
    const absences = normalized.filter(p => p.classLower === absenceStatus);
    const specials = normalized.filter(p => specialStatuses.includes(p.classLower));
    const normalPlayers = normalized.filter(
        p => !specialStatuses.includes(p.classLower) && p.classLower !== absenceStatus
    );
    
    const startUnix = rawData.startTime || rawData.start_time || null;
    const endUnix = rawData.endTime || rawData.end_time || null;
    const startStr = formatUnixToHHMM(startUnix);
    const endStr = formatUnixToHHMM(endUnix);
    
    const displayTime = startStr && endStr
        ? `${startStr}-${endStr}`
        : startStr || rawData.time || "Unknown";
    
    let displayDate = rawData.date || null;
    if (!displayDate && startUnix) {
        const dt = new Date(startUnix * 1000);
        displayDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
    
    // Extract image from nested advancedSettings.image
    const nestedImage = rawData.advancedSettings?.image || "";
    
    // Build Discord link if we have both message ID and channel ID
    const messageId = rawData.id || rawData.messageId || null;
    const channelId = rawData.channelId || null;
    const discordLink = (messageId && channelId)
        ? `https://discord.com/channels/${SERVER_ID}/${channelId}/${messageId}`
        : null;
    
    return {
        title: rawData.title || rawData.displayTitle || "Raid",
        date: displayDate || "Unknown",
        displayTime,
        description: rawData.description || "",
        banner: nestedImage || rawData.image || rawData.banner || "",
        signups: {
            total: normalPlayers.length,
            extra: specials.length
        },
        players: allPlayers,
        absences,
        leader: rawData.leaderName || rawData.leader || "Unknown",
        voiceChannel: rawData.voice_channel || rawData.voiceChannel || "",
        templateId: rawData.templateId || rawData.type || "ct18",
        extraSignups: rawData.extraSignups || {},
        discordLink
    };
}

// ============================================
// SECTION 3: UI HELPERS
// ============================================

// Format unix timestamp to HH:MM (Europe/Stockholm)
function formatUnixToHHMM(unixSeconds) {
    if (!unixSeconds && unixSeconds !== 0) return null;
    try {
        const d = new Date(unixSeconds * 1000);
        return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
        return null;
    }
}

// Convert markdown-style formatting to HTML
function parseMarkdownToHTML(text) {
    if (!text) return '';
    
    // Escape HTML first to prevent XSS
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Convert markdown formatting (order matters!)
    html = html
        // Markdown links: [text](url) - must come before bold/italic to preserve the brackets
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Discord subtext: -# text becomes small text
        .replace(/^-# (.+)$/gm, '<small>$1</small>')
        // Headings: ### heading, ## heading, # heading
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // List items: - item or * item (mark with placeholder BEFORE bold/italic processing)
        .replace(/^[-*] (.+)$/gm, '§§§LISTITEM§§§$1§§§ENDLISTITEM§§§')
        // Bold: **text** or __text__
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_ (must come after bold to avoid conflicts)
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        // Auto-link plain URLs (https://, http://)
        .replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');
    
    // Process list items: wrap consecutive list items in <ul>
    html = html.replace(/(§§§LISTITEM§§§.+?§§§ENDLISTITEM§§§(<br>)?)+/g, (match) => {
        const items = match
            .split('§§§ENDLISTITEM§§§')
            .filter(item => item.includes('§§§LISTITEM§§§'))
            .map(item => {
                const content = item
                    .replace('§§§LISTITEM§§§', '')
                    .replace(/<br>/g, ''); // Remove ALL <br> tags from list items
                return '<li>' + content + '</li>';
            })
            .join('');
        return '<ul>' + items + '</ul>';
    });
    
    return html;
}

// --- Generate class/spec HTML ---
function generateClassSpecHTML(signUps) {
    const specialStatuses = ["late", "bench", "tentative"];
    const absenceStatus = "absence";
    const all = Array.isArray(signUps) ? signUps : [];

    const normalSignups = all.filter(p => {
        const cls = (p.className || "").toLowerCase();
        return !specialStatuses.includes(cls) && cls !== absenceStatus;
    });
    const specials = all.filter(p => specialStatuses.includes((p.className || "").toLowerCase()));
    const absences = all.filter(p => (p.className || "").toLowerCase() === absenceStatus);

    const classGroups = {};
    normalSignups.forEach(p => {
        const cls = p.className || "Unknown";
        if (!classGroups[cls]) classGroups[cls] = [];
        classGroups[cls].push(p);
    });

    const groupedHTML = Object.entries(classGroups).map(([cls, players]) => {
        const specsHTML = players
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(p => {
                const specName = p.specName || "unknown";
                const signupOrder = p.position ?? "?";
                const playerName = p.name || "Unnamed";
                return `<li class="${cls.toLowerCase()}"><span class="${specName.toLowerCase()}">${signupOrder}. ${playerName}</span></li>`;
            }).join("");

        return `
            <div class="class-group" data-class="${cls.toLowerCase()}">
                <div class="class-header ${cls.toLowerCase()}">${cls} (${players.length})</div>
                <ul class="spec-list">${specsHTML}</ul>
            </div>`;
    }).join("");

    const renderSpecials = (status) => {
        const players = specials.filter(p => (p.className || "").toLowerCase() === status);
        if (!players.length) return "";
        const playersHTML = players.map(p => {
            const specName = (p.specName || "unknown").toLowerCase();
            return `<span class="${specName}">${p.name || "Unnamed"}</span>`;
        }).join(", ");
        return `<p class="${status}"><span class="${status}">${status.charAt(0).toUpperCase() + status.slice(1)} (${players.length}):</span> ${playersHTML}</p>`;
    };

    const renderAbsences = () => {
        if (!absences.length) return "";
        const playersHTML = absences.map(p => {
            const specName = (p.specName || "unknown").toLowerCase();
            return `<span class="${specName}">${p.name || "Unnamed"}</span>`;
        }).join(", ");
        return `<p class="absence"><span class="absence">Absent (${absences.length}):</span> ${playersHTML}</p>`;
    };

    // Return an object with separate properties instead of concatenated HTML
    return {
        classGroupsHTML: groupedHTML,
        specialsHTML: `
            ${renderSpecials("late")}
            ${renderSpecials("bench")}
            <br />
            ${renderSpecials("tentative")}
            ${renderAbsences()}
        `
    };
}

// --- Generate extra signups HTML ---
function generateExtraSignupsHTML(extra = {}) {
    return Object.entries(extra)
        .filter(([_, arr]) => arr.length > 0)
        .map(([key, arr]) => `<div class="${key}">${key} (${arr.length}): ${arr.join(", ")}</div>`)
        .join("<br>");
}

// --- Returns the role column labels for a given template ---
function getTemplateFormat(templateId, raidTitle) {
    if (!templateId) {
        console.log(`No templateId found for raid "${raidTitle}", using fallback ["DPS", "Healers", "Tank"]`);
        return ["DPS", "Healers", "Tank"];
    }

    let format;
    switch(templateId) {
        case "wowclassic":
            format = ["Melee", "Ranged", "Healers", "Tanks"];
            break;
        case "ct18":
            format = ["DPS", "Healers", "Tank"];
            break;
        default:
            format = ["DPS", "Healers", "Tank"];
    }

    console.log(`Raid "${raidTitle}" uses templateId "${templateId}", format:`, format);
    return format;
}

// ============================================
// SECTION 4: POPOVER MANAGEMENT
// ============================================

/**
 * Handle raid card click - fetch event details and show popover
 */
async function handleRaidClick(eventId, popoverId) {
    const popover = document.getElementById(popoverId);
    if (!popover) return;

    // If already open, just close it
    if (openPopovers.has(popoverId)) {
        popover.hidePopover?.();
        openPopovers.delete(popoverId);
        return;
    }

    // Show loading state
    popover.innerHTML = '<div class="popover-loading">Loading event details...</div>';
    popover.showPopover?.();
    openPopovers.add(popoverId);

    // Fetch full event details
    const eventDetails = await fetchEventDetails(eventId);
    
    if (!eventDetails) {
        popover.innerHTML = '<div class="popover-error">Failed to load event details</div>';
        return;
    }

    // Render full popover content
    renderPopoverContent(popover, popoverId, eventDetails);
}

/**
 * Render the full popover content with event details
 */
function renderPopoverContent(popover, popoverId, eventDetails) {
    const classSpecData = generateClassSpecHTML(eventDetails.players); // Now returns an object
    const extraHTML = generateExtraSignupsHTML(eventDetails.extraSignups);
    const bannerSrc = eventDetails.banner || placeholderImage;

    // Determine template columns
    const templateFormat = getTemplateFormat(eventDetails.templateId, eventDetails.title);

    // Count roles dynamically
    const roleCounts = {};
    templateFormat.forEach(label => roleCounts[label] = 0);

    const specialStatuses = ["late", "bench", "tentative"];
    const absenceStatus = "absence";

    const normalSignups = eventDetails.players.filter(p => {
        const cls = (p.className || "").toLowerCase();
        return !specialStatuses.includes(cls) && cls !== absenceStatus;
    });

    // Role mapping
    const roleMappingCT18 = {
        "dps": "DPS",
        "healer": "Healers",
        "healers": "Healers",
        "tank": "Tank"
    };

    const roleMappingWoWClassic = {
        melee: "Melee",
        ranged: "Ranged",
        healer: "Healers",
        healers: "Healers",
        tank: "Tanks",
        tanks: "Tanks"
    };

    normalSignups.forEach(p => {
        const roleKey = (p.roleName || "").toLowerCase();
        let mappedRole = roleKey;
        if (eventDetails.templateId === "ct18") {
            mappedRole = roleMappingCT18[roleKey];
        } else if (eventDetails.templateId === "wowclassic") {
            mappedRole = roleMappingWoWClassic[roleKey];
        }
        if (mappedRole && templateFormat.includes(mappedRole)) {
            roleCounts[mappedRole]++;
        }
    });

    // Build role row dynamically
    const roleCells = templateFormat.map(label => {
        return `<td><span class="${label.toLowerCase()}">${label}: ${roleCounts[label]}</span></td>`;
    }).join('');

    popover.innerHTML = `
        <button popovertarget="${popoverId}" popovertargetaction="hide" class="popover-close">❌</button>
        <h3 class="raid-title">
            ${eventDetails.title}
            ${eventDetails.discordLink ? `<a href="${eventDetails.discordLink}" target="_blank" rel="noopener noreferrer" class="discord-link" title="View on Discord">🔗</a>` : ''}
        </h3>
        <p class="description">${parseMarkdownToHTML(eventDetails.description)}</p>

        <table class="raid-info-table">
            <tr>
                <td><span class="lead">${eventDetails.leader}</span></td>
                <td><span class="signup">${eventDetails.signups.total}(+${eventDetails.signups.extra})</span></td>
            </tr>
            <tr>
                <td><span class="date">${eventDetails.date}</span></td>
                <td><span class="time">${eventDetails.displayTime}</span></td>
            </tr>
            <tr>
                ${roleCells}
            </tr>
        </table>

        <div class="class-groups-container">${classSpecData.classGroupsHTML}</div>
        ${classSpecData.specialsHTML}
        <div class="extras">${extraHTML}</div>

        <img class="raidbanner" src="${bannerSrc}" alt="${eventDetails.title}">
    `;
}

// ============================================
// SECTION 5: MAIN RENDER
// ============================================

/**
 * Render the raid schedule with cards
 */
async function renderSchedule() {
    const container = document.getElementById('raidSchedule');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading raid schedule...</div>';

    // Fetch scheduled events (lightweight data for cards)
    const scheduledEvents = await fetchScheduledEvents();
    const eventsByDay = organizeEventsByDay(scheduledEvents);

    container.innerHTML = '';

    // Render each day
    daysOfWeek.forEach(day => {
        const dayRaids = eventsByDay[day] || [];

        const dayElement = document.createElement('div');
        dayElement.className = 'raid-day';
        
        const cardsHTML = dayRaids.length > 0 
            ? dayRaids.map((event, index) => {
                const popoverId = `popover-${event.eventId}`;
                const displayTime = formatUnixToHHMM(event.startTime) || "Unknown";
                
                return `
                    <div class="raid-card" data-event-id="${event.eventId}" data-popover-id="${popoverId}">
                        <div class="raid-color" style="background-color:${event.color}"></div>
                        <img src="${event.image}" alt="${event.title}" class="raid-image"
                            onerror="this.src='${placeholderImage}'">
                        <div class="raid-info">
                            <div class="raid-title">${event.title}</div>
                            <div class="raid-meta">
                                <span class="raid-time">${displayTime}</span>
                            </div>
                        </div>
                    </div>`;
            }).join('')
            : `<div class="no-raids">No raids scheduled</div>`;

        dayElement.innerHTML = `
            <h2 class="day-header">${day}</h2>
            <div class="raid-cards">${cardsHTML}</div>`;
        
        container.appendChild(dayElement);
    });

    // Create empty popovers for each event
    scheduledEvents.forEach(event => {
        const popoverId = `popover-${event.eventId}`;
        const popover = document.createElement('div');
        popover.id = popoverId;
        popover.className = 'raid-popover';
        popover.setAttribute('popover', 'auto');

        popover.addEventListener('toggle', (e) => {
            if (e.newState === 'closed') openPopovers.delete(popoverId);
        });

        // Append inside main content container instead of <body>
        const mainContent = document.querySelector("main#quarto-document-content.content.column-page");
        if (mainContent) {
            mainContent.appendChild(popover);
            console.log(`Popover container appended inside Quarto main for "${event.title}"`);
        } else {
            // fallback, if Quarto structure changes
            document.body.appendChild(popover);
            console.warn(`Main content container not found — fallback for "${event.title}"`);
        }
    });

    // Attach click handlers
    document.querySelectorAll('.raid-card').forEach(card => {
        const eventId = card.getAttribute('data-event-id');
        const popoverId = card.getAttribute('data-popover-id');
        if (eventId && popoverId) {
            card.addEventListener('click', () => handleRaidClick(eventId, popoverId));
        }
    });
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', renderSchedule);