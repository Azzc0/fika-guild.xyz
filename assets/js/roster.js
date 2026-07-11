"use strict";

// ── Endpoints ─────────────────────────────────────────────────────────────────
const ROSTER_URL       = "https://www.azzco.xyz/data/roster.json";
const CHARACTERS_URL   = "https://www.azzco.xyz/data/characters.json";
const TRANSLATIONS_URL = "/utils/guild-translations.json";

// ── Config ────────────────────────────────────────────────────────────────────
const SHOW_OFFICER_NOTE = false; // toggle to surface officer note in detail panel

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
const ROLE_SRC = { tank:"/img/tank.png", heal:"/img/heal.png", dps:"/img/dps.png" };

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
// order here = default display order
const COLUMN_DEFS = [
    { key:"chevron",  label:"",       sortable:false, toggleable:false, width:"28px",  align:"center" },
    { key:"class",    label:"Klass",  sortable:true,  toggleable:false, width:"36px",  align:"center" },
    { key:"role1",    label:"Roll 1", sortable:false, toggleable:true,  width:"36px",  align:"center" },
    { key:"role2",    label:"Roll 2", sortable:false, toggleable:true,  width:"36px",  align:"center" },
    { key:"name",     label:"Namn",   sortable:true,  toggleable:false, width:"130px", align:"left"   },
    { key:"level",    label:"Nivå",   sortable:true,  toggleable:true,  width:"44px",  align:"right"  },
    { key:"rank",     label:"Grad",   sortable:true,  toggleable:false, width:"120px", align:"left"   },
    { key:"status",   label:"Status", sortable:true,  toggleable:true,  width:"100px", align:"left"   },
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    groups:       [],   // processed + grouped members
    characters:   {},   // raw characters.json
    filteredRows: [],   // after search filter, before sort
    sortedRows:   [],   // final render order (main groups only)
    sort:         { col:"rank", dir:"asc", secondary:"name" },
    search:       "",
    expandedKey:  null, // mainKey of expanded group
    selectedName: null, // name of character in detail panel
    cols:         {},   // { key: visible bool }
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
    if (d >= 1) return `${d} dag${d===1?"":"ar"} sedan`;
    if (h >= 1) return `${h} tim${h===1?"me":"mar"} sedan`;
    if (m >= 1) return `${m} minut${m===1?"":"er"} sedan`;
    return "Nyligen";
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

    // Identify main and alts in each group
    const groups = [];
    groupMap.forEach((g, key) => {
        const main = g.members.find(m => normalizeKey(m.name) === key) || g.members[0];
        const alts = g.members.filter(m => m !== main)
            .sort((a,b) => {
                if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                return a.lastLogoff - b.lastLogoff;
            });
        // Cluster-wide status
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
        case "level":  return -m.level; // desc by default feels better for level
        case "rank":   return m.rankId;
        case "status": return group.clusterOnline ? -1 : m.lastLogoff;
        case "class":  return m.classId;
        default:       return 0;
    }
};

const applyFilterAndSort = () => {
    const q = state.search.toLowerCase().trim();
    const filtered = q
        ? state.groups.filter(g => g.allNames.includes(q) || g.main.rankName.toLowerCase().includes(q))
        : [...state.groups];

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

const renderHeader = () => {
    const { col:sc, dir:sd } = state.sort;
    return visibleCols().map(c => {
        const isSort   = c.sortable && c.key === sc;
        const arrow    = isSort ? (sd === "asc" ? "↑" : "↓") : (c.sortable ? "↕" : "");
        const arrowCls = isSort ? "r-sort-arrow active" : "r-sort-arrow";
        const isIconCol = c.key === "chevron" || c.key === "class" || c.key === "role1" || c.key === "role2";
        const label = isIconCol ? "" : esc(c.label);
        const sortAttr = c.sortable ? ` data-sort="${c.key}"` : "";
        return `<th class="r-th r-th-${c.key}"${sortAttr} style="text-align:${c.align};width:${c.width};${c.sortable?"cursor:pointer;":""}">` +
            `${label}${arrow ? `<span class="${arrowCls}">${arrow}</span>` : ""}` +
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

    // Inline alt rows
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
const renderDetail = (member) => {
    const panel = document.getElementById("roster-detail");
    if (!panel) return;
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

    const officerNoteHtml = SHOW_OFFICER_NOTE && member.officerNote
        ? `<div class="dp-section-title">Officersanteckning</div><div class="dp-text">${esc(member.officerNote)}</div>`
        : "";

    panel.innerHTML = `
        <div class="dp-header">
            <div>${classImg(member.classId, "2.8em")}</div>
            <div class="dp-header-text">
                <a href="${armoryUrl(member.name)}" target="_blank" rel="noopener noreferrer"
                   class="dp-name class-${member.classId}">${esc(member.name)}</a>
                <div class="dp-rank">${esc(member.rankName)}</div>
                <div class="dp-status${member.isOnline?" online":""}">${esc(member.statusText)}</div>
            </div>
        </div>
        ${specs ? `<div class="dp-specs">${specs}</div>` : ""}
        <div class="dp-body">
            ${member.zoneName    ? `<div class="dp-section-title">Position</div><div class="dp-text">${esc(member.zoneName)}</div>` : ""}
            ${member.publicNote  ? `<div class="dp-section-title">Anteckning</div><div class="dp-text">${esc(member.publicNote)}</div>` : ""}
            ${officerNoteHtml}
            ${profs.length       ? `<div class="dp-section-title">Yrken</div>${profHtml}` : ""}
        </div>
        <div class="dp-armory"><a href="${armoryUrl(member.name)}" target="_blank" rel="noopener noreferrer">Visa på Armory ↗</a></div>`;
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

    // Sort
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

    // Row click — main rows
    tbody.addEventListener("click", e => {
        // Column picker clicks should not bubble here
        if (e.target.closest("#r-col-picker-wrap")) return;

        const mainRow = e.target.closest("tr.r-main-row");
        const altRow  = e.target.closest("tr.r-alt-row");

        if (mainRow) {
            const key   = mainRow.dataset.key;
            const group = findGroupByKey(key);
            if (!group) return;

            // Toggle expansion
            if (group.alts.length) {
                state.expandedKey = state.expandedKey === key ? null : key;
            }
            // Select main for detail
            state.selectedName = group.main.name;
            renderDetail(group.main);
            applyFilterAndSort();
            renderTable();
        } else if (altRow) {
            const name   = altRow.dataset.name;
            const member = findMemberByName(name);
            if (!member) return;
            state.selectedName = name;
            renderDetail(member);
            // Re-render just to update selected highlight
            applyFilterAndSort();
            renderTable();
        }
    });

    // Search
    searchEl?.addEventListener("input", e => {
        state.search = e.target.value;
        // Auto-expand if search matches an alt name
        if (state.search.trim()) {
            const q = state.search.toLowerCase().trim();
            const hit = state.groups.find(g => g.alts.some(a => a.name.toLowerCase().includes(q)));
            if (hit) state.expandedKey = hit.key;
        }
        applyFilterAndSort();
        renderTable();
    });

    // Column picker toggle
    colToggleBtn?.addEventListener("click", e => {
        e.stopPropagation();
        pickerWrap?.classList.toggle("open");
        renderColPicker();
    });

    // Column picker change
    colPickerEl?.addEventListener("change", e => {
        const cb = e.target.closest("input[data-col]");
        if (!cb) return;
        state.cols[cb.dataset.col] = cb.checked;
        saveColPrefs();
        applyFilterAndSort();
        renderTable();
    });

    // Close picker on outside click
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
                <input id="r-search" type="text" placeholder="Sök spelare eller alter…" autocomplete="off">
            </label>
        </div>
        <div class="r-toolbar-right">
            <div style="position:relative;">
                <button id="r-col-toggle" class="r-btn" title="Visa/dölj kolumner">⊞ Kolumner</button>
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
        fetch(TRANSLATIONS_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(CHARACTERS_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(ROSTER_URL).then(r => {
            if (!r.ok) throw new Error(`roster.json: ${r.status}`);
            const lm = r.headers.get("Last-Modified");
            if (lm && Date.now() - new Date(lm) > 86400000) {
                const el = document.getElementById("roster-staleness-warning");
                if (el) { el.textContent = `Data uppdaterades senast ${lm} och kan vara inaktuell.`; el.style.display = "block"; }
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
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#f87171;">Kunde inte ladda guildlistan. Försök igen senare.</td></tr>`;
    });
});