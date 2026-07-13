"use strict";

const EVENT_API_BASE      = "https://fika-api-proxy.robin-askelin.workers.dev/raids?endpoint=event&eventId=";
const DISCORD_SERVER_ID   = "1509567817870082048";

// ── Role display config ───────────────────────────────────────────────────────
const ROLE_CONFIG = [
    { key: "Tanks",     icon: "🛡", label: "Tanks"    },
    { key: "Healers",   icon: "💚", label: "Healers"  },
    { key: "Melee",     icon: "⚔",  label: "Melee"    },
    { key: "Ranged",    icon: "🏹", label: "Ranged"   },
    { key: "DPS",       icon: "⚔",  label: "DPS"      },
    { key: "Tentative", icon: "❓", label: "Osäker"   },
    { key: "Bench",     icon: "🪑", label: "Bänk"     },
    { key: "Absence",   icon: "❌", label: "Frånvaro" },
    { key: "Late",      icon: "⏰", label: "Sen"      },
];

// ── WoW class data ────────────────────────────────────────────────────────────
const CLASS_INFO = {
    1:  { name: "Warrior",      color: "#C79C6E", emote: "579532030153588739" },
    2:  { name: "Paladin",      color: "#F58CBA", emote: "579532029906124840" },
    3:  { name: "Hunter",       color: "#ABD473", emote: "579532029880827924" },
    4:  { name: "Rogue",        color: "#FFF569", emote: "579532030086217748" },
    5:  { name: "Priest",       color: "#FFFFFF", emote: "579532029901799437" },
    6:  { name: "Death Knight", color: "#C41F3B", emote: "599012538935410701" },
    7:  { name: "Shaman",       color: "#0070DE", emote: "579532030056857600" },
    8:  { name: "Mage",         color: "#69CCF0", emote: "579532030161977355" },
    9:  { name: "Warlock",      color: "#9482C9", emote: "579532029851336716" },
    11: { name: "Druid",        color: "#FF7D0A", emote: "579532029675438081" },
};

// Maps specEmoteId → WoW class ID (sourced from roster.js SPECS + Raid Helper reference)
const SPEC_TO_CLASS = {
    // Warrior (1)
    "637564445031399474": 1, "637564445215948810": 1, "637564444834136065": 1,
    // Paladin (2)
    "637564297622454272": 2, "637564297647489034": 2, "637564297953673216": 2,
    // Hunter (3)
    "637564202021814277": 3, "637564202084466708": 3, "637564202130866186": 3,
    // Rogue (4)
    "637564351707873324": 4, "637564352333086720": 4, "637564352169508892": 4,
    // Priest (5)
    "637564323442720768": 5, "637564323530539019": 5,
    "637564323291725825": 5, "887257034066653184": 5,
    // Death Knight (6)
    "637564101274632192": 6, "637564101262049280": 6, "637564101329027082": 6,
    "1013371175210065960": 6, "1013371176430620725": 6, "1013371178485817424": 6,
    // Shaman (7)
    "637564379595931649": 7, "637564379772223489": 7, "637564379847458846": 7,
    // Mage (8)
    "637564231545389056": 8, "637564231469891594": 8, "637564231239073802": 8,
    // Warlock (9)
    "637564406984867861": 9, "637564407001513984": 9, "637564406682877964": 9,
    // Druid (11)
    "637564171696734209": 11, "637564172061900820": 11,
    "637564171994529798": 11, "637564172007112723": 11,
};

