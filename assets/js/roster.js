"use strict";

// ── Endpoints ────────────────────────────────────────────────────────────────
const ROSTER_URL       = "https://www.azzco.xyz/data/roster.json";
const CHARACTERS_URL   = "https://www.azzco.xyz/data/characters.json";
const TRANSLATIONS_URL = "/utils/guild-translations.json";

// ── Static mappings ──────────────────────────────────────────────────────────
const CLASS_NAMES = {
    1: "Warrior", 2: "Paladin", 3: "Hunter",  4: "Rogue",
    5: "Priest",  6: "Death Knight", 7: "Shaman", 8: "Mage",
    9: "Warlock", 11: "Druid"
};

const CLASS_EMOJI_IDS = {
    1:  "579532030153588739",
    2:  "579532029906124840",
    3:  "579532029880827924",
    4:  "579532030086217748",
    5:  "579532029901799437",
    6:  "599012538935410701",
    7:  "579532030056857600",
    8:  "579532030161977355",
    9:  "579532029851336716",
    11: "579532029675438081"
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const escapeHtml = (v) => String(v)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");

const normalizeKey = (v) => String(v || "").trim().toLowerCase();

/**
 * Convert a fractional-days offline value into a human-readable Swedish string.
 */
const formatLastSeen = (daysSinceLogout) => {
    const totalSeconds = Math.max(0, Math.floor(daysSinceLogout * 86400));
    const mins  = Math.floor(totalSeconds / 60);
    const hours = Math.floor(mins  / 60);
    const days  = Math.floor(hours / 24);
    if (days  >= 1) return `${days} dag${days  === 1 ? ""  : "ar"}`;
    if (hours >= 1) return `${hours} tim${hours === 1 ? "me" : "mar"}`;
    if (mins  >= 1) return `${mins} minut${mins === 1 ? ""  : "er"}`;
    return "Mindre än en minut";
};

const armoryUrl = (name) =>
    `https://chromiecraft.com/en/armory/?character/ChromieCraft/${encodeURIComponent(name)}`;

const classIcon = (classId) => {
    const eid = CLASS_EMOJI_IDS[classId];
    if (!eid) return CLASS_NAMES[classId] || String(classId);
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:100%;">` +
           `<img src="https://cdn.discordapp.com/emojis/${eid}.png" ` +
           `style="width:1.55em;height:1.55em;object-fit:contain;vertical-align:middle;border-radius:3px;">` +
           `</span>`;
};

// ── Alt child panel ──────────────────────────────────────────────────────────
/**
 * Render the expanded alt panel for a main row.
 * @param {object} mainMember  - The roster member object for the main.
 * @param {object[]} altMembers - Roster member objects for each alt.
 */
const renderAltPanel = (mainMember, altMembers) => {
    // Sort: online first, then by recency (lowest lastLogoff = most recent)
    const sorted = [...altMembers].sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return (a.lastLogoff || 0) - (b.lastLogoff || 0);
    });

    // Prepend the main itself so the panel shows the full account picture
    const rows = [{ ...mainMember, isMainRow: true }, ...sorted].map(m => {
        const safeName = escapeHtml(m.name);
        const mainBadge = m.isMainRow
            ? `<span style="font-size:0.75rem;color:#10b981;font-weight:bold;margin-left:0.5rem;text-transform:uppercase;">(Main)</span>`
            : "";
        return `<tr>
            <td><a href="${armoryUrl(m.name)}" target="_blank" rel="noopener noreferrer"
                   class="armory-link class-${m.classId}">${safeName}</a>${mainBadge}</td>
            <td>${m.level}</td>
            <td>${escapeHtml(m.note || "")}</td>
            <td>${escapeHtml(m.zoneName || "")}</td>
            <td>${escapeHtml(m.statusText || "")}</td>
        </tr>`;
    }).join("");

    return `<div class="alt-child-wrap">
        <table class="alt-child-table">
            <thead>
                <tr>
                    <th>Karaktär</th><th>Nivå</th>
                    <th>Anteckning</th><th>Zon</th><th>Status</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
};

// ── Grouping ─────────────────────────────────────────────────────────────────
/**
 * Determine which characters.json name is the canonical main for a given
 * roster member name, using the characters map.
 *
 * Resolution order:
 *  1. characters[name].main == name            → confirmed main of own group
 *  2. characters[name].main == valid other name → alt, group under that name
 *  3. characters[name].main == "EMPTY" / absent → treat as own main (inferred)
 *  4. name not in characters at all            → treat as own main (unknown)
 */
const resolveMainKey = (name, characters) => {
    const entry = characters[name];
    if (!entry) return name; // not in characters.json → own group

    const m = (entry.main || "").trim();
    if (!m || m === "EMPTY") return name; // inferred main
    return m; // confirmed main or alt pointing elsewhere
};

/**
 * Build member groups from a flat roster array and the characters map.
 * Returns Map<normalizedMainName, { mainName: string, members: object[] }>
 */
const groupMembers = (rosterMembers, characters, rankMapping, zoneMapping, fileAgeInDays) => {
    const groups = new Map();

    rosterMembers.forEach(m => {
        const className  = CLASS_NAMES[m.classId] || `Class ${m.classId}`;
        const rankName   = rankMapping[m.rank]    || `Rank ${m.rank}`;
        const zoneName   = zoneMapping[m.zoneId]  || `Zone ${m.zoneId}`;

        const historicalOfflineDays = Number(m.lastLogoff) || 0;
        const trueOfflineDays = historicalOfflineDays + fileAgeInDays;
        const statusText = m.isOnline ? "Online" : formatLastSeen(trueOfflineDays);

        const member = {
            name:      m.name,
            classId:   m.classId,
            className,
            level:     m.level,
            rankId:    Number(m.rank),
            rankName,
            note:      (m.publicNote || "").trim(),
            zoneName,
            statusText,
            isOnline:  !!m.isOnline,
            lastLogoff: historicalOfflineDays,
        };

        const mainName    = resolveMainKey(m.name, characters);
        const groupKey    = normalizeKey(mainName);

        if (!groups.has(groupKey)) {
            groups.set(groupKey, { mainName, members: [] });
        }
        groups.get(groupKey).members.push(member);
    });

    return groups;
};

// ── DataTable row assembly ───────────────────────────────────────────────────
/**
 * Given a member group, pick the main member and build a DataTables row array.
 *
 * Column layout (indices used in columnDefs):
 *   0  responsive control (empty)
 *   1  class name (rendered as icon)
 *   2  name (rendered as armory link + alt toggle)
 *   3  level
 *   4  rank name (sort by rankId via columnDef)
 *   5  public note
 *   6  zone
 *   7  status (online/last seen)
 *   --- hidden data below ---
 *   8  classId          (for icon rendering and CSS class)
 *   9  alts array       (for alt panel rendering)
 *   10 rankId           (for numeric sort of rank column)
 *   11 mainMember obj   (passed into alt panel renderer)
 */
const buildRow = (group) => {
    const { mainName, members } = group;
    const normalizedMain = normalizeKey(mainName);

    // Pick the main: prefer confirmed match by name, fall back to first member
    const main =
        members.find(x => normalizeKey(x.name) === normalizedMain) ||
        members[0];

    const alts = members.filter(x => x !== main);

    // Cluster-wide status: online beats everything; otherwise use most-recent member
    let globalStatus = main.statusText;
    if (members.some(x => x.isOnline)) {
        globalStatus = "Online";
    } else if (members.length > 1) {
        const mostRecent = [...members].sort((a, b) => a.lastLogoff - b.lastLogoff)[0];
        globalStatus = mostRecent.statusText;
    }

    return [
        "",             // 0  responsive control
        main.className, // 1  class (icon render)
        main.name,      // 2  name (link + toggle render)
        main.level,     // 3  level
        main.rankName,  // 4  rank (numeric sort via col 10)
        main.note,      // 5  note
        main.zoneName,  // 6  zone
        globalStatus,   // 7  status
        main.classId,   // 8  hidden: classId
        alts,           // 9  hidden: alts array
        main.rankId,    // 10 hidden: rankId for sort
        main,           // 11 hidden: main member object
    ];
};

// ── DataTable init ───────────────────────────────────────────────────────────
const initTable = (dataSet) => {
    const table = $("#roster-table").DataTable({
        data: dataSet,
        language: {
            sEmptyTable:    "Inga data tillgängliga i tabellen",
            sInfo:          "Visar _START_ till _END_ av _TOTAL_ poster",
            sInfoEmpty:     "Visar 0 till 0 av 0 poster",
            sInfoFiltered:  "(filtrerat från _MAX_ totala poster)",
            sLengthMenu:    "Visa _MENU_ poster",
            sLoadingRecords:"Laddar...",
            sProcessing:    "Bearbetar...",
            sSearch:        "Sök:",
            sZeroRecords:   "Inga matchande poster hittades",
            oPaginate: {
                sFirst:    "Första",
                sLast:     "Sista",
                sNext:     "Nästa",
                sPrevious: "Föregående",
            },
        },
        pageLength: 25,
        order: [[4, "asc"], [2, "asc"]],
        responsive: {
            details: { type: "column", target: 0 }
        },
        columnDefs: [
            // 0 — responsive control
            {
                targets: 0,
                className: "dtr-control responsive-cell",
                orderable: false,
                searchable: false,
                defaultContent: "",
            },
            // 1 — class icon
            {
                targets: 1,
                className: "class-cell",
                render: (d, t, r) => t === "display" ? classIcon(r[8]) : d,
            },
            // 2 — name: armory link only (row click handles alt expansion)
            {
                targets: 2,
                render: (d, t, r) => {
                    if (t !== "display") return d;
                    return `<span class="name-cell">` +
                           `<a href="${armoryUrl(d)}" target="_blank" rel="noopener noreferrer" ` +
                           `class="armory-link class-${r[8]}">${escapeHtml(d)}</a>` +
                           `</span>`;
                },
            },
            // 4 — rank: display is rankName, sort is rankId (col 10)
            {
                targets: 4,
                type: "num",
                render: (d, t, r) => (t === "display" || t === "filter") ? d : r[10],
            },
            // 8–11 — hidden data columns
            { targets: [8, 9, 10, 11], visible: false, searchable: false },
        ],
        initComplete: function () {
            this.api().columns().every(function () {
                const column = this;
                const header = $(column.header());
                if (header.data("filterable") !== true) return;

                const menuBtn  = $('<button class="custom-header-menu-btn">☰</button>');
                const dropdown = $('<div class="custom-filter-dropdown"></div>');

                // Sort actions
                $('<div class="custom-dropdown-action-item">↑ Sortera stigande</div>')
                    .on("click", (e) => { e.stopPropagation(); column.order("asc").draw(); dropdown.hide(); })
                    .appendTo(dropdown);
                $('<div class="custom-dropdown-action-item">↓ Sortera fallande</div>')
                    .on("click", (e) => { e.stopPropagation(); column.order("desc").draw(); dropdown.hide(); })
                    .appendTo(dropdown);

                $('<div class="custom-dropdown-divider"></div>').appendTo(dropdown);

                // Select-all / none controls
                const controls  = $('<div style="display:flex;gap:5px;margin-bottom:5px;padding:0 5px;"></div>');
                const container = $('<div class="custom-checkbox-filter-container"></div>');

                $('<button style="font-size:10px;cursor:pointer;">Alla</button>')
                    .on("click", (e) => { e.stopPropagation(); container.find("input").prop("checked", true).trigger("change"); })
                    .appendTo(controls);
                $('<button style="font-size:10px;cursor:pointer;">Inga</button>')
                    .on("click", (e) => { e.stopPropagation(); container.find("input").prop("checked", false).trigger("change"); })
                    .appendTo(controls);

                dropdown.append(controls);

                column.data().unique().sort().each(function (d) {
                    const val = typeof d === "string" ? d.replace(/<[^>]*>/g, "").trim() : d;
                    $(`<label class="custom-checkbox-option"><input type="checkbox" value="${val}"> ${val}</label>`)
                        .appendTo(container);
                });
                dropdown.append(container);

                dropdown.on("click", (e) => e.stopPropagation());
                container.on("change", "input", function () {
                    const vals = container.find("input:checked")
                        .map(function () { return $.fn.dataTable.util.escapeRegex(this.value); })
                        .get().join("|");
                    column.search(vals ? `^(${vals})$` : "", true, false).draw();
                });

                header.append(menuBtn).append(dropdown);
                menuBtn.on("click", (e) => {
                    e.stopPropagation();
                    $(".custom-filter-dropdown").not(dropdown).hide();
                    dropdown.toggle();
                });
            });

            $(document).on("click", () => $(".custom-filter-dropdown").hide());
        },
    });

    return table;
};

// ── Alt row open/close helpers ───────────────────────────────────────────────
const resetResponsiveState = (tr) => {
    tr.removeClass("parent dtr-expanded");
    tr.find("td.dtr-control, th.dtr-control").removeClass("parent dtr-expanded");
};

const closeAltRows = (table) => {
    $("#roster-table tbody tr.alt-open").each(function () {
        const tr  = $(this);
        const row = table.row(tr);
        if (row.child.isShown()) row.child.hide();
        row.child.remove();
        tr.removeClass("alt-open");
        resetResponsiveState(tr);
    });
};

const closeResponsiveRows = (table) => {
    table.rows().every(function () {
        const tr = $(this.node());
        if (tr.hasClass("parent")) {
            this.child.hide();
            this.child.remove();
            resetResponsiveState(tr);
        }
    });
};

const bindAltToggle = (table) => {
    // When a responsive row expands, close any open alt panels first
    $("#roster-table tbody").on("mousedown", "td.dtr-control, th.dtr-control", function () {
        const tr = $(this).closest("tr");
        if (tr.hasClass("alt-open")) {
            closeAltRows(table);
            resetResponsiveState(tr);
        }
    });

    table.on("responsive-display.dt", (_e, _dt, _row, showHide) => {
        if (showHide) closeAltRows(table);
    });

    // Row click — ignore clicks on the armory link itself, and rows without alts
    $("#roster-table tbody").on("click", "tr", function (e) {
        if ($(e.target).closest("a").length) return; // let armory link through

        const tr      = $(this);
        const row     = table.row(tr);
        const rowData = row.data();
        if (!rowData) return; // child rows / non-data rows

        const alts   = Array.isArray(rowData[9]) ? rowData[9] : [];
        const main   = rowData[11];
        const isOpen = tr.hasClass("alt-open");

        if (!alts.length) return; // solo character, nothing to expand

        if (isOpen && row.child.isShown()) {
            row.child.hide();
            row.child.remove();
            tr.removeClass("alt-open");
            resetResponsiveState(tr);
        } else {
            closeResponsiveRows(table);
            closeAltRows(table);
            row.child(renderAltPanel(main, alts)).show();
            tr.addClass("alt-open");
            resetResponsiveState(tr);
        }
    });
};

// ── Staleness banner ─────────────────────────────────────────────────────────
const showStalenessBanner = (lastModifiedHeader) => {
    const el = document.getElementById("roster-staleness-warning");
    if (!el) return;
    el.textContent = `Obs: Medlemslistans data uppdaterades senast ${lastModifiedHeader} och kan vara inaktuell.`;
    el.style.display = "block";
};

// ── Entry point ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    Promise.all([
        fetch(TRANSLATIONS_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(CHARACTERS_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(ROSTER_URL).then(r => {
            if (!r.ok) throw new Error(`roster.json responded ${r.status}`);
            // Stale-data check
            const lastMod = r.headers.get("Last-Modified");
            if (lastMod) {
                const ageMs = Date.now() - new Date(lastMod).getTime();
                if (ageMs > 86400000) showStalenessBanner(lastMod); // > 24 h
            }
            return r.json().then(data => ({ data, lastMod }));
        }),
    ])
    .then(([translations, characters, { data, lastMod }]) => {
        const rankMapping = translations.ranks || {};
        const zoneMapping = translations.zones || {};

        // File age in days (for adjusting offline timestamps)
        const fileAgeInDays = lastMod
            ? (Date.now() - new Date(lastMod).getTime()) / 86400000
            : 0;

        // Filter out rank 3 (Inventarie) from the roster
        const eligible = (data.members || []).filter(m => Number(m.rank) !== 3);

        const groups  = groupMembers(eligible, characters, rankMapping, zoneMapping, fileAgeInDays);
        const dataSet = Array.from(groups.values()).map(buildRow);

        const table = initTable(dataSet);
        bindAltToggle(table);
    })
    .catch(err => {
        console.error("Kunde inte ladda guildlistan:", err);
        const tbody = document.querySelector("#roster-table tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#f87171;">
                Kunde inte ladda guildlistan. Försök igen senare.
            </td></tr>`;
        }
    });
});