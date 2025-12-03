// tooltips.js - Simplified version using pre-generated HTML content
class TurtleTooltips {
    constructor() {
        this.tooltip = null;
        this.iconElement = null;
        this.init();
    }

    init() {
        this.createTooltipElements();
        this.bindEvents();
        console.log('🐢 Turtle Tooltips loaded! (using pre-generated content)');
    }

    createTooltipElements() {
        // Create main tooltip - let CSS handle all styling
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'turtle-tooltip hidden';
        document.body.appendChild(this.tooltip);

        // Create separate icon element (outside tooltip) - let CSS handle styling
        this.iconElement = document.createElement('div');
        this.iconElement.className = 'turtle-tooltip-icon';
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
        const tooltipContent = element.dataset.tooltipContent;
        const icon = element.dataset.icon;
        const showTooltipIcon = element.dataset.showTooltipIcon !== 'false';
        
        if (tooltipContent) {
            this.tooltip.innerHTML = tooltipContent;
            this.tooltip.classList.remove('hidden');
            this.tooltip.classList.add('visible');
            
            // Set icon only if not disabled by flag
            if (icon && showTooltipIcon) {
                this.setIconBackground(icon);
                this.iconElement.classList.add('visible');
            } else {
                this.iconElement.classList.remove('visible');
            }
            
            this.positionTooltip(event);
        }
    }

    setIconBackground(iconName) {
        const iconPath = this.normalizeIconPath(iconName);
        this.iconElement.style.backgroundImage = `url('https://res.cloudinary.com/dhmmkvcpy/image/upload/q_auto,f_auto/Interface/Icons/${iconPath}')`;
        this.iconElement.style.backgroundSize = '90%'; // Slightly smaller to fit within border
        this.iconElement.style.backgroundPosition = 'center';
        this.iconElement.style.backgroundRepeat = 'no-repeat';
    }

    normalizeIconPath(iconName) {
        return iconName.toLowerCase();
    }

    hideTooltip() {
        this.tooltip.classList.remove('visible');
        this.tooltip.classList.add('hidden');
        this.iconElement.classList.remove('visible');
    }

    positionTooltip(event) {
        // Account for page scroll - use pageX/pageY instead of clientX/clientY
        const x = event.pageX + 20;
        const y = event.pageY + 20;
        
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y + 'px';
        
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const iconX = x - 58;
        const iconY = y;
        
        this.iconElement.style.left = iconX + 'px';
        this.iconElement.style.top = iconY + 'px';
        
        const rect = this.tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.tooltip.style.left = (event.pageX - rect.width - 20) + 'px';
            this.iconElement.style.left = (event.pageX - rect.width - 20 - 58) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.tooltip.style.top = (event.pageY - rect.height - 20) + 'px';
            this.iconElement.style.top = (event.pageY - rect.height - 20) + 'px';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TurtleTooltips();
});