// ── State ─────────────────────────────────────────────────────────────────────
let allEvents   = [];
let viewYear    = 0;
let viewMonth   = 0;
let selectedId  = null;
let BADGE_LOOKUP = {}; // built from data/forum_tag_badges.yaml at boot
let BACKGROUND_ENTRIES = []; // built from data/forum_tag_backgrounds.yaml at boot, priority-ordered

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const raw = document.getElementById("cal-events-data");
    if (!raw) return;

    try {
        const data = JSON.parse(raw.textContent || "{}");
        allEvents = (data.postedEvents || []).map(normaliseEvent);
    } catch (e) {
        console.error("kalender: could not parse event data", e);
    }

    const badgeRaw = document.getElementById("forum-tag-badges-data");
    if (badgeRaw) {
        try {
            BADGE_LOOKUP = buildBadgeLookup(JSON.parse(badgeRaw.textContent || "[]"));
        } catch (e) {
            console.error("kalender: could not parse badge data", e);
        }
    }

    const bgRaw = document.getElementById("forum-tag-backgrounds-data");
    if (bgRaw) {
        try {
            BACKGROUND_ENTRIES = buildBackgroundEntries(JSON.parse(bgRaw.textContent || "[]"));
        } catch (e) {
            console.error("kalender: could not parse background data", e);
        }
    }

    const now = new Date();
    const firstUpcoming = allEvents
        .slice()
        .sort((a, b) => a.startTime - b.startTime)
        .find(e => e.startTime >= (now / 1000) - 86400 * 30);

    if (firstUpcoming) {
        const d = new Date(firstUpcoming.startTime * 1000);
        viewYear  = d.getFullYear();
        viewMonth = d.getMonth();
    } else {
        viewYear  = now.getFullYear();
        viewMonth = now.getMonth();
    }

    document.getElementById("cal-prev").addEventListener("click", () => {
        if (--viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderGrid();
    });
    document.getElementById("cal-next").addEventListener("click", () => {
        if (++viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderGrid();
    });

    document.getElementById("cal-detail-backdrop")
        .addEventListener("click", closeDrawer);

    renderGrid();
});

// ── Normalise event from API list ─────────────────────────────────────────────
function normaliseEvent(e) {
    return {
        id:          e.id,
        title:       e.title        || "Event",
        description: e.description  || "",
        forum_tags:  e.forum_tags   || "",
        startTime:   Number(e.startTime)              || 0,
        closeTime:   Number(e.closeTime || e.endTime) || 0,
        signUpCount: Number(e.signUpCount)            || 0,
        leaderName:  e.leaderName   || "",
        imageUrl:    e.imageUrl     || null,
        color:       e.color        || "100,100,100",
    };
}

// ── Calendar grid ─────────────────────────────────────────────────────────────
function renderGrid() {
    const grid  = document.getElementById("cal-grid");
    const label = document.getElementById("cal-month-label");
    if (!grid || !label) return;

    label.textContent = new Date(viewYear, viewMonth, 1)
        .toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

    const today       = new Date();
    const todayY      = today.getFullYear();
    const todayM      = today.getMonth();
    const todayD      = today.getDate();
    const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

    grid.innerHTML = "";
    for (let i = 0; i < 42; i++) {
        let day, month, year, isOther = false;
        if (i < firstDow) {
            day = daysInPrev - firstDow + 1 + i;
            month = viewMonth - 1; year = viewYear;
            if (month < 0) { month = 11; year--; }
            isOther = true;
        } else if (i >= firstDow + daysInMonth) {
            day = i - firstDow - daysInMonth + 1;
            month = viewMonth + 1; year = viewYear;
            if (month > 11) { month = 0; year++; }
            isOther = true;
        } else {
            day = i - firstDow + 1; month = viewMonth; year = viewYear;
        }
        const isToday = !isOther && year === todayY && month === todayM && day === todayD;
        grid.appendChild(buildCell(day, year, month, isOther, isToday, eventsOnDay(year, month, day)));
    }
}

