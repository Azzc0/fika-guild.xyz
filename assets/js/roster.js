"use strict";

// ── Endpoints ─────────────────────────────────────────────────────────────────
const ROSTER_URL       = "https://www.azzco.xyz/data/roster.json";
const CHARACTERS_URL   = "https://www.azzco.xyz/data/characters.json";
const TRANSLATIONS_URL = "/utils/guild-translations.json";

// ── Language Detection & Localization ─────────────────────────────────────────
const IS_EN = document.documentElement.lang.startsWith("en");

const TEXT = {
    colName:          IS_EN ? "Name" : "Namn",
    colLevel:         IS_EN ? "Level" : "Nivå",
    colRank:          IS_EN ? "Rank" : "Grad",
    searchPlaceholder:IS_EN ? "Search players or alts…" : "Sök spelare eller alter…",
    columnsBtn:       IS_EN ? "⊞ Columns" : "⊞ Kolumner",
    columnsTitle:     IS_EN ? "Show/hide columns" : "Visa/dölj kolumner",
    clearFilter:      IS_EN ? "Clear filter" : "Rensa filter",
    statusAll:        IS_EN ? "All" : "Alla",
    statusOnline:     IS_EN ? "🟢 Online" : "🟢 Online",
    statusOffline:    IS_EN ? "⬜ Offline" : "⬜ Offline",
    officerNote:      IS_EN ? "Officer Note" : "Officersanteckning",
    position:         IS_EN ? "Location" : "Position",
    note:             IS_EN ? "Note" : "Anteckning",
    professions:      IS_EN ? "Professions" : "Yrken",
    viewArmory:       IS_EN ? "View on Armory ↗" : "Visa på Armory ↗",
    filterTitle:      IS_EN ? "Right-click to filter" : "Högerklicka för att filtrera",
    errorLoad:        IS_EN ? "Could not load the guild roster. Please try again later." : "Kunde inte ladda guildlistan. Försök igen senare.",
    stalenessWarning: (lm) => IS_EN 
        ? `Data was last updated ${lm} and may be outdated.` 
        : `Data uppdaterades senast ${lm} och kan vara inaktuell.`
};

// ── Config ────────────────────────────────────────────────────────────────────
const LS_KEY_COLS  = "fika_roster_cols";
const LS_KEY_SORT  = "fika_roster_sort";

// ── Class data ────────────────────────────────────────────────────────────────
const CLASS_NAMES = {
    1:"Warrior", 2:"Paladin", 3:"Hunter", 4:"Rogue", 5:"Priest",
    6:"Death Knight", 7:"Shaman", 8:"Mage", 9:"Warlock", 11:"Druid"
};
const CLASS_EMOJI = {
    1:"579532030153588739", 2:"579532029906124840", 3:"579532029880827924",
    4:"579532030086217748", 5:"579532029901799437", 6:"599012538935410701",
    7:"579532030056857600", 8:"579532030161977355", 9:"579532029851336716",
    11:"579532029675438081"
};

// ── Role data ─────────────────────────────────────────────────────────────────
const ROLE_SRC = { tank:"https://res.cloudinary.com/dhmmkvcpy/image/upload/v1783882546/tank_hwrbwi.png", heal:"https://res.cloudinary.com/dhmmkvcpy/image/upload/v1783882545/heal_nhnuvj.png", dps:"https://res.cloudinary.com/dhmmkvcpy/image/upload/v1783882544/dps_nr2vpp.png" };

const normalizeRole = (specStr) => {
    if (!specStr || specStr === "EMPTY") return null;
    const r = specStr.split(":")[0].toLowerCase();
    return r === "rdps" ? "dps" : (ROLE_SRC[r] ? r : null);
};

