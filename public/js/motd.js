document.addEventListener("DOMContentLoaded", () => {
    const motdUrl = "https://azzco.xyz/data/online.json";
    const container = document.getElementById("guild-motd-container");
    const textSpan = document.getElementById("guild-motd-text");
    const highlightTargets = document.querySelectorAll("[data-guild-motd-highlight]");

    const applyMotd = (value) => {
        const sanitizedValue = String(value || "")
            .replace(/`/g, "")
            .replace(/\s+/g, " ")
            .trim();

        if (textSpan) {
            textSpan.textContent = sanitizedValue;
        }

        highlightTargets.forEach((target) => {
            target.textContent = sanitizedValue;
        });

        return sanitizedValue;
    };

    // Exit quietly if nothing on the page wants the MOTD.
    if (!container && highlightTargets.length === 0) return;

    fetch(motdUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP status ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Match this exact key once wowchat outputs the motd field to online.json
            if (data && data.motd) {
                applyMotd(data.motd);

                // Fade it in elegantly using Tailwind visibility transitions
                if (container) {
                    container.classList.remove("opacity-0");
                    container.classList.add("opacity-100");
                }
            } else {
                if (container) container.remove(); // Remove empty container from DOM
            }
        })
        .catch(error => {
            console.error("Failed to stream MOTD proxy element:", error);
            if (container) container.remove();
        });
});