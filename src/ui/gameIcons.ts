import { CardData, ResourceCost, ResourceType } from "../data/gameCatalog";

/**
 * Renders authentic 7 Wonders Duel style resource & icon medallions (SVG/Image)
 * matching the official card artwork instead of generic system emojis.
 */
export function renderResourceMedallion(type: ResourceType, count: number = 1, size: number = 22): string {
    const configs: Record<
        ResourceType,
        { bg: string; border: string; shape: "circle" | "octagon"; svgInner: string; label: string }
    > = {
        wood: {
            bg: "radial-gradient(circle at 35% 35%, #5c9e31, #2e5914)",
            border: "#d9b468",
            shape: "circle",
            label: "Madera",
            svgInner: `<circle cx="12" cy="14" r="3" fill="#c79553" stroke="#4a2c0a" stroke-width="1.2"/><circle cx="16" cy="14" r="3" fill="#c79553" stroke="#4a2c0a" stroke-width="1.2"/><circle cx="14" cy="10" r="3" fill="#deb06e" stroke="#4a2c0a" stroke-width="1.2"/>`,
        },
        clay: {
            bg: "radial-gradient(circle at 35% 35%, #e06d3b, #8f3512)",
            border: "#d9b468",
            shape: "circle",
            label: "Arcilla",
            svgInner: `<rect x="6" y="12" width="7" height="4" rx="1" fill="#c0392b" stroke="#5a160c" stroke-width="1"/><rect x="12" y="12" width="7" height="4" rx="1" fill="#d35400" stroke="#5a160c" stroke-width="1"/><rect x="9" y="8" width="7" height="4" rx="1" fill="#e67e22" stroke="#5a160c" stroke-width="1"/>`,
        },
        stone: {
            bg: "radial-gradient(circle at 35% 35%, #8b8994, #45434d)",
            border: "#d9b468",
            shape: "circle",
            label: "Piedra",
            svgInner: `<polygon points="7,16 6,11 11,8 16,10 17,16" fill="#bdc3c7" stroke="#2c3e50" stroke-width="1.2"/><polygon points="11,8 16,10 13,13 8,12" fill="#ecf0f1"/>`,
        },
        glass: {
            bg: "radial-gradient(circle at 35% 35%, #2fa4e7, #0f5687)",
            border: "#e6c983",
            shape: "octagon",
            label: "Vidrio",
            svgInner: `<path d="M10,7 L14,7 L13,10 L16,15 C16,16.5 14.5,17.5 12,17.5 C9.5,17.5 8,16.5 8,15 L11,10 Z" fill="#d4f1ff" stroke="#083b5e" stroke-width="1.1"/>`,
        },
        papyrus: {
            bg: "radial-gradient(circle at 35% 35%, #d6b87c, #8c6d32)",
            border: "#f2dc9b",
            shape: "octagon",
            label: "Papiro",
            svgInner: `<rect x="8" y="7" width="8" height="10" rx="1.5" fill="#fff3d1" stroke="#5c4314" stroke-width="1.1"/><line x1="10" y1="10" x2="14" y2="10" stroke="#8c6d32" stroke-width="1"/><line x1="10" y1="13" x2="14" y2="13" stroke="#8c6d32" stroke-width="1"/>`,
        },
    };

    const cfg = configs[type];
    const items: string[] = [];
    for (let i = 0; i < count; i++) {
        items.push(`
            <span title="${cfg.label}" style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: ${size}px;
                height: ${size}px;
                background: ${cfg.bg};
                border: 1.5px solid ${cfg.border};
                border-radius: ${cfg.shape === "circle" ? "50%" : "6px"};
                box-shadow: 0 2px 4px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.3);
                flex-shrink: 0;
            ">
                <svg viewBox="0 0 24 24" width="${size - 4}" height="${size - 4}">
                    ${cfg.svgInner}
                </svg>
            </span>
        `);
    }
    return items.join("");
}

export function renderCostMedallionsHTML(cost?: ResourceCost, coins?: number, size: number = 20): string {
    const parts: string[] = [];
    if (coins && coins > 0) {
        parts.push(`
            <span title="${coins} Monedas" style="
                display: inline-flex; align-items: center; justify-content: center;
                width: ${size + 2}px; height: ${size + 2}px;
                background: url('/assets/coins.png') center/contain no-repeat;
                color: #1f1402; font-weight: 900; font-size: ${Math.round(size * 0.6)}px;
                text-shadow: 0 1px 0 rgba(255,255,255,0.6);
            ">${coins}</span>
        `);
    }
    if (cost) {
        const order: ResourceType[] = ["wood", "clay", "stone", "glass", "papyrus"];
        for (const r of order) {
            const c = cost[r];
            if (c && c > 0) {
                parts.push(renderResourceMedallion(r, c, size));
            }
        }
    }
    if (parts.length === 0) {
        return `<span style="font-size:11px; color:#2b6cb0; font-weight:800; background:rgba(46,204,113,0.18); border:1px solid #27ae60; color:#1e6b3b; padding:1px 7px; border-radius:10px;">Gratis</span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:3px; flex-wrap:wrap;">${parts.join("")}</span>`;
}

export function renderLaurelVP(points: number | string, size: number = 24): string {
    return `
        <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
            width: ${size}px;
            height: ${size}px;
            background: url('/assets/victorypoints.png') center/contain no-repeat;
            font-family: 'Cinzel', serif;
            font-weight: 900;
            font-size: ${Math.round(size * 0.5)}px;
            color: #fff;
            text-shadow: 0 1px 3px #000, 0 0 2px #000;
            flex-shrink: 0;
        ">${points}</span>
    `;
}

export function renderCoinBadge(amount: number | string, size: number = 24): string {
    return `
        <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: ${size}px;
            height: ${size}px;
            background: url('/assets/coins.png') center/contain no-repeat;
            font-family: 'Cinzel', serif;
            font-weight: 900;
            font-size: ${Math.round(size * 0.52)}px;
            color: #211503;
            text-shadow: 0 1px 0 rgba(255,255,255,0.65);
            flex-shrink: 0;
        ">${amount}</span>
    `;
}

export function getCardAssetUrl(card: CardData): string {
    const folder = card.isGuild ? "guilds" : `age${card.age}`;
    return `/assets/${folder}/${card.id}.png`;
}

export function getWonderAssetUrl(wonderId: string): string {
    return `/assets/wonders/${wonderId}.png`;
}

export function getTokenAssetUrl(tokenId: string): string {
    return `/assets/tokens/${tokenId.toLowerCase()}.png`;
}