// ── Spec data ─────────────────────────────────────────────────────────────────
const SPECS = {
    "tank:arms":          {label:"Arms",          id:"637564445031399474"},
    "dps:arms":           {label:"Arms",          id:"637564445031399474"},
    "dps:fury":           {label:"Fury",          id:"637564445215948810"},
    "tank:protection":    {label:"Protection",    id:"637564444834136065"},
    "rdps:arcane":        {label:"Arcane",        id:"637564231545389056"},
    "dps:arcane":         {label:"Arcane",        id:"637564231545389056"},
    "rdps:frost":         {label:"Frost",         id:"637564231469891594"},
    "rdps:fire":          {label:"Fire",          id:"637564231239073802"},
    "dps:fire":           {label:"Fire",          id:"637564231239073802"},
    "dps:assassination":  {label:"Assassination", id:"637564351707873324"},
    "dps:combat":         {label:"Combat",        id:"637564352333086720"},
    "dps:subtlety":       {label:"Subtlety",      id:"637564352169508892"},
    "heal:discipline":    {label:"Discipline",    id:"637564323442720768"},
    "dps:discipline":     {label:"Discipline",    id:"887257034066653184"},
    "heal:holy":          {label:"Holy",          id:"637564323530539019"},
    "rdps:shadow":        {label:"Shadow",        id:"637564323291725825"},
    "dps:shadow":         {label:"Shadow",        id:"637564323291725825"},
    "rdps:affliction":    {label:"Affliction",    id:"637564406984867861"},
    "dps:affliction":     {label:"Affliction",    id:"637564406984867861"},
    "rdps:demonology":    {label:"Demonology",    id:"637564407001513984"},
    "dps:demonology":     {label:"Demonology",    id:"637564407001513984"},
    "rdps:destruction":   {label:"Destruction",   id:"637564406682877964"},
    "dps:destruction":    {label:"Destruction",   id:"637564406682877964"},
    "rdps:beast_mastery": {label:"Beast Mastery", id:"637564202021814277"},
    "dps:beast_mastery":  {label:"Beast Mastery", id:"637564202021814277"},
    "rdps:marksmanship":  {label:"Marksmanship",  id:"637564202084466708"},
    "dps:marksmanship":   {label:"Marksmanship",  id:"637564202084466708"},
    "rdps:survival":      {label:"Survival",      id:"637564202130866186"},
    "dps:survival":       {label:"Survival",      id:"637564202130866186"},
    "heal:holy_pal":      {label:"Holy",          id:"637564297622454272"},
    "tank:protection_pal":{label:"Protection",    id:"637564297647489034"},
    "dps:retribution":    {label:"Retribution",   id:"637564297953673216"},
    "tank:blood":         {label:"Blood",         id:"637564101274632192"},
    "dps:blood":          {label:"Blood",         id:"637564101274632192"},
    "tank:frost":         {label:"Frost",         id:"637564101262049280"},
    "dps:frost":          {label:"Frost",         id:"637564101262049280"},
    "tank:unholy":        {label:"Unholy",        id:"637564101329027082"},
    "dps:unholy":         {label:"Unholy",        id:"637564101329027082"},
    "rdps:balance":       {label:"Balance",       id:"637564171696734209"},
    "dps:balance":        {label:"Balance",       id:"637564171696734209"},
    "dps:feral":          {label:"Feral",         id:"637564172061900820"},
    "tank:feral":         {label:"Feral",         id:"637564171994529798"},
    "heal:restoration":   {label:"Restoration",   id:"637564172007112723"},
    "rdps:elemental":     {label:"Elemental",     id:"637564379595931649"},
    "dps:elemental":      {label:"Elemental",     id:"637564379595931649"},
    "dps:enhancement":    {label:"Enhancement",   id:"637564379772223489"},
    "heal:restoration_sh":{label:"Restoration",   id:"637564379847458846"},
};

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMN_DEFS = [
    { key:"chevron",  label:"",            sortable:false, toggleable:false, filterable:false, width:"28px",  align:"center" },
    { key:"class",    label:"",            sortable:true,  toggleable:false, filterable:true,  width:"32px",  align:"center" },
    { key:"role1",    label:"Main Spec",   sortable:true,  toggleable:true,  filterable:true,  width:"30px",  align:"center" },
    { key:"role2",    label:"Off Spec",    sortable:true,  toggleable:true,  filterable:true,  width:"30px",  align:"center" },
    { key:"name",     label:TEXT.colName,  sortable:true,  toggleable:false, filterable:false, width:"110px", align:"left"   },
    { key:"level",    label:TEXT.colLevel, sortable:true,  toggleable:true,  filterable:false, width:"40px",  align:"right"  },
    { key:"rank",     label:TEXT.colRank,  sortable:true,  toggleable:true,  filterable:true,  width:"100px", align:"left"   },
    { key:"status",   label:"Status",      sortable:true,  toggleable:true,  filterable:true,  width:"100px", align:"left"   },
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    groups:       [],
    characters:   {},
    filteredRows: [],
    sortedRows:   [],
    sort:         { col:"rank", dir:"asc", secondary:"name" },
    search:       "",
    expandedKey:  null,
    selectedName: null,
    cols:         {},
    filters:      { classIds: new Set(), rankIds: new Set(), onlineOnly: null, roles: new Set() },
};

