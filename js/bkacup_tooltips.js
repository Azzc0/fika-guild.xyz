// tooltips.js
class TurtleTooltips {
    constructor() {
        this.spellData = null;
        this.tooltip = null;
        this.iconElement = null;
        this.init();
    }

    async init() {
        await this.loadSpellData();
        this.createTooltipElements();
        this.bindEvents();
        console.log('🐢 Turtle Tooltips loaded!');
    }

    async loadSpellData() {
        try {
            const response = await fetch('spells.json');
            const data = await response.json();
            this.spellData = data;
            
            this.spellMap = new Map();
            data.spells.forEach(spell => {
                this.spellMap.set(spell[0], spell);
            });
            
            console.log(`Loaded ${this.spellMap.size} spells`);
        } catch (error) {
            console.error('Failed to load spell data:', error);
        }
    }

    createTooltipElements() {
        // Create main tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'turtle-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: #1a1a1a;
            border: 2px solid #8B4513;
            border-radius: 8px;
            padding: 12px;
            color: #FFD700;
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            max-width: 300px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.8);
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.tooltip);

        // Create separate icon element (outside tooltip)
        this.iconElement = document.createElement('div');
        this.iconElement.className = 'turtle-tooltip-icon';
        this.iconElement.style.cssText = `
            position: absolute;
            width: 54px;
            height: 54px;
            z-index: 10001;
            display: none;
            pointer-events: none;
            border: 2px solid #8B4513;
            border-radius: 4px;
            background: #1a1a1a;
            padding: 2px;
        `;
        document.body.appendChild(this.iconElement);
    }

    bindEvents() {
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('.turtle-link');
            if (target) {
                this.showTooltip(target, e);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('.turtle-link');
            if (target) {
                this.hideTooltip();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.display !== 'none') {
                this.positionTooltip(e);
            }
        });
    }

    showTooltip(element, event) {
        const type = element.dataset.type;
        const id = parseInt(element.dataset.id);
        
        let content = '';
        let iconPath = '';
        
        switch (type) {
            case 'spell':
                const spellData = this.createSpellTooltip(id);
                content = spellData.content;
                iconPath = spellData.iconPath;
                break;
            case 'item':
                content = this.createItemTooltip(id);
                break;
            case 'npc':
                content = this.createNpcTooltip(id);
                break;
        }
        
        if (content) {
            this.tooltip.innerHTML = content;
            this.tooltip.style.display = 'block';
            
            // Set icon if available
            if (iconPath) {
                this.iconElement.innerHTML = `<img src="cdn/Interface/Icons/${iconPath}.png" 
                                                 alt="" 
                                                 style="width: 100%; height: 100%; border-radius: 2px;">`;
                this.iconElement.style.display = 'block';
            }
            
            this.positionTooltip(event);
        }
    }

    createSpellTooltip(spellId) {
        if (!this.spellMap.has(spellId)) {
            return { content: `<div>Spell ${spellId} not found</div>`, iconPath: '' };
        }
        
        const spell = this.spellMap.get(spellId);
        const [id, name, rank, icon, school, desc, cost, powerType, castTime, cooldown, rangeMin, rangeMax, duration, reagents, minLevel, spellLevel, maxLevel] = spell;
        
        const iconPath = this.normalizeIconPath(icon);
        
        // Build description from multiple sources if main description is empty
        let displayDesc = desc;
        if (!displayDesc) {
            displayDesc = this.buildSpellDescription(castTime, reagents, cost, powerType);
        }

        // Get school name for display
        const schoolName = this.getSchoolName(school);
        
        const content = `
            <div style="min-width: 0;">
                <div style="font-weight: bold; color: #FFD700; margin-bottom: 4px; font-size: 15px;">
                    ${name}
                </div>
                ${rank ? `<div style="color: #FFFF80; font-style: italic; margin-bottom: 6px; font-size: 12px;">${rank}</div>` : ''}
                
                <div style="color: #A0A0A0; font-size: 11px; margin-bottom: 6px;">
                    ${schoolName}
                </div>
                
                <div style="color: #FFFFFF; font-size: 12px; line-height: 1.4; margin-bottom: 6px;">
                    ${displayDesc}
                </div>
                
                <div style="border-top: 1px solid #444; padding-top: 6px; font-size: 11px;">
                    ${cost > 0 ? `<div style="color: #69CCF0;">Mana Cost: ${cost}</div>` : ''}
                    ${castTime > 0 ? `<div style="color: #FFFFFF;">Cast time: ${(castTime/1000).toFixed(1)} sec</div>` : ''}
                    ${cooldown > 0 ? `<div style="color: #FF6B6B;">Cooldown: ${(cooldown/1000).toFixed(1)} sec</div>` : ''}
                    ${rangeMax > 0 ? `<div style="color: #FFFFFF;">Range: ${rangeMax} yd</div>` : ''}
                    ${duration > 0 ? `<div style="color: #FFFFFF;">Duration: ${(duration/1000).toFixed(1)} sec</div>` : ''}
                </div>
            </div>
        `;

        return { content, iconPath };
    }

    buildSpellDescription(castTime, reagents, cost, powerType) {
        let parts = [];
        
        // Add cast time for crafting spells
        if (castTime >= 30000) { // Only show for longer casts (crafting spells)
            parts.push(`Casting time: ${(castTime/1000).toFixed(0)} sec`);
        }
        
        // Add reagents if available
        if (reagents && reagents.length > 0) {
            const reagentText = reagents.map(r => `${r[1]}x [Item ${r[0]}]`).join(', ');
            parts.push(`Reagents: ${reagentText}`);
        }
        
        return parts.length > 0 ? parts.join('<br>') : 'No description available.';
    }

    getSchoolName(school) {
        const schools = {
            1: 'Physical',
            2: 'Holy',
            4: 'Fire',
            8: 'Nature',
            16: 'Frost',
            32: 'Shadow',
            64: 'Arcane'
        };
        return schools[school] || 'Unknown School';
    }

    createItemTooltip(itemId) {
        return `
            <div style="min-width: 0;">
                <div style="color: #FFD700; font-weight: bold;">
                    Item ${itemId}
                </div>
                <div style="color: #FFFFFF; font-size: 12px;">
                    Item tooltips coming soon!
                </div>
            </div>
        `;
    }

    createNpcTooltip(npcId) {
        return `
            <div style="min-width: 0;">
                <div style="color: #FFD700; font-weight: bold;">
                    NPC ${npcId}
                </div>
                <div style="color: #FFFFFF; font-size: 12px;">
                    NPC tooltips coming soon!
                </div>
            </div>
        `;
    }

    normalizeIconPath(iconName) {
        // Convert to lowercase for consistent file naming
        return iconName.toLowerCase();
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
        this.iconElement.style.display = 'none';
    }

    positionTooltip(event) {
        const x = event.clientX + 20;
        const y = event.clientY + 20;
        
        // Position tooltip
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
        
        // Position icon to the left of tooltip (icon's top-right aligns with tooltip's top-left)
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const iconX = x - 58; // 54px icon + 2px border * 2
        const iconY = y;
        
        this.iconElement.style.left = iconX + 'px';
        this.iconElement.style.top = iconY + 'px';
        
        // Keep tooltip in viewport
        const rect = this.tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.tooltip.style.left = (event.clientX - rect.width - 20) + 'px';
            // Also reposition icon when tooltip flips
            this.iconElement.style.left = (event.clientX - rect.width - 20 - 58) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.tooltip.style.top = (event.clientY - rect.height - 20) + 'px';
            this.iconElement.style.top = (event.clientY - rect.height - 20) + 'px';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TurtleTooltips();
});