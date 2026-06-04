---
title: "Medlemslista"
description: "Fika medlemmar i enlista."
type: "page"
sidebar:
  hide: true
toc:
  hide: true
---

Nedan har du en tabell över medlemmar i \<Fika\>. För att se en spelares alter klickar du på plusteckenet efter namnet.

<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/2.0.8/css/dataTables.dataTables.min.css">
<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/responsive/3.0.2/css/responsive.dataTables.min.css">
<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/select/2.0.3/css/select.dataTables.min.css">

<script type="text/javascript" charset="utf8" src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/2.0.8/js/dataTables.min.js"></script>
<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/responsive/3.0.2/js/dataTables.responsive.min.js"></script>
<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/select/2.0.3/js/dataTables.select.min.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

<style>
    .class-1 { color: #C79C6E; }
    .class-2 { color: #F58CBA; }
    .class-3 { color: #ABD473; }
    .class-4 { color: #FFF569; }
    .class-5 { color: #FFFFFF; }
    .class-6 { color: #C41F3B; }
    .class-7 { color: #0070DE; }
    .class-8 { color: #69CCF0; }
    .class-9 { color: #9482C9; }
    .class-11 { color: #FF7D0A; }
    .armory-link { text-decoration: none; font-weight: 700; }
    .armory-link:hover { text-decoration: underline; }
        .name-cell { display: inline-flex; align-items: center; gap: 0.45rem; white-space: nowrap; }
        .alt-toggle {
            width: 1.1rem;
            height: 1.1rem;
            border: 1px solid #3f444c;
            background: #1b1d21;
            color: #d1d5db;
            border-radius: 0.25rem;
            line-height: 1;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            font-size: 0.8rem;
            transition: all 120ms ease;
        }
        .alt-toggle:hover { background: #2a2f35; color: #fff; }
        .alt-toggle[data-open="1"] { background: #2a2f35; color: #fff; }
        .alt-child-wrap {
            margin: 0.35rem 0 0.5rem 1.8rem;
            padding: 0.65rem 0.75rem 0.75rem 0.95rem;
                        border-left: 3px solid #3f444c;
            border-top: 1px solid #2e3238;
            border-bottom: 1px solid #2e3238;
            border-right: 1px solid #2e3238;
            border-radius: 0.4rem;
            background: linear-gradient(90deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015));
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }
        .alt-child-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
        .alt-child-table th, .alt-child-table td { padding: 0.35rem 0.5rem; text-align: left; border-bottom: 1px solid #2e3238; }
        .alt-child-table th { color: #9ca3af; font-weight: 600; }
                .alt-child-table th:first-child { color: #9ca3af; }

    #class-distribution-chart {
        margin-top: 1rem;
    }
    #class-distribution-chart svg {
        max-width: 100%;
        height: auto;
    }
    #class-distribution-chart svg text,
    #class-distribution-chart svg .legend text,
    #class-distribution-chart svg .slice text {
        fill: #f3f4f6 !important;
        stroke: rgba(0, 0, 0, 0.35);
        stroke-width: 0.5px;
        paint-order: stroke;
    }

    table.dataTable td.responsive-cell,
    table.dataTable th.responsive-cell {
        width: 30px;
        min-width: 30px;
        max-width: 30px;
        padding-left: 14px;
        padding-right: 2px;
        white-space: nowrap;
        vertical-align: middle;
        text-align: center;
    }

    table.dataTable.dtr-inline.collapsed > tbody > tr > td.dtr-control,
    table.dataTable.dtr-inline.collapsed > tbody > tr > th.dtr-control {
        padding-left: 22px !important;
        white-space: nowrap;
        vertical-align: middle;
    }

    table.dataTable.dtr-inline.collapsed > tbody > tr > td.dtr-control:before,
    table.dataTable.dtr-inline.collapsed > tbody > tr > th.dtr-control:before {
        top: 50%;
        transform: translateY(-50%);
        left: 4px;
        width: 11px;
        height: 11px;
        line-height: 11px;
        border: 1px solid #3f444c;
        border-radius: 2px;
        background: #1b1d21;
        box-shadow: none;
        color: #8f97a6;
        opacity: 0.65;
    }

    table.dataTable.dtr-inline.collapsed > tbody > tr.parent > td.dtr-control:before,
    table.dataTable.dtr-inline.collapsed > tbody > tr.parent > th.dtr-control:before {
        color: #c5ccd8;
        border-color: #596273;
        opacity: 0.85;
    }

  .dt-container { color: #a3a3a3 !important; font-family: inherit !important; background-color: #111214 !important; padding: 1.5rem; border-radius: 0.5rem; }
  .dt-search input, .dt-length select { background-color: #1c1e22 !important; border: 1px solid #2e3238 !important; color: #fff !important; border-radius: 0.375rem !important; }
  table.dataTable { border-collapse: collapse !important; border: 1px solid #2e3238 !important; margin-top: 1rem !important; }
  table.dataTable thead th { background-color: #1c1e22 !important; color: #ffffff !important; border-bottom: 2px solid #2e3238 !important; font-weight: 600 !important; padding: 12px 16px !important; position: relative; }
  table.dataTable tbody tr { background-color: #111214 !important; color: #d1d5db !important; cursor: pointer; }
  table.dataTable tbody tr:hover { background-color: #1c1e22 !important; }
  table.dataTable td { border-bottom: 1px solid #2e3238 !important; padding: 14px 16px !important; }
    table.dataTable td.class-cell,
    table.dataTable th.class-cell {
        width: 52px;
        min-width: 52px;
        max-width: 52px;
        white-space: nowrap;
        overflow: hidden;
        text-align: center;
        vertical-align: middle;
        padding: 8px 6px !important;
    }
  
  .custom-header-menu-btn { background: none; border: none; color: #71717a; cursor: pointer; padding: 2px 6px; font-size: 14px; margin-left: 6px; border-radius: 4px; display: inline-flex; align-items: center; }
  .custom-header-menu-btn:hover { color: #ffffff; background-color: #2e3238; }
  .custom-filter-dropdown { display: none; position: absolute; top: 100%; right: 10px; background-color: #1c1e22; border: 1px solid #2e3238; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7); border-radius: 0.5rem; padding: 0.75rem; z-index: 1000; min-width: 200px; font-weight: normal; text-align: left; }
  .custom-dropdown-action-item { padding: 0.4rem 0.5rem; color: #d1d5db; cursor: pointer; border-radius: 4px; font-size: 13px; }
  .custom-dropdown-action-item:hover { background-color: #2e3238; color: #fff; }
  .custom-dropdown-divider { height: 1px; background-color: #2e3238; margin: 0.5rem 0; }
  .custom-checkbox-filter-container { max-height: 160px; overflow-y: auto; padding-top: 0.25rem; }
  .custom-checkbox-option { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; font-size: 13px; color: #d1d5db; cursor: pointer; border-radius: 4px; user-select: none; }
  .custom-checkbox-option:hover { background-color: #2e3238; color: #fff; }
  .custom-checkbox-option input[type="checkbox"] { cursor: pointer; accent-color: #10b981; width: 14px; height: 14px; margin: 0; }
  .custom-filter-dropdown input[type="text"] { background-color: #111214 !important; border: 1px solid #2e3238 !important; color: #fff !important; border-radius: 0.375rem !important; padding: 0.375rem !important; width: 100% !important; box-sizing: border-box; font-size: 13px; }
  table.dataTable tbody tr.selected { background-color: #24272c !important; color: #ffffff !important; box-shadow: inset 0 0 0 9999px rgba(16, 185, 129, 0.1) !important; }
</style>

<div class="not-prose my-6 w-full">
  <table id="production-roster-datatable" class="display responsive nowrap min-w-full text-sm" style="width:100%">
    <thead>
    <tr>
                <th class="responsive-cell" title="Detaljer"></th>
            <th data-priority="1" title="Klass" data-filterable="true"></th>
        <th title="Namn">Namn</th>
            <th title="Nivå" data-filterable="true">Nivå</th>
            <th title="Grad" data-filterable="true">Grad</th>
            <th title="Anteckning">Anteckning</th>
            <th title="Zon">Zon</th>
            <th title="Status">Status</th>
    </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<div class="not-prose">
    <div id="class-distribution-chart">Laddar klassfördelning...</div>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
    const apiEndpoint = "https://fika-api-proxy.robin-askelin.workers.dev/roster";
    const translationsEndpoint = "/utils/guild-translations.json";
    const classMapping = { 1: "Warrior", 2: "Paladin", 3: "Hunter", 4: "Rogue", 5: "Priest", 6: "Death Knight", 7: "Shaman", 8: "Mage", 9: "Warlock", 11: "Druid" };
    const classEmojiIds = { 1: "579532030153588739", 2: "579532029906124840", 3: "579532029880827924", 4: "579532030086217748", 5: "579532029901799437", 6: "599012538935410701", 7: "579532030056857600", 8: "579532030161977355", 9: "579532029851336716", 11: "579532029675438081" };

    const escapeHtml = (value) => String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const formatLastSeen = (daysSinceLogout) => {
        const totalSeconds = Math.max(0, Math.floor(daysSinceLogout * 24 * 60 * 60));
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalDays = Math.floor(totalHours / 24);

        if (totalDays >= 1) return `${totalDays} dag${totalDays === 1 ? "" : "ar"}`;
        if (totalHours >= 1) return `${totalHours} tim${totalHours === 1 ? "me" : "mar"}`;
        if (totalMinutes >= 1) return `${totalMinutes} minut${totalMinutes === 1 ? "" : "er"}`;
        return "Mindre än en minut";
    };

    const normalizeKey = (value) => String(value || "").trim().toLowerCase();

    const classOrder = [6, 11, 1, 3, 7, 4, 8, 5, 9, 2];
    const classColors = {
        6: '#C41F3B',
        11: '#FF7D0A',
        1: '#C79C6E',
        3: '#ABD473',
        7: '#0070DE',
        4: '#FFF569',
        8: '#69CCF0',
        5: '#FFFFFF',
        9: '#9482C9',
        2: '#F58CBA'
    };

    const getClassDistributionData = (rows) => {
        const counts = new Map();
        rows.forEach(row => {
            const classId = Number(row[8]);
            if (!Number.isFinite(classId)) return;
            counts.set(classId, (counts.get(classId) || 0) + 1);
        });

        const visibleOrder = classOrder.filter(classId => (counts.get(classId) || 0) > 0);
        const fallbackOrder = Array.from(counts.keys()).filter(classId => !visibleOrder.includes(classId));
        const finalOrder = [...visibleOrder, ...fallbackOrder];

        return { counts, finalOrder };
    };

    const buildClassDistributionMermaid = (rows) => {
        const { counts, finalOrder } = getClassDistributionData(rows);

        const themeVars = {};
        finalOrder.forEach((classId, idx) => {
            themeVars[`pie${idx + 1}`] = classColors[classId] || '#9CA3AF';
        });

        const lines = finalOrder.map(classId => {
            const className = classMapping[classId] || `Class ${classId}`;
            const count = counts.get(classId) || 0;
            return `    "${className}" : ${count}`;
        });

        return `%%{init: {'theme':'base','themeVariables':${JSON.stringify(themeVars)}}}%%\n` +
            `pie title Klassfördelning i raidroster\n` +
            lines.join('\n');
    };

    const decorateMermaidLegendWithIcons = (chartEl) => {
        const svg = chartEl.querySelector('svg');
        if (!svg) return;

        const classIdByName = Object.fromEntries(
            Object.entries(classMapping).map(([id, name]) => [name, Number(id)])
        );

        const legendTexts = svg.querySelectorAll('g[class*="legend"] text');
        legendTexts.forEach((textEl) => {
            if (textEl.getAttribute('data-iconified') === '1') return;

            const className = (textEl.textContent || '').trim();
            const classId = classIdByName[className];
            const emojiId = classEmojiIds[classId];
            if (!emojiId) return;

            const x = Number(textEl.getAttribute('x') || '0');
            const y = Number(textEl.getAttribute('y') || '0');
            textEl.setAttribute('x', String(x + 18));

            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            const href = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
            icon.setAttribute('x', String(x));
            icon.setAttribute('y', String(y - 11));
            icon.setAttribute('width', '14');
            icon.setAttribute('height', '14');
            icon.setAttribute('href', href);
            icon.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);

            const parent = textEl.parentNode;
            if (parent) parent.insertBefore(icon, textEl);
            textEl.setAttribute('data-iconified', '1');
        });
    };

    const renderClassDistribution = async (rows) => {
        const chartEl = document.getElementById('class-distribution-chart');
        if (!chartEl) return;
        if (!window.mermaid) {
            chartEl.textContent = 'Kunde inte ladda Mermaid.';
            return;
        }

        if (!rows || !rows.length) {
            chartEl.textContent = 'Ingen data tillgänglig för klassfördelning.';
            return;
        }

        try {
            const markup = buildClassDistributionMermaid(rows);
            const graphId = `class-dist-${Date.now()}`;
            const result = await mermaid.render(graphId, markup);
            chartEl.innerHTML = result.svg;
            decorateMermaidLegendWithIcons(chartEl);
        } catch (err) {
            console.error('Kunde inte rendera klassfördelningsdiagrammet', err);
            chartEl.textContent = 'Kunde inte rendera klassfördelningsdiagrammet.';
        }
    };

    if (window.mermaid) {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
    }

    const renderAltRows = (alts) => {
        if (!alts || !alts.length) return "";
        const rows = alts.map(alt => {
            const safeName = escapeHtml(alt.name);
            const safeNote = escapeHtml(alt.note || "");
            const safeZone = escapeHtml(alt.zoneName);
            const safeStatus = escapeHtml(alt.statusText);
            const armoryUrl = `https://chromiecraft.com/en/armory/?character/ChromieCraft/${encodeURIComponent(alt.name)}`;
            return `<tr>
                <td><a href="${armoryUrl}" target="_blank" rel="noopener noreferrer" class="armory-link class-${alt.classId}">${safeName}</a></td>
                <td>${alt.level}</td>
                <td>${safeNote}</td>
                <td>${safeZone}</td>
                <td>${safeStatus}</td>
            </tr>`;
        }).join("");

        return `<div class="alt-child-wrap">
            <table class="alt-child-table">
                <thead>
                    <tr><th>Alt</th><th>Nivå</th><th>Anteckning</th><th>Zon</th><th>Status</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    };

    fetch(translationsEndpoint)
        .then(res => res.ok ? res.json() : null)
        .then(translations => translations || {})
        .catch(err => {
            console.error("Kunde inte ladda guild-översättningar", err);
            return {};
        })
        .then(translations => {
            const rankMapping = translations.ranks || {};
            const zoneMapping = translations.zones || {};

            return fetch(apiEndpoint)
            .then(res => res.json())
            .then(data => {
            const groupedMembers = new Map();

            (data.members || []).forEach(m => {
                if (Number(m.rank) === 3) return; // Hide Inventarie by default

                const className = classMapping[m.classId] || `Class ${m.classId}`;
                const rankName = rankMapping[m.rank] || `Rank ${m.rank}`;
                const zoneName = zoneMapping[m.zoneId] || `Zone ${m.zoneId}`;
                const statusText = m.isOnline ? "Påloggad" : formatLastSeen(Number(m.lastLogoff) || 0);
                const officerNote = (m.officerNote || "").trim();
                const mainFromOfficerNote = officerNote ? officerNote.split(/\s+/)[0] : "";
                const isAltRank = /\balt\b/i.test(rankName);
                const groupKey = (isAltRank && mainFromOfficerNote) ? mainFromOfficerNote : m.name;
                const normalizedGroupKey = normalizeKey(groupKey || m.name);

                if (!groupedMembers.has(normalizedGroupKey)) {
                    groupedMembers.set(normalizedGroupKey, { groupLabel: groupKey || m.name, members: [] });
                }

                groupedMembers.get(normalizedGroupKey).members.push({
                    name: m.name,
                    classId: m.classId,
                    className,
                    level: m.level,
                    rankId: Number(m.rank),
                    rankName,
                    note: m.publicNote || "",
                    zoneName,
                    statusText,
                    isAltRank,
                    groupLabel: groupKey || m.name
                });
            });

            const tableDataSet = [];

            groupedMembers.forEach(group => {
                const normalizedLabel = normalizeKey(group.groupLabel);
                const main =
                    group.members.find(x => normalizeKey(x.name) === normalizedLabel && !x.isAltRank) ||
                    group.members.find(x => normalizeKey(x.name) === normalizedLabel) ||
                    group.members.find(x => !x.isAltRank) ||
                    group.members[0];

                const alts = group.members.filter(x => x !== main);

                tableDataSet.push([
                    '',
                    main.className,
                    main.name,
                    main.level,
                    main.rankName,
                    main.note,
                    main.zoneName,
                    main.statusText,
                    main.classId,
                    alts,
                    Number.isFinite(main.rankId) ? main.rankId : 999
                ]);
            });

            const table = $('#production-roster-datatable').DataTable({
                data: tableDataSet,
                language: {
                        "sEmptyTable": "Inga data tillgängliga i tabellen",
                        "sInfo": "Visar _START_ till _END_ av _TOTAL_ poster",
                        "sInfoEmpty": "Visar 0 till 0 av 0 poster",
                        "sInfoFiltered": "(filtrerat från _MAX_ totala poster)",
                        "sLengthMenu": "Visa _MENU_ poster",
                        "sLoadingRecords": "Laddar...",
                        "sProcessing": "Bearbetar...",
                        "sSearch": "Sök:",
                        "sZeroRecords": "Inga matchande poster hittades",
                        "oPaginate": {
                            "sFirst": "Första",
                            "sLast": "Sista",
                            "sNext": "Nästa",
                            "sPrevious": "Föregående"
                        }
                    },
                pageLength: 25,
                order: [[4, 'asc'], [2, 'asc']],
                responsive: {
                    details: {
                        type: 'column',
                        target: 0
                    }
                },
                select: { style: 'multi' },
                columnDefs: [
                    { targets: 0, className: 'dtr-control responsive-cell', orderable: false, searchable: false, defaultContent: '' },
                    { targets: 1, className: 'class-cell', render: (d, t, r) => t === 'display' ? (classEmojiIds[r[8]] ? `<span style="display:inline-flex; align-items:center; justify-content:center; width:100%;"><img src="https://cdn.discordapp.com/emojis/${classEmojiIds[r[8]]}.png" style="width:1.55em; height:1.55em; object-fit:contain; vertical-align:middle; border-radius:3px;"></span>` : d) : d },
                    {
                        targets: 4,
                        type: 'num',
                        render: (d, t, r) => {
                            const rankId = Number.isFinite(r[10]) ? r[10] : 999;
                            if (t === 'display' || t === 'filter') return d;
                            return rankId;
                        }
                    },
                    {
                        targets: 2,
                        render: (d, t, r) => {
                            if (t !== 'display') return d;
                            const safeName = escapeHtml(d);
                            const classId = r[8];
                            const alts = Array.isArray(r[9]) ? r[9] : [];
                            const toggle = alts.length ? '<button class="alt-toggle" data-open="0" aria-label="Visa eller dölj alters">+</button>' : '';
                            const armoryUrl = `https://chromiecraft.com/en/armory/?character/ChromieCraft/${encodeURIComponent(d)}`;
                            return `<span class="name-cell"><a href="${armoryUrl}" target="_blank" rel="noopener noreferrer" class="armory-link class-${classId}">${safeName}</a>${toggle}</span>`;
                        }
                    }
                ],
                initComplete: function () {
                    this.api().columns().every(function () {
                        var column = this;
                        var header = $(column.header());
                        var isFilterable = header.data('filterable') === true;
                        
                        // Only add the menu button if the column is filterable
                        if (isFilterable) {
                            var menuBtn = $('<button class="custom-header-menu-btn">☰</button>');
                            var dropdown = $('<div class="custom-filter-dropdown"></div>');

                            var sortAscItem = $('<div class="custom-dropdown-action-item">↑ Sortera stigande</div>');
                            sortAscItem.on('click', function(e) {
                                e.stopPropagation();
                                column.order('asc').draw();
                                dropdown.hide();
                            });
                            var sortDescItem = $('<div class="custom-dropdown-action-item">↓ Sortera fallande</div>');
                            sortDescItem.on('click', function(e) {
                                e.stopPropagation();
                                column.order('desc').draw();
                                dropdown.hide();
                            });

                            dropdown.append(sortAscItem);
                            dropdown.append(sortDescItem);
                            dropdown.append('<div class="custom-dropdown-divider"></div>');

                            var controls = $('<div style="display:flex; gap:5px; margin-bottom:5px; padding:0 5px;"></div>');
                            var container = $('<div class="custom-checkbox-filter-container"></div>');
                            
                            $('<button style="font-size:10px; cursor:pointer;">Alla</button>').on('click', function(e) { e.stopPropagation(); container.find('input').prop('checked', true).trigger('change'); }).appendTo(controls);
                            $('<button style="font-size:10px; cursor:pointer;">Inga</button>').on('click', function(e) { e.stopPropagation(); container.find('input').prop('checked', false).trigger('change'); }).appendTo(controls);
                            dropdown.append(controls);

                            column.data().unique().sort().each(function (d) {
                                var val = typeof d === 'string' ? d.replace(/<[^>]*>/g, '').trim() : d;
                                container.append(`<label class="custom-checkbox-option"><input type="checkbox" value="${val}"> ${val}</label>`);
                            });
                            dropdown.append(container);
                            dropdown.on('click', function(e) { e.stopPropagation(); });
                            container.on('change', 'input', function() {
                                var vals = container.find('input:checked').map(function() { return $.fn.dataTable.util.escapeRegex(this.value); }).get().join('|');
                                column.search(vals ? `^(${vals})$` : '', true, false).draw();
                            });
                            
                            header.append(menuBtn).append(dropdown);
                            menuBtn.on('click', (e) => { e.stopPropagation(); $('.custom-filter-dropdown').not(dropdown).hide(); dropdown.toggle(); });
                        }
                    });
                    $(document).on('click', () => $('.custom-filter-dropdown').hide());
                }
            });

            const updateClassDistribution = () => {
                const visibleRows = table.rows({ search: 'applied' }).data().toArray();
                renderClassDistribution(visibleRows);
            };

            updateClassDistribution();
            table.on('draw.dt', updateClassDistribution);

            const closeAltRows = () => {
                $('#production-roster-datatable tbody button.alt-toggle[data-open="1"]').each(function() {
                    const btn = $(this);
                    const tr = btn.closest('tr');
                    const row = table.row(tr);
                    if (row.child.isShown()) {
                        row.child.hide();
                    }
                    row.child.remove();
                    tr.removeClass('alt-open');
                    resetResponsiveControlState(tr);
                    btn.text('+').attr('data-open', '0');
                });
            };

            const resetResponsiveControlState = (tr) => {
                tr.removeClass('parent dtr-expanded');
                tr.find('td.dtr-control, th.dtr-control').removeClass('parent dtr-expanded');
            };

            const closeResponsiveRows = () => {
                table.rows().every(function() {
                    const tr = $(this.node());
                    if (tr.hasClass('parent')) {
                        this.child.hide();
                        this.child.remove();
                        resetResponsiveControlState(tr);
                    }
                });
            };

            $('#production-roster-datatable tbody').on('mousedown', 'td.dtr-control, th.dtr-control', function() {
                const tr = $(this).closest('tr');
                const hadOpenAlt = tr.find('button.alt-toggle[data-open="1"]').length > 0;
                if (!hadOpenAlt) return;

                // Run before DataTables click handler so the same click can open responsive details.
                closeAltRows();
                resetResponsiveControlState(tr);
            });

            table.on('responsive-display.dt', function(e, datatable, row, showHide) {
                if (showHide) {
                    closeAltRows();
                }
            });

            $('#production-roster-datatable tbody').on('click', 'button.alt-toggle', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const btn = $(this);
                const tr = btn.closest('tr');
                const row = table.row(tr);
                const rowData = row.data();
                const alts = Array.isArray(rowData[9]) ? rowData[9] : [];
                const isAltOpen = tr.hasClass('alt-open');

                if (isAltOpen && row.child.isShown()) {
                    row.child.hide();
                    row.child.remove();
                    tr.removeClass('alt-open');
                    resetResponsiveControlState(tr);
                    btn.text('+').attr('data-open', '0');
                } else {
                    closeResponsiveRows();
                    closeAltRows();
                    row.child(renderAltRows(alts)).show();
                    tr.addClass('alt-open');
                    // Keep responsive controller visually closed while alt child is shown.
                    resetResponsiveControlState(tr);
                    btn.text('−').attr('data-open', '1');
                }
            });
            });
        });
});
</script>