function eventsOnDay(year, month, day) {
    return allEvents.filter(e => {
        const d = new Date(e.startTime * 1000);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
}

function buildCell(day, year, month, isOther, isToday, events) {
    const cell = document.createElement("div");

    // Picks the day's banner respecting data/forum_tag_backgrounds.yaml's
    // priority order across ALL of the day's events — not just whichever
    // event happens to come first in the array. Falls back to Raid
    // Helper's own imageUrl only if nothing in the lookup matched at all.
    const raidImageUrl = pickDayRaidImage(events);

    cell.className = "cal-cell" +
        (isOther      ? " cal-other-month" : "") +
        (isToday      ? " cal-today"       : "") +
        (raidImageUrl ? " cal-has-raid"    : "");

    if (raidImageUrl) {
        // Compose: dark gradient overlay + raid art underneath
        cell.style.backgroundImage =
            `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%), url("${raidImageUrl}")`;
    }

    const num = document.createElement("span");
    num.className   = "cal-day-num";
    num.textContent = day;
    cell.appendChild(num);

    const shown    = events.slice(0, 3);
    const overflow = events.length - shown.length;

    shown.forEach(ev => {
        const strip = document.createElement("div");
        strip.className       = "cal-event-strip";
        strip.dataset.eventId = ev.id;
        strip.textContent     = ev.title;
        const [r, g, b] = parseColor(ev.color);
        strip.style.borderLeftColor = `rgb(${r},${g},${b})`;
        strip.style.background      = `rgba(${r},${g},${b},0.18)`;
        if (ev.id === selectedId) strip.classList.add("cal-selected");
        strip.addEventListener("click", e => { e.stopPropagation(); selectEvent(ev.id); });
        cell.appendChild(strip);
    });

    if (overflow > 0) {
        const more = document.createElement("span");
        more.className   = "cal-more";
        more.textContent = `+${overflow} till`;
        cell.appendChild(more);
    }
    return cell;
}

// ── Event selection ────────────────────────────────────────────────────────────
function selectEvent(id) {
    selectedId = id;
    document.querySelectorAll(".cal-event-strip").forEach(el =>
        el.classList.toggle("cal-selected", el.dataset.eventId === id));

    const detail = document.getElementById("cal-detail");
    if (!detail) return;

    detail.innerHTML = `<div class="cal-dp-loading">Laddar…</div>`;
    openDrawer();

    fetch(EVENT_API_BASE + id)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => { renderDetail(detail, data);      bindCloseBtn(); })
        .catch(()  => {
            const ev = allEvents.find(e => e.id === id);
            if (ev) renderDetailFallback(detail, ev);
            else    detail.innerHTML = `<div class="detail-empty">Event hittades inte.</div>`;
            bindCloseBtn();
        });
}

// ── Render detail from live API ────────────────────────────────────────────────
function renderDetail(panel, data) {
    const title     = data.title       || "";
    const desc      = data.description || "";
    const startTime = data.startTime   ? new Date(data.startTime * 1000)    : null;
    const closeTime = data.closingTime ? new Date(data.closingTime * 1000)  : null;
    const leader    = data.leaderName  || "";
    const signUps   = Array.isArray(data.signUps) ? data.signUps : [];
    const color     = data.color       || "100,100,100";
    const tags      = data.advancedSettings?.forum_tags || "";
    const apiImage  = data.advancedSettings?.image || null;
    const eventId   = data.id || data.channelId || "";

    // Detail panel intentionally shows the event's OWN image from Raid
    // Helper, not the curated raid-tier background — that curated lookup
    // is reserved for the day cell / raid card, where matching a whole
    // raid to one representative piece of art makes sense.
    const bannerUrl = apiImage;
    const [r, g, b] = parseRgbColor(color);
    const { badgeUrl: diffBadgeUrl, size } = resolveDifficulty(tags);

    // Group signUps: role → Map<classId, players[]> for combat roles,
    // or flat array for special statuses (tentative/bench/absence/late)
    const SPECIAL_ROLES = new Set(["Tentative", "Bench", "Absence", "Late"]);
    const roleGroups = {};
    ROLE_CONFIG.forEach(rc => {
        roleGroups[rc.key] = SPECIAL_ROLES.has(rc.key) ? [] : new Map();
    });

    signUps.forEach(s => {
        const rn = s.roleName || "";
        if (!roleGroups[rn]) roleGroups[rn] = SPECIAL_ROLES.has(rn) ? [] : new Map();
        if (SPECIAL_ROLES.has(rn)) {
            roleGroups[rn].push(s);
        } else {
            const classId = SPEC_TO_CLASS[String(s.specEmoteId)] || 0;
            if (!roleGroups[rn].has(classId)) roleGroups[rn].set(classId, []);
            roleGroups[rn].get(classId).push(s);
        }
    });

    // Role limits from classes array
    const classLimits = {};
    if (Array.isArray(data.classes)) {
        data.classes.forEach(c => {
            if (c.limit && c.limit < 999) classLimits[c.name] = c.limit;
        });
    }

    panel.innerHTML = buildDetailHTML({
        title, desc, startTime, closeTime, leader,
        bannerUrl, signUpCount: signUps.length,
        roleGroups, classLimits, r, g, b, size, badgeUrl: diffBadgeUrl, eventId,
    });
}

// ── Render detail from build-time fallback ─────────────────────────────────────
function renderDetailFallback(panel, ev) {
    const [r, g, b] = parseColor(ev.color);
    panel.innerHTML = buildDetailHTML({
        title:      ev.title,
        desc:       ev.description,
        startTime:  ev.startTime ? new Date(ev.startTime * 1000) : null,
        closeTime:  ev.closeTime ? new Date(ev.closeTime * 1000) : null,
        leader:     ev.leaderName,
        bannerUrl:  ev.imageUrl,
        signUpCount: ev.signUpCount,
        roleGroups:  null,
        classLimits: {},
        r, g, b,
        ...resolveDifficulty(ev.forum_tags),
        eventId:    ev.id,
    });
}

// ── Build detail HTML ──────────────────────────────────────────────────────────
function buildDetailHTML({ title, desc, startTime, closeTime, leader,
                            bannerUrl, signUpCount, roleGroups, classLimits,
                            r, g, b, size, badgeUrl, eventId }) {
    let html = "";

    // Close button (always present; only visible on mobile via CSS)
    html += `<div class="cal-dp-toprow">
        <button class="dp-close-btn" id="cal-dp-close" aria-label="Stäng">&#x2715;</button>
    </div>`;

    // Banner
    if (bannerUrl) {
        html += `<img src="${escHtml(bannerUrl)}" alt="" class="cal-dp-banner" loading="lazy">`;
    }

    // Title row
    html += `<div class="cal-dp-header">
        <span class="cal-dp-color-dot" style="background:rgb(${r},${g},${b})"></span>
        <span class="cal-dp-title">${escHtml(title)}</span>
        ${badgeUrl ? `<img src="${escHtml(badgeUrl)}" alt="" class="cal-dp-badge" loading="lazy">` : ""}
    </div>`;

    // Meta
    html += `<div class="cal-dp-meta">`;
    if (startTime) {
        html += metaRow("Datum", formatDate(startTime));
        html += metaRow("Tid",   formatTime(startTime));
    }
    if (closeTime && closeTime.getTime() !== startTime?.getTime()) {
        html += metaRow("Stänger", formatDate(closeTime) + " " + formatTime(closeTime));
    }
    if (leader) html += metaRow("Ledare", escHtml(leader));
    html += `</div>`;

    // Description with Discord markdown (strip -# metadata lines)
    const cleanDesc = stripMetaLines(desc);
    if (cleanDesc.trim()) {
        html += `<div class="cal-dp-description">${parseDiscordMarkdown(cleanDesc)}</div>`;
    }

    // Sign-up sections
    if (roleGroups) {
        const totalSignups = Object.values(roleGroups).reduce((acc, v) => {
            return acc + (v instanceof Map ? [...v.values()].flat().length : v.length);
        }, 0);
        html += `<div class="cal-dp-signups">
            <div class="cal-dp-section-title">Anmälda (${totalSignups})</div>`;
        ROLE_CONFIG.forEach(({ key, icon, label }) => {
            const group = roleGroups[key];
            if (!group) return;
            const isSpecial = Array.isArray(group);
            const count = isSpecial
                ? group.length
                : [...group.values()].flat().length;
            if (count === 0) return;
            html += buildRoleSection(icon, label, group, isSpecial);
        });
        html += `</div>`;
    } else {
        html += `<div class="cal-dp-meta">${metaRow("Anmälda", String(signUpCount))}</div>`;
    }

    // Discord link
    if (eventId) {
        html += `<div class="cal-dp-discord-link">
            <a href="https://discord.com/channels/${DISCORD_SERVER_ID}/${escHtml(eventId)}"
               target="_blank" rel="noopener noreferrer">Öppna i Discord ↗</a>
        </div>`;
    }

    return html;
}

// ── Role group block ───────────────────────────────────────────────────────────
// group: Map<classId, players[]> for combat roles, or players[] for special roles
function buildRoleSection(icon, label, group, isSpecial) {
    const count = isSpecial
        ? group.length
        : [...group.values()].flat().length;

    let html = `<div class="cal-dp-role-group">
        <div class="cal-dp-role-header">
            <span class="cal-dp-role-icon">${icon}</span>
            <span class="cal-dp-role-name">${label}</span>
            <span class="cal-dp-role-count">${count}</span>
        </div>`;

    if (isSpecial) {
        // Flat player list with spec icon
        if (group.length > 0) {
            html += `<ul class="cal-dp-player-list">`;
            group.forEach(p => { html += buildPlayerRow(p); });
            html += `</ul>`;
        }
    } else {
        // Class subgroups, sorted by classId then by signup position
        const sortedClasses = [...group.entries()]
            .sort(([a], [b]) => (a || 99) - (b || 99));

        sortedClasses.forEach(([classId, players]) => {
            const info = CLASS_INFO[classId];
            const className = info ? info.name : (players[0]?.className || "Okänd klass");
            const classColor = info ? info.color : "#9ca3af";
            const classEmote = info ? info.emote : null;

            players.sort((a, b) => (a.position || 999) - (b.position || 999));

            html += `<div class="cal-dp-class-group">
                <div class="cal-dp-class-header">
                    ${classEmote
                        ? `<img src="https://cdn.discordapp.com/emojis/${classEmote}.png?size=32"
                               alt="${escHtml(className)}" class="cal-dp-class-icon">`
                        : ""}
                    <span class="cal-dp-class-name" style="color:${classColor}">
                        ${escHtml(className)} <span class="cal-dp-class-count">${players.length}</span>
                    </span>
                </div>
                <ul class="cal-dp-player-list">`;
            players.forEach(p => { html += buildPlayerRow(p); });
            html += `</ul></div>`;
        });
    }

    html += `</div>`;
    return html;
}

// ── Single player row with spec icon ──────────────────────────────────────────
function buildPlayerRow(p) {
    const name     = escHtml(p.name || "");
    const specId   = String(p.specEmoteId || "");
    const specName = escHtml(formatSpec(p.specName || p.cSpecName || ""));
    const pos      = p.position ? `<span class="cal-dp-player-pos">${p.position}</span>` : "";
    const icon     = specId
        ? `<img src="https://cdn.discordapp.com/emojis/${specId}.png?size=32"
               alt="${specName}" class="cal-dp-spec-icon" loading="lazy">`
        : "";
    return `<li class="cal-dp-player">
        ${pos}${icon}
        <span class="cal-dp-player-name">${name}</span>
        ${specName ? `<span class="cal-dp-player-spec">${specName}</span>` : ""}
    </li>`;
}

// ── Raid banner images ────────────────────────────────────────────────────────
// Sourced entirely from data/forum_tag_backgrounds.yaml — that file's order
// IS the display priority (top wins) when several events land on the same
// day. Matching is exact, case-insensitive, per comma-separated forum tag —
// same convention as the badge lookup. Entries with no url yet (placeholder
// raids like RS/VoA before art is uploaded) are skipped automatically.
//
// NOTE: this curated lookup is used for the day cell (pickDayRaidImage,
// below) and the raid card — NOT the detail panel, which intentionally
// always shows the event's own Raid Helper image instead.
function buildBackgroundEntries(rawEntries) {
    return (rawEntries || [])
        .filter(e => e.url)
        .map(e => ({
            url: e.url,
            tagSet: new Set((e.tags || []).map(t => String(t).toLowerCase().trim())),
        }));
}

// Picks a day cell's banner by walking the priority list first, and for
// each raid tier, checking every event on that day — so the highest-
// priority RAID among the day's events wins, regardless of which event
// happens to be first in the array (that was the earlier bug).
function pickDayRaidImage(events) {
    for (const entry of BACKGROUND_ENTRIES) {
        for (const ev of events) {
            const tags = String(ev.forum_tags || "").split(",").map(t => t.toLowerCase().trim()).filter(Boolean);
            if (tags.some(t => entry.tagSet.has(t))) return entry.url;
        }
    }
    for (const ev of events) {
        if (ev.imageUrl) return ev.imageUrl;
    }
    return null;
}

// ── Size / difficulty detection ────────────────────────────────────────────────
// Difficulty badges are driven ENTIRELY by forum_tags, matched exactly
// (case-insensitively) against data/forum_tag_badges.yaml. That file is
// the single source of truth — add/relabel tags there, not here. There is
// intentionally no regex guessing fallback: if a tag isn't in the file,
// no badge is shown, which is correct for guild meetings, dungeon runs,
// or any tag we haven't mapped yet.
function buildBadgeLookup(rawEntries) {
    const map = {};
    (rawEntries || []).forEach(entry => {
        (entry.tags || []).forEach(tag => {
            map[String(tag).toLowerCase().trim()] = entry.url;
        });
    });
    return map;
}

// Returns { badgeUrl, size } from an event's forum_tags string, or
// { badgeUrl: null, size: null } if no tag matched anything in the lookup.
function resolveDifficulty(tags) {
    const list = String(tags || "").split(",").map(t => t.toLowerCase().trim()).filter(Boolean);
    for (const tag of list) {
        if (BADGE_LOOKUP[tag]) {
            const sizeMatch = tag.match(/(\d+)/);
            return { badgeUrl: BADGE_LOOKUP[tag], size: sizeMatch ? sizeMatch[1] : null };
        }
    }
    return { badgeUrl: null, size: null };
}

// ── Strip -# metadata lines (key:value pattern) from displayed description ─────
function stripMetaLines(text) {
    if (!text) return "";
    return text
        .split("\n")
        .filter(line => !/^-#\s+\w+:\S+/.test(line.trim()))
        .join("\n")
        .trim();
}

// ── Discord markdown renderer ──────────────────────────────────────────────────
function parseDiscordMarkdown(raw) {
    if (!raw) return "";
    const lines  = raw.split("\n");
    const out    = [];
    let inList   = false;

    for (const line of lines) {
        // -# subtext (Discord small/dim text)
        if (/^-#\s/.test(line)) {
            if (inList) { out.push("</ul>"); inList = false; }
            out.push(`<span class="dc-subtext">${inlineMd(line.slice(3))}</span>`);
            continue;
        }
        // Unordered list
        if (/^[-*]\s/.test(line)) {
            if (!inList) { out.push('<ul class="dc-list">'); inList = true; }
            out.push(`<li>${inlineMd(line.replace(/^[-*]\s/, ""))}</li>`);
            continue;
        }
        if (inList) { out.push("</ul>"); inList = false; }

        if (line.trim() === "") {
            out.push("<br>");
        } else {
            out.push(`<p class="dc-line">${inlineMd(line)}</p>`);
        }
    }
    if (inList) out.push("</ul>");
    return out.join("");
}

function inlineMd(text) {
    // Escape HTML first so angle brackets in user text are safe
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return text
        .replace(/`([^`]+)`/g,              "<code>$1</code>")
        .replace(/\*\*(.+?)\*\*/g,          "<strong>$1</strong>")
        .replace(/__(.+?)__/g,              "<u>$1</u>")
        .replace(/\*(.+?)\*/g,              "<em>$1</em>")
        .replace(/_([^_\s][^_]*)_/g,        "<em>$1</em>")
        .replace(/~~(.+?)~~/g,              "<s>$1</s>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
                 '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

// ── Mobile drawer ──────────────────────────────────────────────────────────────
function openDrawer() {
    document.querySelector(".cal-right")?.classList.add("dp-open");
    document.getElementById("cal-detail-backdrop")?.classList.add("dp-open");
}

function closeDrawer() {
    document.querySelector(".cal-right")?.classList.remove("dp-open");
    document.getElementById("cal-detail-backdrop")?.classList.remove("dp-open");
}

function bindCloseBtn() {
    document.getElementById("cal-dp-close")?.addEventListener("click", closeDrawer);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function metaRow(label, value) {
    return `<div class="cal-dp-meta-row">
        <span class="cal-dp-meta-label">${label}</span>
        <span class="cal-dp-meta-value">${value}</span>
    </div>`;
}

function formatSpec(spec) {
    if (!spec) return "";
    return spec
        .replace(/_(?:Tank|Healer|DPS)$/i, "")
        .replace(/\d+$/, "")
        .replace(/_/g, " ");
}

function parseColor(colorStr) {
    if (!colorStr) return [100, 100, 100];
    const p = String(colorStr).split(",").map(n => parseInt(n.trim(), 10));
    return (p.length === 3 && p.every(n => !isNaN(n))) ? p : [100, 100, 100];
}

function parseRgbColor(colorStr) {
    const s = String(colorStr || "").trim();
    if (s.startsWith("#")) {
        const n = parseInt(s.replace(/^#/, ""), 16);
        return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
    }
    return parseColor(s);
}

function formatDate(d) {
    return d.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "long" });
}

function formatTime(d) {
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}