// ── Persistence ───────────────────────────────────────────────────────────────
const loadPrefs = () => {
    try {
        const cols = JSON.parse(localStorage.getItem(LS_KEY_COLS) || "{}");
        const sort = JSON.parse(localStorage.getItem(LS_KEY_SORT) || "{}");
        COLUMN_DEFS.forEach(c => {
            state.cols[c.key] = c.key in cols ? cols[c.key] : true;
        });
        if (sort.col) { state.sort.col = sort.col; state.sort.dir = sort.dir || "asc"; }
    } catch(_) {
        COLUMN_DEFS.forEach(c => { state.cols[c.key] = true; });
    }
};
const saveColPrefs = () => {
    try { localStorage.setItem(LS_KEY_COLS, JSON.stringify(state.cols)); } catch(_) {}
};
const saveSortPrefs = () => {
    try { localStorage.setItem(LS_KEY_SORT, JSON.stringify({col:state.sort.col, dir:state.sort.dir})); } catch(_) {}
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const esc = (v) => String(v||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

const normalizeKey = (v) => String(v||"").trim().toLowerCase();

const formatLastSeen = (days) => {
    const s = Math.max(0, Math.floor(days * 86400));
    const m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
    
    if (IS_EN) {
        if (d >= 1) return `${d} day${d===1?"":"s"} ago`;
        if (h >= 1) return `${h} hour${h===1?"":"s"} ago`;
        if (m >= 1) return `${m} minute${m===1?"":"s"} ago`;
        return "Recently";
    } else {
        if (d >= 1) return `${d} dag${d===1?"":"ar"} sedan`;
        if (h >= 1) return `${h} tim${h===1?"me":"mar"} sedan`;
        if (m >= 1) return `${m} minut${m===1?"":"er"} sedan`;
        return "Nyligen";
    }
};

const armoryUrl = (name) =>
    `https://chromiecraft.com/en/armory/?character/ChromieCraft/${encodeURIComponent(name)}`;

const cdnEmoji = (id, sz="1.4em", title="", cls="") =>
    `<img src="https://cdn.discordapp.com/emojis/${id}.png" style="width:${sz};height:${sz};object-fit:contain;vertical-align:middle;border-radius:3px;" title="${esc(title)}" alt="${esc(title)}"${cls?` class="${cls}"`:""}>`;

// ── Icon helpers ──────────────────────────────────────────────────────────────
const classImg = (classId, sz="1.5em") => {
    const id  = CLASS_EMOJI[classId];
    const lbl = CLASS_NAMES[classId] || String(classId);
    return id ? cdnEmoji(id, sz, lbl) : esc(lbl);
};

const roleImg = (specStr, sz="1.35em") => {
    const role = normalizeRole(specStr);
    return role ? `<img src="${ROLE_SRC[role]}" style="width:${sz};height:${sz};object-fit:contain;vertical-align:middle;" title="${esc(role)}" alt="${esc(role)}">` : "";
};

const specImg  = (specStr, sz="1.2em") => {
    const sp = SPECS[specStr];
    return sp ? cdnEmoji(sp.id, sz, sp.label) : "";
};

// ── Profession parser ─────────────────────────────────────────────────────────
const parseProfession = (raw) => {
    if (!raw || raw === "EMPTY") return null;
    const lm = raw.match(/\|Htrade:\d+:(\d+):(\d+):[^|]+\|h\[([^\]]+)\]\|h/);
    if (lm) return {name:lm[3], current:+lm[1], max:+lm[2]};
    const pm = raw.match(/^(\d+):(\d+):(.+)$/);
    if (pm) return {name:pm[3].trim(), current:+pm[1], max:+pm[2]};
    return null;
};

// ── Data processing ───────────────────────────────────────────────────────────
const resolveMainKey = (name, chars) => {
    const m = (chars[name]?.main || "").trim();
    return (!m || m === "EMPTY") ? name : m;
};

const processData = (rosterData, characters, ranks, zones, fileAge) => {
    const groupMap = new Map();

    rosterData.forEach(m => {
        if (Number(m.rank) === 3) return; // skip Inventarie
        const offline   = Number(m.lastLogoff) || 0;
        const ce        = characters[m.name] || null;
        const member = {
            name:        m.name,
            classId:     m.classId,
            level:       Number(m.level),
            rankId:      Number(m.rank),
            rankName:    ranks[m.rank] || `Rank ${m.rank}`,
            publicNote:  (m.publicNote || "").trim(),
            officerNote: (m.officerNote || "").trim(),
            zoneName:    zones[m.zoneId] || "",
            statusText:  m.isOnline ? "Online" : formatLastSeen(offline + fileAge),
            isOnline:    !!m.isOnline,
            lastLogoff:  offline,
            spec1:       ce?.spec1 || "",
            spec2:       ce?.spec2 || "",
            professions: ce?.professions || {},
        };
        const mk = normalizeKey(resolveMainKey(m.name, characters));
        if (!groupMap.has(mk)) groupMap.set(mk, {key:mk, main:null, alts:[]});
        groupMap.get(mk).members = groupMap.get(mk).members || [];
        groupMap.get(mk).members.push(member);
    });

    const groups = [];
    groupMap.forEach((g, key) => {
        const main = g.members.find(m => normalizeKey(m.name) === key) || g.members[0];
        const alts = g.members.filter(m => m !== main)
            .sort((a,b) => {
                if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                return a.lastLogoff - b.lastLogoff;
            });
        const clusterOnline = g.members.some(x => x.isOnline);
        const clusterStatus = clusterOnline ? "Online"
            : alts.length
                ? [...g.members].sort((a,b) => a.lastLogoff - b.lastLogoff)[0].statusText
                : main.statusText;

        groups.push({ key, main, alts, clusterStatus, clusterOnline,
            allNames: [main.name, ...alts.map(a => a.name)].join(" ").toLowerCase() });
    });

    return groups;
};

// ── Sort & filter ─────────────────────────────────────────────────────────────
const sortValue = (group, col) => {
    const m = group.main;
    switch(col) {
        case "name":   return normalizeKey(m.name);
        case "level":  return -m.level;
        case "rank":   return m.rankId;
        case "status": return group.clusterOnline ? -1 : m.lastLogoff;
        case "class":  return m.classId;
        case "role1":  { const order={tank:0,heal:1,dps:2}; return order[normalizeRole(m.spec1)] ?? 9; }
        case "role2":  { const order={tank:0,heal:1,dps:2}; return order[normalizeRole(m.spec2)] ?? 9; }
        default:       return 0;
    }
};

const applyFilterAndSort = () => {
    const q = state.search.toLowerCase().trim();
    const { classIds, rankIds, onlineOnly, roles } = state.filters;

    const filtered = state.groups.filter(g => {
        if (classIds.size  && !classIds.has(g.main.classId))  return false;
        if (rankIds.size   && !rankIds.has(g.main.rankId))    return false;
        if (onlineOnly !== null && g.clusterOnline !== onlineOnly) return false;
        if (roles.size) {
            const memberRoles = new Set(
                [normalizeRole(g.main.spec1), normalizeRole(g.main.spec2)].filter(Boolean)
            );
            if (![...roles].some(r => memberRoles.has(r))) return false;
        }
        if (q && !g.allNames.includes(q) && !g.main.rankName.toLowerCase().includes(q)) return false;
        return true;
    });

    const { col, dir, secondary } = state.sort;
    filtered.sort((a, b) => {
        let v = sortValue(a, col) < sortValue(b, col) ? -1
              : sortValue(a, col) > sortValue(b, col) ?  1 : 0;
        if (v === 0 && secondary && secondary !== col) {
            v = sortValue(a, secondary) < sortValue(b, secondary) ? -1
              : sortValue(a, secondary) > sortValue(b, secondary) ?  1 : 0;
        }
        return dir === "asc" ? v : -v;
    });

    state.sortedRows = filtered;
};

// ── Cell renderers ────────────────────────────────────────────────────────────
const renderCell = (col, group, isAlt=false, altMember=null) => {
    const m = isAlt ? altMember : group.main;
    switch(col) {
        case "chevron":
            if (isAlt) return `<span style="color:#4b5563;font-size:1rem;">&#x21B3;</span>`;
            return group.alts.length
                ? `<span class="r-chevron${state.expandedKey===group.key?" open":""}" data-key="${esc(group.key)}">›</span>`
                : "";
        case "class":
            return classImg(m.classId);
        case "role1":
            return roleImg(m.spec1);
        case "role2":
            return roleImg(m.spec2);
        case "name":
            return `<span class="r-name class-${m.classId}" data-name="${esc(m.name)}">${esc(m.name)}</span>`;
        case "level":
            return `<span style="color:#9ca3af;">${m.level}</span>`;
        case "rank":
            return esc(m.rankName);
        case "status":
            return isAlt
                ? `<span class="${m.isOnline?"r-online":""}">${esc(m.statusText)}</span>`
                : `<span class="${group.clusterOnline?"r-online":""}">${esc(isAlt?m.statusText:group.clusterStatus)}</span>`;
        default:
            return "";
    }
};

// ── Table renderer ────────────────────────────────────────────────────────────
const visibleCols = () => COLUMN_DEFS.filter(c => state.cols[c.key] !== false);

const isFilterActive = (key) => {
    if (key === 'class')  return state.filters.classIds.size > 0;
    if (key === 'rank')   return state.filters.rankIds.size  > 0;
    if (key === 'status') return state.filters.onlineOnly !== null;
    if (key === 'role1' || key === 'role2') return state.filters.roles.size > 0;
    return false;
};

const FILTERABLE_ICON = `<span class="r-filter-icon" title="${esc(TEXT.filterTitle)}">⊟</span>`;

const renderHeader = () => {
    const { col:sc, dir:sd } = state.sort;
    return visibleCols().map(c => {
        const isSort   = c.sortable && c.key === sc;
        const arrow    = isSort ? (sd === "asc" ? "↑" : "↓") : (c.sortable ? "↕" : "");
        const arrowCls = isSort ? "r-sort-arrow active" : "r-sort-arrow";
        const isIconOnly = c.key === "chevron" || c.key === "class" || c.key === "role1" || c.key === "role2";
        const label = isIconOnly ? "" : esc(c.label);
        const sortAttr = c.sortable ? ` data-sort="${c.key}"` : "";
        const filterIndicator = isFilterActive(c.key)
            ? `<span class="r-filter-dot"></span>`
            : c.filterable ? FILTERABLE_ICON : '';
        return `<th class="r-th r-th-${c.key}"${sortAttr} style="text-align:${c.align};width:${c.width};${c.sortable?"cursor:pointer;":""}">` +
            `${label}${arrow ? `<span class="${arrowCls}">${arrow}</span>` : ""}${filterIndicator}` +
            `</th>`;
    }).join("");
};

const renderRow = (group) => {
    const isExpanded = state.expandedKey === group.key;
    const isSelected = state.selectedName === group.main.name;
    const rowCls = ["r-row r-main-row",
        isSelected ? "r-selected" : "",
        isExpanded ? "r-expanded" : "",
    ].filter(Boolean).join(" ");

    const cells = visibleCols().map(c =>
        `<td class="r-td r-td-${c.key}" style="text-align:${c.align};">${renderCell(c.key, group)}</td>`
    ).join("");

    let html = `<tr class="${rowCls}" data-key="${esc(group.key)}">${cells}</tr>`;

    if (isExpanded) {
        group.alts.forEach(alt => {
            const altSelected = state.selectedName === alt.name;
            const altCls = ["r-row r-alt-row", altSelected ? "r-selected" : ""].filter(Boolean).join(" ");
            const altCells = visibleCols().map(c =>
                `<td class="r-td r-td-${c.key}" style="text-align:${c.align};">${renderCell(c.key, group, true, alt)}</td>`
            ).join("");
            html += `<tr class="${altCls}" data-name="${esc(alt.name)}">${altCells}</tr>`;
        });
    }

    return html;
};

const renderTable = () => {
    const thead = document.getElementById("r-thead");
    const tbody = document.getElementById("r-tbody");
    if (!thead || !tbody) return;
    thead.innerHTML = `<tr>${renderHeader()}</tr>`;
    tbody.innerHTML = state.sortedRows.map(renderRow).join("");
};

// ── Detail panel ──────────────────────────────────────────────────────────────
const buildDetailHTML = (member, showClose = false) => {
    const ce = state.characters[member.name] || null;

    const specs = [member.spec1, member.spec2]
        .filter(s => s && s !== "EMPTY")
        .map(s => {
            const role = normalizeRole(s);
            const ri = role ? `<img src="${ROLE_SRC[role]}" style="width:1.1em;height:1.1em;object-fit:contain;vertical-align:middle;opacity:.75;" alt="${esc(role)}">` : "";
            const si = specImg(s, "1.1em");
            const lb = SPECS[s]?.label || s;
            return `<span class="dp-spec">${ri}${si} ${esc(lb)}</span>`;
        }).join("");

    const profs = Object.values(ce?.professions || {})
        .map(parseProfession).filter(Boolean);

    const profHtml = profs.map(p => {
        const pct = p.max > 0 ? Math.round((p.current/p.max)*100) : 0;
        return `<div class="dp-prof">
            <div class="dp-prof-label">${esc(p.name)}</div>
            <div class="dp-bar-track"><div class="dp-bar-fill" style="width:${pct}%"></div>
            <span class="dp-bar-text">${p.current} / ${p.max}</span></div>
        </div>`;
    }).join("");

    const officerNoteHtml = member.officerNote
        ? `<div class="dp-section-title">${TEXT.officerNote}</div><div class="dp-text">${esc(member.officerNote)}</div>`
        : "";

    const closeBtn = showClose
        ? `<button class="dp-close-btn" data-action="close-detail" aria-label="Stäng">✕</button>`
        : "";

    return `
        <div class="dp-header">
            <div>${classImg(member.classId, "2.8em")}</div>
            <div class="dp-header-text" style="flex:1;min-width:0;">
                <a href="${armoryUrl(member.name)}" target="_blank" rel="noopener noreferrer"
                   class="dp-name class-${member.classId}">${esc(member.name)}</a>
                <div class="dp-rank">${esc(member.rankName)} &middot; ${TEXT.colLevel} ${member.level}</div>
                <div class="dp-status${member.isOnline?" online":""}">${esc(member.statusText)}</div>
            </div>
            ${closeBtn}
        </div>
        ${specs ? `<div class="dp-specs">${specs}</div>` : ""}
        <div class="dp-body">
            ${member.zoneName    ? `<div class="dp-section-title">${TEXT.position}</div><div class="dp-text">${esc(member.zoneName)}</div>` : ""}
            ${member.publicNote  ? `<div class="dp-section-title">${TEXT.note}</div><div class="dp-text">${esc(member.publicNote)}</div>` : ""}
            ${officerNoteHtml}
            ${profs.length       ? `<div class="dp-section-title">${TEXT.professions}</div>${profHtml}` : ""}
        </div>
        <div class="dp-armory"><a href="${armoryUrl(member.name)}" target="_blank" rel="noopener noreferrer">${TEXT.viewArmory}</a></div>`;
};

const renderDetail = (member) => {
    const panel = document.getElementById("roster-detail");
    if (!panel) return;
    panel.innerHTML = buildDetailHTML(member, true);
};

// ── Drawer helpers ────────────────────────────────────────────────────────────
const openDetailDrawer = () => {
    document.querySelector(".roster-right")?.classList.add("dp-open");
    document.getElementById("roster-detail-backdrop")?.classList.add("dp-open");
};
const closeDetailDrawer = () => {
    document.querySelector(".roster-right")?.classList.remove("dp-open");
    document.getElementById("roster-detail-backdrop")?.classList.remove("dp-open");
    state.selectedName = null;
    applyFilterAndSort();
    renderTable();
};

// ── Column picker ─────────────────────────────────────────────────────────────
const renderColPicker = () => {
    const picker = document.getElementById("r-col-picker");
    if (!picker) return;
    picker.innerHTML = COLUMN_DEFS.filter(c => c.toggleable).map(c =>
        `<label class="r-col-option">
            <input type="checkbox" data-col="${c.key}" ${state.cols[c.key]!==false?"checked":""}>
            ${esc(c.label)}
        </label>`
    ).join("");
};

// ── Column filter context menu ────────────────────────────────────────────────
let _ctxMenu = null;
let _longPressTimer = null;

const closeCtxMenu = () => { _ctxMenu?.remove(); _ctxMenu = null; };

const buildMenuItems = (colKey) => {
    const { classIds, rankIds, onlineOnly, roles } = state.filters;
    const items = [];

    if (colKey === 'class') {
        const classes = [...new Set(state.groups.map(g => g.main.classId))].sort((a,b)=>a-b);
        classes.forEach(cid => items.push({
            html: `${classImg(cid,'1.1em')} <span class="class-${cid}">${esc(CLASS_NAMES[cid]||String(cid))}</span>`,
            active: classIds.has(cid),
            action: () => { classIds.has(cid) ? classIds.delete(cid) : classIds.add(cid); },
        }));
        if (classIds.size) {
            items.push({ sep: true });
            items.push({ html: TEXT.clearFilter, active: false, action: () => classIds.clear() });
        }
    } else if (colKey === 'rank') {
        const ranks = [...new Map(state.groups.map(g => [g.main.rankId, g.main.rankName])).entries()]
            .sort((a,b)=>a[0]-b[0]);
        ranks.forEach(([rid, rname]) => items.push({
            html: esc(rname),
            active: rankIds.has(rid),
            action: () => { rankIds.has(rid) ? rankIds.delete(rid) : rankIds.add(rid); },
        }));
        if (rankIds.size) {
            items.push({ sep: true });
            items.push({ html: TEXT.clearFilter, active: false, action: () => rankIds.clear() });
        }
    } else if (colKey === 'status') {
        [{ label: TEXT.statusOnline, val:true }, { label: TEXT.statusOffline, val:false }, { label: TEXT.statusAll, val:null }]
            .forEach(o => items.push({
                html: o.label,
                active: onlineOnly === o.val,
                action: () => { state.filters.onlineOnly = o.val; },
            }));
    } else if (colKey === 'role1' || colKey === 'role2') {
        [['tank','Tank'], ['heal','Heal'], ['dps','DPS']].forEach(([role, label]) => items.push({
            html: `${roleImg(role + ':x', '1.1em')} ${label}`,
            active: roles.has(role),
            action: () => { roles.has(role) ? roles.delete(role) : roles.add(role); },
        }));
        if (roles.size) {
            items.push({ sep: true });
            items.push({ html: TEXT.clearFilter, active: false, action: () => roles.clear() });
        }
    }
    return items;
};

const openCtxMenu = (colKey, x, y) => {
    closeCtxMenu();
    const initialItems = buildMenuItems(colKey);
    if (!initialItems.length) return;

    const menu = document.createElement('div');
    menu.className = 'r-ctx-menu';
    document.body.appendChild(menu);
    _ctxMenu = menu;

    const refresh = () => {
        const items = buildMenuItems(colKey);
        menu.innerHTML = items.map((it, i) =>
            it.sep
                ? `<div class="r-ctx-sep"></div>`
                : `<div class="r-ctx-item" data-idx="${i}">` +
                  `<span class="r-ctx-check">${it.active ? '✓' : ''}</span>${it.html}</div>`
        ).join('');
        menu.onclick = e => {
            const el = e.target.closest('[data-idx]');
            if (!el) return;
            items[+el.dataset.idx].action?.();
            applyFilterAndSort();
            renderTable();
            refresh();
        };
    };
    refresh();

    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    requestAnimationFrame(() => {
        const r = menu.getBoundingClientRect();
        if (r.right  > window.innerWidth)  menu.style.left = Math.max(0, x - r.width)  + 'px';
        if (r.bottom > window.innerHeight) menu.style.top  = Math.max(0, y - r.height) + 'px';
    });
};

// ── Event handling ────────────────────────────────────────────────────────────
const findMemberByName = (name) => {
    for (const g of state.groups) {
        if (g.main.name === name) return g.main;
        const a = g.alts.find(x => x.name === name);
        if (a) return a;
    }
    return null;
};

const findGroupByKey = (key) => state.groups.find(g => g.key === key) || null;

const bindEvents = () => {
    const tbody = document.getElementById("r-tbody");
    const thead = document.getElementById("r-thead");
    const searchEl = document.getElementById("r-search");
    const colToggleBtn = document.getElementById("r-col-toggle");
    const colPickerEl  = document.getElementById("r-col-picker");
    const pickerWrap   = document.getElementById("r-col-picker-wrap");

    thead.addEventListener("click", e => {
        const th = e.target.closest("[data-sort]");
        if (!th) return;
        const col = th.dataset.sort;
        if (state.sort.col === col) {
            state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
        } else {
            state.sort.secondary = state.sort.col;
            state.sort.col = col;
            state.sort.dir = "asc";
        }
        saveSortPrefs();
        applyFilterAndSort();
        renderTable();
    });

    tbody.addEventListener("click", e => {
        if (e.target.closest("#r-col-picker-wrap")) return;

        const mainRow = e.target.closest("tr.r-main-row");
        const altRow  = e.target.closest("tr.r-alt-row");

        if (mainRow) {
            const key   = mainRow.dataset.key;
            const group = findGroupByKey(key);
            if (!group) return;

            if (e.target.closest(".r-td-chevron")) {
                if (group.alts.length) {
                    state.expandedKey = state.expandedKey === key ? null : key;
                    applyFilterAndSort();
                    renderTable();
                }
                return;
            }

            state.selectedName = group.main.name;
            renderDetail(group.main);
            openDetailDrawer();
            applyFilterAndSort();
            renderTable();
        } else if (altRow) {
            const name   = altRow.dataset.name;
            const member = findMemberByName(name);
            if (!member) return;
            state.selectedName = name;
            renderDetail(member);
            openDetailDrawer();
            applyFilterAndSort();
            renderTable();
        }
    });

    searchEl?.addEventListener("input", e => {
        state.search = e.target.value;
        if (state.search.trim()) {
            const q = state.search.toLowerCase().trim();
            const hit = state.groups.find(g => g.alts.some(a => a.name.toLowerCase().includes(q)));
            if (hit) state.expandedKey = hit.key;
        }
        applyFilterAndSort();
        renderTable();
    });

    colToggleBtn?.addEventListener("click", e => {
        e.stopPropagation();
        pickerWrap?.classList.toggle("open");
        renderColPicker();
    });

    colPickerEl?.addEventListener("change", e => {
        const cb = e.target.closest("input[data-col]");
        if (!cb) return;
        state.cols[cb.dataset.col] = cb.checked;
        saveColPrefs();
        applyFilterAndSort();
        renderTable();
    });

    thead.addEventListener('contextmenu', e => {
        e.preventDefault();
        const th = e.target.closest('th.r-th');
        if (!th) return;
        const m = th.className.match(/\br-th-(\w+)\b/);
        if (m) openCtxMenu(m[1], e.clientX, e.clientY);
    });

    thead.addEventListener('touchstart', e => {
        const th = e.target.closest('th.r-th');
        if (!th) return;
        const touch = e.touches[0];
        _longPressTimer = setTimeout(() => {
            const m = th.className.match(/\br-th-(\w+)\b/);
            if (m) openCtxMenu(m[1], touch.clientX, touch.clientY);
        }, 500);
    }, { passive: true });
    thead.addEventListener('touchend',  () => clearTimeout(_longPressTimer));
    thead.addEventListener('touchmove', () => clearTimeout(_longPressTimer));

    document.addEventListener('click', e => {
        if (_ctxMenu && !_ctxMenu.contains(e.target)) closeCtxMenu();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeCtxMenu();
    });

    document.addEventListener("click", e => {
        if (e.target.closest("[data-action='close-detail']") ||
            e.target.id === "roster-detail-backdrop") {
            closeDetailDrawer();
        }
    });

    document.addEventListener("click", e => {
        if (!e.target.closest("#r-col-picker-wrap") && !e.target.closest("#r-col-toggle")) {
            pickerWrap?.classList.remove("open");
        }
    });
};

// ── Toolbar ───────────────────────────────────────────────────────────────────
const buildToolbar = () => {
    const bar = document.getElementById("r-toolbar");
    if (!bar) return;
    bar.innerHTML = `
        <div class="r-toolbar-left">
            <label class="r-search-wrap">
                <span class="r-search-icon">⌕</span>
                <input id="r-search" type="text" placeholder="${TEXT.searchPlaceholder}" autocomplete="off">
            </label>
        </div>
        <div class="r-toolbar-right">
            <div style="position:relative;">
                <button id="r-col-toggle" class="r-btn" title="${TEXT.columnsTitle}">${TEXT.columnsBtn}</button>
                <div id="r-col-picker-wrap" class="r-col-picker-wrap">
                    <div id="r-col-picker"></div>
                </div>
            </div>
        </div>`;
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    loadPrefs();
    buildToolbar();

    Promise.all([
        fetch(TRANSLATIONS_URL, {cache:"no-cache"}).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(CHARACTERS_URL,   {cache:"no-cache"}).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(ROSTER_URL,       {cache:"no-cache"}).then(r => {
            if (!r.ok) throw new Error(`roster.json: ${r.status}`);
            const lm = r.headers.get("Last-Modified");
            if (lm && Date.now() - new Date(lm) > 86400000) {
                const el = document.getElementById("roster-staleness-warning");
                if (el) { el.textContent = TEXT.stalenessWarning(lm); el.style.display = "block"; }
            }
            return r.json().then(data => ({ data, lm }));
        }),
    ])
    .then(([tr, chars, { data, lm }]) => {
        state.characters = chars;
        const fileAge = lm ? (Date.now() - new Date(lm)) / 86400000 : 0;
        state.groups = processData(data.members || [], chars, tr.ranks || {}, tr.zones || {}, fileAge);
        applyFilterAndSort();
        renderTable();
        bindEvents();
    })
    .catch(err => {
        console.error("Kunde inte ladda guildlistan:", err);
        const tbody = document.getElementById("r-tbody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#f87171;">${TEXT.errorLoad}</td></tr>`;
    });
});