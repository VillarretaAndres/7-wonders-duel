import Phaser from "phaser";
import {
    CardColor,
    CardData,
    CARDS_BY_ID,
    COLOR_META,
    describeCardFull,
    getChoicePoolsClient,
    getDiscountedResourcesClient,
    getFixedProductionClient,
    previewCardCostClient,
    previewWonderCostClient,
    PROGRESS_TOKENS,
    RESOURCE_META,
    ResourceType,
    SCIENCE_META,
    WONDERS,
} from "../data/gameCatalog";
import {
    GameStateSnapshot,
    network,
    PlayerSnapshot,
} from "../network/NetworkService";
import {
    getCardAssetUrl,
    getTokenAssetUrl,
    getWonderAssetUrl,
    renderCoinBadge,
    renderCostMedallionsHTML,
    renderLaurelVP,
    renderResourceMedallion,
} from "../ui/gameIcons";
import { renderSettingsButtonHTML, renderSettingsModalHTML } from "../ui/settingsModal";

export class GameScene extends Phaser.Scene {
    private unsubscribe?: () => void;
    private boardBg?: Phaser.GameObjects.Image;
    private pyramidGroup!: Phaser.GameObjects.Container;
    private fxGroup!: Phaser.GameObjects.Container;

    // Selection & preview state (non-blocking dock!)
    private selectedSlotIndex: number | null = null;
    private inspectedWonderId: string | null = null;
    private expandedCityDrawer: "none" | "me" | "opp" | "info" = "none";

    private latestSnap: GameStateSnapshot | null = null;

    // Settings modal state
    private isSettingsOpen: boolean = false;
    private confirmingLeave: boolean = false;

    // Animation tracking state
    private lastAnimatedAge: number = 0;
    private knownFaceUpSlots = new Set<number>();
    private lastLogCount: number = 0;
    private lastMilitaryPos: number = 0;

    constructor() {
        super("GameScene");
    }

    create() {
        const { width, height } = this.scale;
        this.isSettingsOpen = false;
        this.confirmingLeave = false;
        this.selectedSlotIndex = null;
        this.inspectedWonderId = null;
        this.expandedCityDrawer = "none";
        this.lastAnimatedAge = 0;
        this.knownFaceUpSlots.clear();
        this.lastLogCount = 0;
        this.lastMilitaryPos = 0;

        if (this.textures.exists("board_bg")) {
            this.boardBg = this.add.image(width / 2, height / 2, "board_bg");
            this.fitBoard(width, height);
        }

        const vignette = this.add.graphics();
        this.drawTableVignette(vignette, width, height);

        this.pyramidGroup = this.add.container(0, 0);
        this.fxGroup = this.add.container(0, 0);

        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.fitBoard(gameSize.width, gameSize.height);
            this.drawTableVignette(vignette, gameSize.width, gameSize.height);
            if (this.latestSnap) {
                this.renderGameHUD(this.latestSnap, false);
            }
        });

        this.unsubscribe = network.onStateUpdate(snap => {
            const isFirstSnap = this.latestSnap === null;
            this.latestSnap = snap;

            if (snap.gamePhase === "WAITING") {
                this.scene.start("LobbyScene");
                return;
            }
            if (snap.gamePhase === "WONDER_DRAFT") {
                this.scene.start("WonderDraftScene");
                return;
            }

            if (
                this.selectedSlotIndex !== null &&
                (snap.gamePhase !== "AGE_PLAY" ||
                    snap.pyramid[this.selectedSlotIndex]?.removed)
            ) {
                this.selectedSlotIndex = null;
            }

            if (!isFirstSnap && snap.logs.length > this.lastLogCount && network.animationsEnabled) {
                const newestLog = snap.logs[snap.logs.length - 1];
                if (newestLog) {
                    this.spawnFloatingBanner(newestLog);
                }
            }
            this.lastLogCount = snap.logs.length;

            if (snap.gamePhase === "GAME_OVER") {
                network.playSound("victory");
            }

            this.renderGameHUD(snap, true);
            this.lastMilitaryPos = snap.militaryPosition;
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.unsubscribe) this.unsubscribe();
        });
    }

    private fitBoard(w: number, h: number) {
        if (!this.boardBg) return;
        this.boardBg.setPosition(w / 2, h / 2);
        const scale = Math.max(w / 1509, h / 1024);
        this.boardBg.setScale(scale);
    }

    private drawTableVignette(gfx: Phaser.GameObjects.Graphics, w: number, h: number) {
        gfx.clear();
        gfx.fillGradientStyle(0x24160b, 0x24160b, 0x170d06, 0x170d06, 0.18);
        gfx.fillRect(0, 0, w, h);
    }

    private spawnFloatingBanner(text: string) {
        const { width, height } = this.scale;
        const isMobile = width <= 920;
        const startY = isMobile ? height * 0.45 : 112;
        const banner = this.add.container(width / 2, startY);

        const bg = this.add
            .rectangle(0, 0, Math.min(width - 24, 440), 28, 0x281a0e, 0.92)
            .setStrokeStyle(1.5, 0xd4a445, 0.95);
        const lbl = this.add
            .text(0, 0, text.length > 54 ? text.slice(0, 52) + "…" : text, {
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: "11px",
                color: "#f8eedb",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        banner.add([bg, lbl]);
        banner.setAlpha(0);
        this.fxGroup.add(banner);

        this.tweens.add({
            targets: banner,
            y: startY - 16,
            alpha: 1,
            duration: 220,
            ease: "Cubic.easeOut",
            onComplete: () => {
                this.tweens.add({
                    targets: banner,
                    y: startY - 30,
                    alpha: 0,
                    delay: 1200,
                    duration: 320,
                    ease: "Cubic.easeIn",
                    onComplete: () => banner.destroy(),
                });
            },
        });
    }

    /**
     * Measures the exact open `#pyramid-viewport-slot` DOM box so the Phaser Pyramid
     * always centers and scales inside the exact free space between the top and bottom UI bars!
     */
    private getPyramidBounds(): { cx: number; cy: number; availW: number; availH: number } {
        const { width, height } = this.scale;
        const slotEl = document.getElementById("pyramid-viewport-slot");
        if (slotEl) {
            const rect = slotEl.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
                return {
                    cx: rect.left + rect.width / 2,
                    cy: rect.top + rect.height / 2,
                    availW: rect.width - 8,
                    availH: rect.height - 8,
                };
            }
        }
        const isMobile = width <= 920;
        const topReserved = isMobile ? 148 : 86;
        const bottomReserved = isMobile ? 168 : 42;
        const sideReserved = isMobile ? 8 : 530;
        const availW = Math.max(260, width - sideReserved);
        const availH = Math.max(200, height - topReserved - bottomReserved);
        return {
            cx: width / 2,
            cy: topReserved + availH / 2,
            availW,
            availH,
        };
    }

    /**
     * Renders the 20-card Pyramid inside `#pyramid-viewport-slot` using native High-DPI Retina
     * `<img>` elements + `.marble-nameplate` typography so cards are 100% razor-sharp on
     * mobile Retina screens (2x/3x/4x DPI) as well as desktop monitors!
     */
    private renderPyramidCanvas(snap: GameStateSnapshot, allowAnimations: boolean = true) {
        this.pyramidGroup.removeAll(true);

        const slotContainer = document.getElementById("pyramid-viewport-slot");
        if (!slotContainer) return;

        const rect = slotContainer.getBoundingClientRect();
        const availW = Math.max(240, (rect.width || window.innerWidth) - 8);
        const availH = Math.max(180, (rect.height || window.innerHeight * 0.45) - 8);

        const isAge3 = snap.currentAge === 3;
        const totalRows = isAge3 ? 7 : 5;

        const isNewAgeDeal = this.lastAnimatedAge !== snap.currentAge;
        if (isNewAgeDeal) {
            this.lastAnimatedAge = snap.currentAge;
            this.knownFaceUpSlots.clear();
            for (const s of snap.pyramid) {
                if (s.faceUp && !s.removed) {
                    this.knownFaceUpSlots.add(s.index);
                }
            }
        }

        const maxColsSpan = isAge3 ? 4.16 : 6.16;
        const maxCardWByWidth = availW / maxColsSpan;

        const rowOverlapFactor = isAge3 ? 0.41 : 0.45;
        const verticalCardUnits = (1 + (totalRows - 1) * rowOverlapFactor) * 1.542;
        const maxCardWByHeight = availH / verticalCardUnits;

        const cardW = Math.floor(
            Phaser.Math.Clamp(Math.min(maxCardWByWidth, maxCardWByHeight), 46, 118)
        );
        const cardH = Math.round(cardW * 1.542);

        const colSpacing = cardW * 1.03;
        const rowSpacing = cardH * rowOverlapFactor;

        const totalStructureH = (totalRows - 1) * rowSpacing + cardH;
        const centerX = (rect.width || availW) / 2;
        const centerY = (rect.height || availH) / 2;
        const startY = centerY - totalStructureH / 2 + cardH / 2;

        const myId = network.sessionId;
        const isMyTurn = snap.currentTurn === myId && snap.gamePhase === "AGE_PLAY";
        const p1Id = snap.playerOrder[0];
        const p2Id = snap.playerOrder[1];
        const me = snap.players[myId] || snap.players[p1Id];
        const opp = snap.players[me?.sessionId === p1Id ? p2Id : p1Id];

        const myBuiltWonders = (me?.wonders || [])
            .filter(w => w.isBuilt)
            .map(w => w.wonderId);

        const sortedSlots = [...snap.pyramid].sort((a, b) => a.row - b.row);

        const nodesHtml: string[] = [];

        for (const slot of sortedSlots) {
            if (slot.removed) continue;

            const x = Math.round(centerX + slot.col * colSpacing);
            const y = Math.round(startY + slot.row * rowSpacing);
            const zIndex = 10 + slot.row * 2;

            const isFaceDown = !slot.faceUp || slot.cardId === "HIDDEN";
            const justFlippedFaceUp =
                !isNewAgeDeal && !isFaceDown && !this.knownFaceUpSlots.has(slot.index);
            if (!isFaceDown) {
                this.knownFaceUpSlots.add(slot.index);
            }
            if (justFlippedFaceUp && allowAnimations && network.animationsEnabled) {
                network.playSound("flip");
            }

            let animClass = "";
            let animDelay = "";
            if (allowAnimations && network.animationsEnabled) {
                if (isNewAgeDeal) {
                    animClass = "pyramid-deal-anim";
                    animDelay = `animation-delay: ${slot.index * 20}ms;`;
                } else if (justFlippedFaceUp) {
                    animClass = "pyramid-flip-anim";
                }
            }

            if (isFaceDown) {
                const backUrl = `/assets/age${snap.currentAge}/age${snap.currentAge}_back.png`;
                nodesHtml.push(`
                    <div class="${animClass}" style="
                        position: absolute;
                        left: ${x}px;
                        top: ${y}px;
                        width: ${cardW}px;
                        height: ${cardH}px;
                        transform: translate(-50%, -50%);
                        z-index: ${zIndex};
                        border-radius: 5px;
                        box-shadow: 0 4px 10px rgba(10, 5, 1, 0.65);
                        pointer-events: none;
                        ${animDelay}
                    ">
                        <img src="${backUrl}" style="
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            display: block;
                            border-radius: 5px;
                        " />
                    </div>
                `);
            } else {
                const card = CARDS_BY_ID[slot.cardId];
                const isAvail = slot.available;
                const isSelected = this.selectedSlotIndex === slot.index;
                const cardUrl = card ? getCardAssetUrl(card) : "";

                let borderCss = "1.5px solid rgba(92, 61, 24, 0.7)";
                let boxShadowCss = "0 4px 10px rgba(10, 5, 1, 0.65)";
                if (isSelected) {
                    borderCss = "2.5px solid #00f2ff";
                    boxShadowCss = "0 0 14px rgba(0, 242, 255, 0.9), 0 6px 14px rgba(0,0,0,0.7)";
                } else if (isAvail && isMyTurn) {
                    borderCss = "2px solid #f2c968";
                    boxShadowCss = "0 0 10px rgba(242, 201, 104, 0.55), 0 5px 12px rgba(0,0,0,0.65)";
                }

                // Top-left live cost badge on available cards
                let costBadgeHtml = "";
                if (isAvail && card && me) {
                    const preview = previewCardCostClient(
                        card,
                        me.coins,
                        me.builtCards,
                        myBuiltWonders,
                        me.progressTokens,
                        opp?.builtCards || []
                    );
                    let badgeBg = "linear-gradient(180deg, #f2c968, #b88322)";
                    let badgeTextCol = "#1f1204";
                    let label = `${preview.totalCoins}`;

                    if (preview.isFreeByChain || preview.totalCoins === 0) {
                        badgeBg = "linear-gradient(180deg, #27ae60, #186a3b)";
                        badgeTextCol = "#ffffff";
                        label = "0";
                    } else if (!preview.canAfford) {
                        badgeBg = "linear-gradient(180deg, #c0392b, #7d1e14)";
                        badgeTextCol = "#ffffff";
                    }

                    const badgeSize = Math.max(15, Math.round(cardW * 0.24));
                    costBadgeHtml = `
                        <div style="
                            position: absolute;
                            top: 3px;
                            left: 3px;
                            width: ${badgeSize}px;
                            height: ${badgeSize}px;
                            border-radius: 50%;
                            background: ${badgeBg};
                            border: 1.5px solid #fff3c4;
                            color: ${badgeTextCol};
                            font-family: 'Cinzel', serif;
                            font-weight: 900;
                            font-size: ${Math.max(8, Math.round(badgeSize * 0.52))}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.6);
                            pointer-events: none;
                        ">${label}</div>
                    `;
                }

                const fontSizePx = Math.max(5.5, Math.min(10, cardW * 0.096)).toFixed(1);

                nodesHtml.push(`
                    <div class="pyramid-card-node ${animClass}" data-slot-index="${slot.index}" style="
                        position: absolute;
                        left: ${x}px;
                        top: ${y}px;
                        width: ${cardW}px;
                        height: ${cardH}px;
                        transform: translate(-50%, -50%);
                        z-index: ${isSelected ? zIndex + 1 : zIndex};
                        border-radius: 5px;
                        border: ${borderCss};
                        box-shadow: ${boxShadowCss};
                        background: #1c130a;
                        overflow: hidden;
                        cursor: pointer;
                        pointer-events: auto;
                        ${animDelay}
                    ">
                        <img src="${cardUrl}" alt="${card?.name || ""}" style="
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            display: block;
                            ${!isAvail && !isSelected ? "filter: brightness(0.68) sepia(0.18);" : ""}
                        " />
                        <div class="marble-nameplate" style="
                            position: absolute;
                            top: 89.8%;
                            left: 8%;
                            width: 84%;
                            height: 5.5%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${fontSizePx}px;
                            line-height: 1;
                            pointer-events: none;
                            ${!isAvail && !isSelected ? "opacity: 0.78;" : ""}
                        ">
                            ${card?.name || ""}
                        </div>
                        ${costBadgeHtml}
                    </div>
                `);
            }
        }

        slotContainer.innerHTML = `
            <div style="position:relative; width:100%; height:100%; pointer-events:none;">
                ${nodesHtml.join("")}
            </div>
        `;

        slotContainer.querySelectorAll(".pyramid-card-node").forEach(node => {
            node.addEventListener("click", e => {
                e.stopPropagation();
                if (
                    this.isSettingsOpen ||
                    this.expandedCityDrawer !== "none" ||
                    snap.gamePhase !== "AGE_PLAY"
                ) {
                    return;
                }
                const idxAttr = (node as HTMLElement).getAttribute("data-slot-index");
                if (idxAttr === null) return;
                const slotIdx = Number(idxAttr);
                network.playSound("click");
                this.inspectedWonderId = null;
                this.selectedSlotIndex =
                    this.selectedSlotIndex === slotIdx ? null : slotIdx;
                this.renderGameHUD(snap, false);
            });
        });
    }

    /**
     * Renders the Unified Vertical Mobile & Desktop HUD:
     * - Top Bar: Era, Military Track, Progress Tokens, Turn & Menu
     * - On Vertical Mobile (<= 920px):
     *   1. Top Rival Empire Strip (with Rival's 4 Wonders in a 4-column row + coins, VP, resources, buildings pill)
     *   2. Open Center Slot (`#pyramid-viewport-slot`) where the 20-card Pyramid is always visible
     *   3. Non-Blocking Action Dock (when a card or wonder is selected) + My Empire Strip (with My 4 Wonders in a 4-column row + coins, VP, resources, buildings pill)
     * - On Desktop (> 920px):
     *   Left & Right Full Empire Mats + Center Pyramid + Bottom Non-Blocking Action Dock!
     */
    private renderGameHUD(snap: GameStateSnapshot, allowPyramidAnimations: boolean = false) {
        const ui = document.getElementById("ui-layer");
        if (!ui) return;

        const myId = network.sessionId;
        const p1Id = snap.playerOrder[0];
        const p2Id = snap.playerOrder[1];
        const me = snap.players[myId] || snap.players[p1Id];
        const oppId = me?.sessionId === p1Id ? p2Id : p1Id;
        const opp = snap.players[oppId];
        const isMyTurn = snap.currentTurn === myId;
        const activePlayer = snap.players[snap.currentTurn];

        const tokensMiniHtml = snap.availableProgressTokens
            .map(tid => {
                const t = PROGRESS_TOKENS[tid];
                if (!t) return "";
                return `
                    <img class="progress-disc-icon" data-token-id="${tid}" src="${getTokenAssetUrl(tid)}" title="${t.name}: ${t.description}" style="
                        width: 22px; height: 22px; border-radius: 50%;
                        border: 1px solid #6ec892; box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                        cursor: pointer;
                    " />
                `;
            })
            .join("");

        ui.innerHTML = `
            <div style="
                width: 100%;
                height: 100dvh;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                overflow: hidden;
                pointer-events: none;
            ">
                <!-- 1. TOP MILITARY & STATUS HEADER -->
                <div class="interactive stone-bar" style="
                    border-bottom: 1.5px solid #9e733b;
                    padding: 4px 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    flex-shrink: 0;
                ">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="font-serif" style="
                                background: linear-gradient(180deg, #f0c96b, #b58021);
                                color: #211303; font-weight: 900;
                                padding: 2px 8px; border-radius: 5px; font-size: 11px;
                            ">
                                ERA ${snap.currentAge === 1 ? "I" : snap.currentAge === 2 ? "II" : "III"}
                            </span>
                            <span style="font-size:11px; color:#ebd7b2; font-weight:700;">
                                🏛️ <b style="color:#f2c968;">${snap.totalWondersBuilt}/7</b>
                            </span>
                            <div style="display:flex; gap:3px; align-items:center;">
                                ${tokensMiniHtml}
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:6px;">
                            <div class="${isMyTurn ? "turn-active-badge" : ""}" style="
                                padding: 3px 9px; border-radius: 6px;
                                background: ${isMyTurn ? "linear-gradient(180deg, #f2c968, #b88322)" : "rgba(255, 240, 210, 0.1)"};
                                border: 1px solid ${isMyTurn ? "#fff1c2" : "#785a32"};
                                font-family: 'Cinzel', serif; font-weight: 800; font-size: 10.5px;
                                color: ${isMyTurn ? "#211303" : "#d9c29c"}; white-space: nowrap;
                            ">
                                ${isMyTurn ? "TU TURNO" : `TURNO: ${(activePlayer?.name || "RIVAL").slice(0, 9).toUpperCase()}`}
                            </div>
                            ${renderSettingsButtonHTML(snap.roomCode)}
                        </div>
                    </div>

                    <!-- Compact Full-Width Military Track -->
                    <div style="display:flex; justify-content:center; width:100%;">
                        ${this.renderMilitaryTrackHTML(snap)}
                    </div>
                </div>

                <!-- 2. MOBILE TOP RIVAL STRIP (Always shows Rival's 4 Wonders + Stats on Mobile!) -->
                <div class="mobile-only-strip interactive" style="display:none; padding: 3px 6px 0 6px; flex-shrink:0;">
                    ${opp ? this.renderCompactMobileEmpireStripHTML(opp, false, snap) : ""}
                </div>

                <!-- 3. MIDDLE TABLETOP ARENA (Left/Right sidebars on Desktop, Open Pyramid Slot in Center) -->
                <div style="
                    flex: 1;
                    min-height: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: stretch;
                    padding: 4px 8px;
                    pointer-events: none;
                ">
                    <div class="desktop-empire-mat interactive" style="height:100%; flex-shrink:0;">
                        ${me ? this.renderDesktopEmpireMatHTML(me, opp, true, snap) : ""}
                    </div>

                    <!-- Exact measured slot where the Phaser 20-Card Pyramid renders -->
                    <div id="pyramid-viewport-slot" style="
                        flex: 1;
                        height: 100%;
                        min-width: 0;
                        pointer-events: none;
                    "></div>

                    <div class="desktop-empire-mat interactive" style="height:100%; flex-shrink:0;">
                        ${opp ? this.renderDesktopEmpireMatHTML(opp, me, false, snap) : ""}
                    </div>
                </div>

                <!-- 4. NON-BLOCKING SELECTED CARD / WONDER ACTION DOCK (Never covers the pyramid!) -->
                ${this.renderNonBlockingActionDockHTML(snap, me, opp)}

                <!-- 5. MOBILE BOTTOM PLAYER STRIP (Always shows Your 4 Wonders + Stats on Mobile!) -->
                <div class="mobile-only-strip interactive" style="display:none; padding: 0 6px 4px 6px; flex-shrink:0;">
                    ${me ? this.renderCompactMobileEmpireStripHTML(me, true, snap) : ""}
                </div>

                <!-- 6. DESKTOP BOTTOM CHRONICLE BAR -->
                <div class="desktop-chronicle-bar interactive stone-bar" style="
                    border-top: 1.5px solid #9e733b;
                    padding: 4px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: #ebd9b7;
                    flex-shrink: 0;
                ">
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        Crónica: <b style="color:#fff4db;">${snap.logs[snap.logs.length - 1] || "Selecciona cualquier carta de la pirámide."}</b>
                    </div>
                    <div class="font-serif" style="font-size:10.5px; color:#c8a772; white-space:nowrap;">
                        Sala: ${snap.roomCode || "---"} • Cementerio: ${snap.discardedCards.length} cartas
                    </div>
                </div>
            </div>

            <!-- OPTIONAL EXPANDED BUILDINGS / GRAVEYARD DRAWER -->
            ${this.renderExpandedDetailsDrawerHTML(snap, me, opp)}

            <!-- SPECIAL PHASE MODALS (Science Token Pick, Great Library, Mausoleum, Destroy, Starter, Victory) -->
            ${this.renderSpecialPhaseModalHTML(snap, me, opp)}

            <!-- SETTINGS & EXIT MODAL -->
            ${renderSettingsModalHTML(this.isSettingsOpen, this.confirmingLeave, snap)}

            <style>
                @media (max-width: 920px) {
                    .desktop-empire-mat {
                        display: none !important;
                    }
                    .desktop-chronicle-bar {
                        display: none !important;
                    }
                    .mobile-only-strip {
                        display: block !important;
                    }
                }
            </style>
        `;

        this.bindHUDActions(snap, me, opp);
        this.renderPyramidCanvas(snap, allowPyramidAnimations);
    }

    /**
     * Compact Mobile Empire Strip that displays ALL 4 Wonders side-by-side (`repeat(4, 1fr)`)
     * + Coins, VP, Resources, Science, and Buildings count on one compact horizontal mat!
     */
    private renderCompactMobileEmpireStripHTML(
        player: PlayerSnapshot,
        isMe: boolean,
        snap: GameStateSnapshot
    ): string {
        const prod = getFixedProductionClient(player.builtCards);
        const discounts = getDiscountedResourcesClient(player.builtCards);
        const resTypes: ResourceType[] = ["wood", "clay", "stone", "glass", "papyrus"];

        const resMiniHtml = resTypes
            .map(r => {
                const count = prod[r];
                const hasDisc = discounts.has(r);
                return `
                    <span style="
                        display: inline-flex; align-items: center; gap: 2px;
                        background: ${count > 0 ? "rgba(140,98,45,0.22)" : "rgba(140,98,45,0.06)"};
                        border: 1px solid ${hasDisc ? "#b87e1b" : "rgba(140,98,45,0.3)"};
                        border-radius: 10px; padding: 1px 4px 1px 2px;
                        opacity: ${count > 0 || hasDisc ? "1" : "0.5"};
                    ">
                        ${renderResourceMedallion(r, 1, 14)}
                        <b style="font-size:10px; color:#241507;">${count}</b>
                        ${hasDisc ? `<span style="font-size:8px; color:#8c5a20; font-weight:900;">*</span>` : ""}
                    </span>
                `;
            })
            .join("");

        // All 4 Wonders in a 4-column horizontal grid so all 4 are always visible!
        const wonders4ColsHtml = player.wonders
            .map(ws => {
                const w = WONDERS[ws.wonderId];
                if (!w) return "";
                const isInspected = this.inspectedWonderId === ws.wonderId;
                return `
                    <div class="wonder-card-tap" data-wonder-id="${ws.wonderId}" data-owner="${isMe ? "me" : "opp"}" style="
                        position: relative;
                        width: 100%;
                        aspect-ratio: 369 / 240;
                        border-radius: 5px;
                        overflow: hidden;
                        border: ${
                            isInspected
                                ? "2px solid #00f2ff"
                                : ws.isBuilt
                                ? "1.5px solid #1c6b43"
                                : "1.5px solid #8c622d"
                        };
                        background: #1c130a;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.4);
                        cursor: pointer;
                    ">
                        <img src="${getWonderAssetUrl(ws.wonderId)}" style="
                            width: 100%; height: 100%; object-fit: contain; display: block;
                            ${!ws.isBuilt && snap.totalWondersBuilt >= 7 ? "filter:grayscale(0.8) opacity(0.6);" : ""}
                        " />
                        <div class="marble-nameplate" style="
                            position: absolute;
                            top: 87.3%; left: 17.5%; width: 57.5%; height: 7.1%;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 5.5px; line-height: 1;
                        ">
                            ${w.name}
                        </div>
                        ${
                            ws.isBuilt
                                ? `<div style="
                                    position: absolute; top: 2px; right: 2px;
                                    background: #1c6b43; color: #fff; font-weight: 900;
                                    font-size: 7px; padding: 0 3px; border-radius: 3px;
                                    border: 1px solid #7ed9a3;
                                   ">✓</div>`
                                : ""
                        }
                    </div>
                `;
            })
            .join("");

        return `
            <div class="parchment-panel" style="
                border-radius: 9px;
                padding: 4px 7px;
                border: 1.5px solid ${
                    snap.currentTurn === player.sessionId
                        ? "#c88a1e"
                        : isMe
                        ? "#2b6ca3"
                        : "#a63a22"
                };
            ">
                <!-- Row 1: Name, Coins, VP, Resources, Science & Buildings Button -->
                <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; margin-bottom:3px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span class="font-serif" style="font-size:11.5px; font-weight:900; color:${
                            isMe ? "#18456e" : "#872312"
                        };">
                            ${player.name}
                        </span>
                        ${renderCoinBadge(player.coins, 20)}
                        ${renderLaurelVP(player.score, 20)}
                    </div>

                    <div style="display:flex; align-items:center; gap:3px; flex-wrap:wrap;">
                        ${resMiniHtml}
                    </div>

                    <button class="btn-open-city-detail" data-target="${isMe ? "me" : "opp"}" style="
                        background: rgba(140, 98, 45, 0.16);
                        border: 1px solid #8c622d;
                        border-radius: 6px;
                        padding: 2px 6px;
                        font-family: 'Cinzel', serif;
                        font-size: 9.5px;
                        font-weight: 800;
                        color: #241507;
                        cursor: pointer;
                    ">
                        Ciudad (${player.builtCards.length}) • 🔬${new Set(player.scienceSymbols).size}
                    </button>
                </div>

                <!-- Row 2: All 4 Wonders Side-by-Side (4 columns) -->
                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:5px;">
                    ${wonders4ColsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Renders the Non-Blocking Action Dock at the bottom of the screen when a Pyramid Card
     * or a Wonder Card is tapped. The Pyramid remains 100% uncovered and clickable!
     */
    private renderNonBlockingActionDockHTML(
        snap: GameStateSnapshot,
        me: PlayerSnapshot | undefined,
        opp: PlayerSnapshot | undefined
    ): string {
        const myId = network.sessionId;
        const isMyTurn = snap.currentTurn === myId;

        // Case A: A Wonder card was tapped to inspect its details
        if (this.inspectedWonderId && this.selectedSlotIndex === null) {
            const w = WONDERS[this.inspectedWonderId];
            if (!w) return "";
            return `
                <div class="interactive parchment-panel modal-card-anim" style="
                    margin: 0 auto 4px auto;
                    width: calc(100% - 12px);
                    max-width: 580px;
                    border-radius: 10px;
                    padding: 7px 10px;
                    border: 2px solid #b88322;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    flex-shrink: 0;
                    z-index: 60;
                ">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                        <img src="${getWonderAssetUrl(w.id)}" style="width:62px; height:40px; object-fit:contain; border-radius:4px; border:1px solid #8c622d; background:#1c130a; flex-shrink:0;" />
                        <div style="min-width:0; flex:1;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span class="font-serif" style="font-weight:900; font-size:12.5px; color:#241507;">${w.name}</span>
                                ${renderCostMedallionsHTML(w.cost, 0, 15)}
                            </div>
                            <div style="font-size:11px; color:#4a3219; font-weight:600;">
                                ${w.description}
                            </div>
                        </div>
                    </div>
                    <button id="btn-close-dock" style="
                        background: rgba(140,98,45,0.18); border: 1px solid #8c622d;
                        border-radius: 6px; padding: 4px 9px; font-family:'Cinzel',serif;
                        font-weight: 800; font-size: 11px; color: #241507; cursor: pointer;
                    ">✖</button>
                </div>
            `;
        }

        // Case B: A Pyramid Card is selected
        if (this.selectedSlotIndex !== null && me && snap.gamePhase === "AGE_PLAY") {
            const slot = snap.pyramid[this.selectedSlotIndex];
            const card = slot && slot.faceUp ? CARDS_BY_ID[slot.cardId] : undefined;
            if (!slot || !card || slot.removed) return "";

            const isAvail = slot.available;
            const myBuiltWonders = me.wonders.filter(w => w.isBuilt).map(w => w.wonderId);
            const buildPreview = previewCardCostClient(
                card,
                me.coins,
                me.builtCards,
                myBuiltWonders,
                me.progressTokens,
                opp?.builtCards || []
            );

            const yellowCount = me.builtCards.filter(
                cid => CARDS_BY_ID[cid]?.type === "yellow"
            ).length;
            const discardCoins = 2 + yellowCount;
            const cMeta = COLOR_META[card.type];

            const unbuiltWondersBtns = isAvail
                ? me.wonders
                      .filter(w => !w.isBuilt)
                      .map(ws => {
                          const w = WONDERS[ws.wonderId];
                          if (!w) return "";
                          const wPreview = previewWonderCostClient(
                              w,
                              me.coins,
                              me.builtCards,
                              myBuiltWonders,
                              me.progressTokens,
                              opp?.builtCards || []
                          );
                          const canBuildWonder =
                              isMyTurn && wPreview.canAfford && snap.totalWondersBuilt < 7;
                          return `
                            <button class="btn-dock-wonder" data-wonder-id="${ws.wonderId}" ${
                              canBuildWonder ? "" : "disabled"
                          } style="
                                padding: 5px 8px;
                                border-radius: 6px;
                                border: 1.5px solid ${canBuildWonder ? "#8c622d" : "rgba(140,98,45,0.3)"};
                                background: ${canBuildWonder ? "linear-gradient(180deg, #fff8e8, #e6cfa3)" : "rgba(140,98,45,0.08)"};
                                color: ${canBuildWonder ? "#241507" : "#8c7355"};
                                font-family: 'Cinzel', serif;
                                font-weight: 800;
                                font-size: 10.5px;
                                cursor: ${canBuildWonder ? "pointer" : "not-allowed"};
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                white-space: nowrap;
                            ">
                                <span>🏛️ ${w.name.replace(/^El |^La |^Las |^Los /, "")}</span>
                                <span style="color:${canBuildWonder ? "#1c6b43" : "#a63a22"};">
                                    (${snap.totalWondersBuilt >= 7 ? "7/7" : `${wPreview.totalCoins}🪙`})
                                </span>
                            </button>
                          `;
                      })
                      .join("")
                : "";

            return `
                <div class="interactive parchment-panel modal-card-anim" style="
                    margin: 0 auto 4px auto;
                    width: calc(100% - 12px);
                    max-width: 640px;
                    border-radius: 11px;
                    padding: 7px 10px;
                    border: 2px solid ${cMeta.hex};
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex-shrink: 0;
                    z-index: 60;
                ">
                    <!-- Top Row: Card Art Thumbnail + Title + Cost + Full Effect + Close Button -->
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                            <img src="${getCardAssetUrl(card)}" style="
                                width: 36px; height: 55px; object-fit: contain;
                                border-radius: 4px; border: 1px solid #5c3d18;
                                background: #1c130a; flex-shrink: 0;
                            " />
                            <div style="min-width:0; flex:1;">
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                    <span style="
                                        background: ${cMeta.hex}; color: #fff;
                                        font-family: 'Cinzel', serif; font-weight: 800;
                                        font-size: 9.5px; padding: 1px 6px; border-radius: 4px;
                                    ">${cMeta.label}</span>
                                    <span class="font-serif" style="font-weight:900; font-size:13.5px; color:#241507;">
                                        ${card.name}
                                    </span>
                                    ${renderCostMedallionsHTML(card.cost.resources, card.cost.coins, 16)}
                                </div>
                                <div style="font-size:11px; color:#3d2812; font-weight:600; line-height:1.3; margin-top:2px;">
                                    ${describeCardFull(card)}
                                </div>
                            </div>
                        </div>

                        <button id="btn-close-dock" style="
                            background: rgba(140,98,45,0.18); border: 1px solid #8c622d;
                            border-radius: 6px; padding: 4px 9px; font-family:'Cinzel',serif;
                            font-weight: 800; font-size: 12px; color: #241507; cursor: pointer;
                            align-self: flex-start;
                        ">✖</button>
                    </div>

                    <!-- Bottom Row: Action Buttons (or Locked Notice if covered) -->
                    ${
                        !isAvail
                            ? `<div style="
                                padding: 4px 8px; border-radius: 6px;
                                background: rgba(166, 58, 34, 0.14); border: 1px solid #a63a22;
                                color: #7a2312; font-family:'Cinzel',serif; font-weight: 800; font-size: 11px; text-align: center;
                               ">
                                🔒 Carta cubierta por la fila inferior (Toca cualquier otra carta en la pirámide para cambiar)
                               </div>`
                            : `
                            <div style="display:flex; flex-direction:column; gap:5px;">
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                                    <button id="btn-action-build" class="${
                                        isMyTurn && buildPreview.canAfford ? "btn-emerald" : ""
                                    }" ${isMyTurn && buildPreview.canAfford ? "" : "disabled"} style="
                                        padding: 7px 10px; font-size: 11.5px;
                                        ${
                                            !(isMyTurn && buildPreview.canAfford)
                                                ? "background:rgba(140,98,45,0.15); border:1px solid #8c6d46; color:#7d603c; border-radius:7px; cursor:not-allowed; font-family:'Cinzel',serif; font-weight:800;"
                                                : ""
                                        }
                                    ">
                                        Construir (${
                                            buildPreview.isFreeByChain
                                                ? "Cadena Gratis"
                                                : `${buildPreview.totalCoins}🪙`
                                        })
                                    </button>

                                    <button id="btn-action-discard" class="${
                                        isMyTurn ? "btn-imperial-gold" : ""
                                    }" ${isMyTurn ? "" : "disabled"} style="
                                        padding: 7px 10px; font-size: 11.5px;
                                        ${
                                            !isMyTurn
                                                ? "background:rgba(140,98,45,0.15); border:1px solid #8c6d46; color:#7d603c; border-radius:7px; cursor:not-allowed; font-family:'Cinzel',serif; font-weight:800;"
                                                : ""
                                        }
                                    ">
                                        Descartar (+${discardCoins}🪙)
                                    </button>
                                </div>

                                ${
                                    unbuiltWondersBtns
                                        ? `<div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:2px; align-items:center;">
                                            <span class="font-serif" style="font-size:9.5px; font-weight:800; color:#5c4328; white-space:nowrap;">Maravilla:</span>
                                            ${unbuiltWondersBtns}
                                           </div>`
                                        : ""
                                }
                            </div>
                            `
                    }
                </div>
            `;
        }

        return "";
    }

    private renderMilitaryTrackHTML(snap: GameStateSnapshot): string {
        const p1Name = snap.players[snap.playerOrder[0]]?.name || "J1";
        const p2Name = snap.players[snap.playerOrder[1]]?.name || "J2";
        const pawnMoved =
            network.animationsEnabled && snap.militaryPosition !== this.lastMilitaryPos;

        const cells: string[] = [];
        for (let pos = -9; pos <= 9; pos++) {
            const isPawnHere = snap.militaryPosition === pos;
            const isCapital = pos === -9 || pos === 9;

            let bg = "rgba(255, 236, 200, 0.08)";
            let border = "rgba(212, 164, 69, 0.3)";
            if (isPawnHere) {
                bg = "radial-gradient(circle, #ffdf80 0%, #b82918 85%)";
                border = "#fff3c4";
            } else if (isCapital) {
                bg = "rgba(166, 58, 34, 0.45)";
                border = "#e07a5f";
            } else if (pos === 0) {
                bg = "rgba(212, 164, 69, 0.25)";
                border = "#d4a445";
            }

            let lootBadge = "";
            if (pos === -3 && !snap.militaryTokenP1_2CoinsRemoved) {
                lootBadge = `<img src="/assets/loot2.png" title="-2 Monedas" style="width:8px; height:13px; object-fit:contain; opacity:0.85;" />`;
            } else if (pos === -6 && !snap.militaryTokenP1_5CoinsRemoved) {
                lootBadge = `<img src="/assets/loot5.png" title="-5 Monedas" style="width:8px; height:13px; object-fit:contain; opacity:0.85;" />`;
            } else if (pos === 3 && !snap.militaryTokenP2_2CoinsRemoved) {
                lootBadge = `<img src="/assets/loot2.png" title="-2 Monedas" style="width:8px; height:13px; object-fit:contain; opacity:0.85;" />`;
            } else if (pos === 6 && !snap.militaryTokenP2_5CoinsRemoved) {
                lootBadge = `<img src="/assets/loot5.png" title="-5 Monedas" style="width:8px; height:13px; object-fit:contain; opacity:0.85;" />`;
            }

            cells.push(`
                <div title="Posición Militar: ${pos}" style="
                    flex: 1;
                    max-width: 22px;
                    min-width: 11px;
                    height: 19px;
                    border-radius: 8px;
                    background: ${bg};
                    border: 1px solid ${border};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: ${isPawnHere ? "0 0 8px rgba(242, 201, 104, 0.9)" : "none"};
                ">
                    ${
                        isPawnHere
                            ? `<img src="/assets/military_lead.png" class="${pawnMoved ? "pawn-anim" : ""}" style="width:15px; height:15px; object-fit:contain; transform:rotate(90deg); filter:drop-shadow(0 1px 2px #000);" />`
                            : isCapital
                            ? `<span style="font-size:8px; color:#ffd166; font-weight:900;">Ω</span>`
                            : lootBadge
                            ? lootBadge
                            : pos === 0
                            ? `<span style="font-size:7.5px; color:#e6c07b; font-weight:800;">0</span>`
                            : ""
                    }
                </div>
            `);
        }

        return `
            <div style="
                display: flex;
                align-items: center;
                gap: 5px;
                width: 100%;
                max-width: 560px;
                background: linear-gradient(90deg, rgba(28,85,136,0.3), rgba(74,38,18,0.5), rgba(166,58,34,0.3));
                border: 1px solid #8c6635;
                padding: 2px 6px;
                border-radius: 12px;
            ">
                <span class="font-serif" style="font-size:9.5px; color:#9ec8f2; font-weight:800; white-space:nowrap;">${p1Name.slice(0, 8)}</span>
                <div style="display:flex; gap:1px; align-items:center; flex:1;">
                    ${cells.join("")}
                </div>
                <span class="font-serif" style="font-size:9.5px; color:#f2a699; font-weight:800; white-space:nowrap;">${p2Name.slice(0, 8)}</span>
            </div>
        `;
    }

    private renderDesktopEmpireMatHTML(
        player: PlayerSnapshot,
        opponent: PlayerSnapshot | undefined,
        isMe: boolean,
        snap: GameStateSnapshot
    ): string {
        const prod = getFixedProductionClient(player.builtCards);
        const discounts = getDiscountedResourcesClient(player.builtCards);
        const builtWonderIds = player.wonders.filter(w => w.isBuilt).map(w => w.wonderId);
        const choicePools = getChoicePoolsClient(player.builtCards, builtWonderIds);

        const resTypes: ResourceType[] = ["wood", "clay", "stone", "glass", "papyrus"];
        const resMedallionsHtml = resTypes
            .map(r => {
                const count = prod[r];
                const hasDisc = discounts.has(r);
                return `
                    <div title="${RESOURCE_META[r].label}: Produces ${count}${
                    hasDisc ? " (Comercio a 1 moneda)" : ""
                }" style="
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        background: ${count > 0 ? "rgba(140, 98, 45, 0.18)" : "rgba(140, 98, 45, 0.06)"};
                        border: 1px solid ${hasDisc ? "#b87e1b" : "rgba(140, 98, 45, 0.35)"};
                        border-radius: 14px;
                        padding: 2px 6px 2px 3px;
                        opacity: ${count > 0 || hasDisc ? "1" : "0.55"};
                    ">
                        ${renderResourceMedallion(r, 1, 18)}
                        <span class="font-serif" style="font-weight:800; font-size:12px; color:#281a0e;">${count}</span>
                        ${
                            hasDisc
                                ? `<span style="font-size:9px; background:#f0c96b; color:#211303; font-weight:900; padding:0 4px; border-radius:6px; border:1px solid #8c622d;">1</span>`
                                : ""
                        }
                    </div>
                `;
            })
            .join("");

        const ownedTokensHtml =
            player.progressTokens.length === 0
                ? ""
                : `<div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">
                    ${player.progressTokens
                        .map(tid => {
                            const t = PROGRESS_TOKENS[tid];
                            if (!t) return "";
                            return `
                                <div title="${t.name}: ${t.description}" style="
                                    display: inline-flex; align-items: center; gap: 4px;
                                    background: #174d30; color: #ebfff2;
                                    border: 1px solid #6ec892; border-radius: 12px;
                                    padding: 1px 6px 1px 2px; font-size: 9.5px; font-weight: 700;
                                ">
                                    <img src="${getTokenAssetUrl(tid)}" style="width:16px; height:16px; border-radius:50%;" />
                                    <span>${t.name}</span>
                                </div>
                            `;
                        })
                        .join("")}
                   </div>`;

        const colorOrder: CardColor[] = [
            "brown",
            "grey",
            "yellow",
            "red",
            "green",
            "blue",
            "purple",
        ];
        const groupedCardsHtml = colorOrder
            .map(col => {
                const cardsOfCol = player.builtCards
                    .map(id => CARDS_BY_ID[id])
                    .filter((c): c is CardData => Boolean(c && c.type === col));
                if (cardsOfCol.length === 0) return "";
                const cMeta = COLOR_META[col];
                return `
                    <div style="display:flex; flex-wrap:wrap; gap:3px; margin-bottom:4px;">
                        ${cardsOfCol
                            .map(
                                c => `
                            <div title="${c.name} (${cMeta.label}): ${describeCardFull(c)}" style="
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                background: ${cMeta.hex};
                                color: #fff8eb;
                                font-size: 10px;
                                font-weight: 700;
                                padding: 2px 6px 2px 3px;
                                border-radius: 5px;
                                border: 1px solid rgba(255, 240, 200, 0.45);
                                box-shadow: 0 1px 3px rgba(0,0,0,0.35);
                                cursor: help;
                            ">
                                <img src="${getCardAssetUrl(c)}" style="width:14px; height:20px; object-fit:cover; border-radius:2px; border:1px solid rgba(255,255,255,0.5);" />
                                <span>${c.name}</span>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                `;
            })
            .join("");

        const wondersGridHtml = player.wonders
            .map(ws => {
                const w = WONDERS[ws.wonderId];
                if (!w) return "";
                return `
                    <div class="wonder-card-tap" data-wonder-id="${ws.wonderId}" data-owner="${isMe ? "me" : "opp"}" title="${w.name} — ${w.description}" style="
                        position: relative;
                        border-radius: 7px;
                        overflow: hidden;
                        border: 2px solid ${ws.isBuilt ? "#1c6b43" : "#8c622d"};
                        background: #1c130a;
                        box-shadow: 0 3px 7px rgba(0,0,0,0.35);
                        cursor: pointer;
                    ">
                        <div style="position:relative; width:100%; aspect-ratio: 369 / 240;">
                            <img src="${getWonderAssetUrl(ws.wonderId)}" style="
                                width: 100%; height: 100%; object-fit: contain; display: block;
                                ${!ws.isBuilt && snap.totalWondersBuilt >= 7 ? "filter:grayscale(0.8) opacity(0.6);" : ""}
                            " />
                            <div class="marble-nameplate" style="
                                position: absolute;
                                top: 87.3%;
                                left: 17.5%;
                                width: 57.5%;
                                height: 7.1%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 7.5px;
                                line-height: 1;
                            ">
                                ${w.name}
                            </div>
                            ${
                                ws.isBuilt
                                    ? `<div style="
                                        position: absolute; top: 4px; right: 4px;
                                        background: linear-gradient(180deg, #27ae60, #186a3b);
                                        color: #fff; font-family: 'Cinzel', serif; font-weight: 800;
                                        font-size: 8px; padding: 1px 5px; border-radius: 4px;
                                        border: 1px solid #a3e4d7; box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                                       ">CONSTRUIDA</div>`
                                    : ""
                            }
                        </div>
                    </div>
                `;
            })
            .join("");

        return `
            <div class="parchment-panel" style="
                width: 252px;
                height: 100%;
                border-radius: 12px;
                padding: 9px 10px;
                display: flex;
                flex-direction: column;
                gap: 7px;
                overflow-y: auto;
                border: 2px solid ${
                    snap.currentTurn === player.sessionId
                        ? "#c88a1e"
                        : isMe
                        ? "#2b6ca3"
                        : "#a63a22"
                };
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1.5px solid rgba(140, 98, 45, 0.35);
                    padding-bottom: 6px;
                ">
                    <div style="min-width:0;">
                        <div style="font-size:9.5px; font-weight:800; color:${
                            isMe ? "#1c5588" : "#a63a22"
                        }; letter-spacing:0.8px; text-transform:uppercase;">
                            ${isMe ? "Tu Imperio" : "Imperio Rival"}
                        </div>
                        <div class="font-serif" style="font-size:14.5px; font-weight:900; color:#241507; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${player.name}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px;">
                        <div title="Monedas en el Tesoro">
                            ${renderCoinBadge(player.coins, 26)}
                        </div>
                        <div title="Puntos de Victoria actuales">
                            ${renderLaurelVP(player.score, 26)}
                        </div>
                    </div>
                </div>

                <div>
                    <div class="font-serif" style="font-size:9.5px; color:#5c4328; font-weight:800; margin-bottom:4px; letter-spacing:0.5px;">
                        PRODUCCIÓN Y COMERCIO
                    </div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        ${resMedallionsHtml}
                    </div>
                    ${
                        choicePools.length > 0
                            ? `<div style="font-size:10px; color:#6e430c; font-weight:700; margin-top:4px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                                <span>Elección/turno:</span>
                                ${choicePools
                                    .map(
                                        pool =>
                                            `<span style="display:inline-flex; align-items:center; gap:1px; background:rgba(140,98,45,0.15); padding:1px 4px; border-radius:6px; border:1px solid rgba(140,98,45,0.3);">${pool
                                                .map(r => renderResourceMedallion(r, 1, 14))
                                                .join("/")}</span>`
                                    )
                                    .join("")}
                               </div>`
                            : ""
                    }
                </div>

                <div style="
                    background: rgba(140, 98, 45, 0.1);
                    border: 1px solid rgba(140, 98, 45, 0.28);
                    border-radius: 8px;
                    padding: 4px 7px;
                ">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="font-serif" style="font-size:9.5px; color:#5c4328; font-weight:800;">
                            CIENCIA (${new Set(player.scienceSymbols).size}/6)
                        </span>
                        <span style="font-size:11px; font-weight:800; color:#1c6b43;">
                            ${
                                player.scienceSymbols.length === 0
                                    ? `<span style="color:#8c6d46; font-size:10px; font-weight:600;">0 símbolos</span>`
                                    : player.scienceSymbols
                                          .map(s => SCIENCE_META[s]?.label || s)
                                          .join(" • ")
                            }
                        </span>
                    </div>
                    ${ownedTokensHtml}
                </div>

                <div style="flex:1; min-height:44px;">
                    <div class="font-serif" style="font-size:9.5px; color:#5c4328; font-weight:800; margin-bottom:4px; letter-spacing:0.5px;">
                        CIUDAD (${player.builtCards.length} EDIFICIOS)
                    </div>
                    ${
                        groupedCardsHtml ||
                        `<div style="font-size:11px; color:#7d603c; font-style:italic;">Aún sin edificios construidos</div>`
                    }
                </div>

                <div>
                    <div class="font-serif" style="font-size:9.5px; color:#5c4328; font-weight:800; margin-bottom:4px; letter-spacing:0.5px;">
                        MARAVILLAS (${player.wonders.filter(w => w.isBuilt).length}/4)
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        ${wondersGridHtml}
                    </div>
                </div>
            </div>
        `;
    }

    private renderExpandedDetailsDrawerHTML(
        snap: GameStateSnapshot,
        me: PlayerSnapshot | undefined,
        opp: PlayerSnapshot | undefined
    ): string {
        if (this.expandedCityDrawer === "none") return "";

        const targetPlayer = this.expandedCityDrawer === "me" ? me : opp;
        if (!targetPlayer) return "";

        const cardsHtml =
            targetPlayer.builtCards.length === 0
                ? `<div style="font-size:12px; color:#6e5231; font-style:italic;">Aún no ha construido edificios.</div>`
                : targetPlayer.builtCards
                      .map(cid => {
                          const c = CARDS_BY_ID[cid];
                          if (!c) return "";
                          return `
                            <div style="display:flex; align-items:center; gap:8px; background:rgba(140,98,45,0.12); border:1px solid ${COLOR_META[c.type].hex}; padding:5px 8px; border-radius:7px;">
                                <img src="${getCardAssetUrl(c)}" style="width:26px; height:40px; object-fit:cover; border-radius:3px;" />
                                <div>
                                    <div class="font-serif" style="font-weight:800; font-size:12.5px; color:#241507;">${c.name}</div>
                                    <div style="font-size:11px; color:#5c4328;">${describeCardFull(c)}</div>
                                </div>
                            </div>
                          `;
                      })
                      .join("");

        return `
            <div class="interactive modal-backdrop-anim" id="city-detail-backdrop" style="
                position: fixed; inset: 0; background: rgba(15, 8, 2, 0.68);
                z-index: 240; display: flex; align-items: center; justify-content: center; padding: 14px;
            ">
                <div class="parchment-panel modal-card-anim" style="
                    width: 100%; max-width: 460px; max-height: 82dvh; overflow-y: auto;
                    border-radius: 14px; padding: 16px; border: 2px solid #8c622d;
                " onclick="event.stopPropagation()">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(140,98,45,0.35); padding-bottom:8px; margin-bottom:10px;">
                        <span class="font-serif" style="font-weight:900; font-size:15px; color:#241507;">
                            Ciudad de ${targetPlayer.name} (${targetPlayer.builtCards.length} Edificios)
                        </span>
                        <button id="btn-close-city-detail" class="btn-imperial-gold" style="padding:3px 10px; font-size:11.5px;">
                            Cerrar
                        </button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${cardsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    private renderSpecialPhaseModalHTML(
        snap: GameStateSnapshot,
        me: PlayerSnapshot | undefined,
        opp: PlayerSnapshot | undefined
    ): string {
        const myId = network.sessionId;
        const isMyTurn = snap.currentTurn === myId;

        if (snap.gamePhase === "GAME_OVER") {
            const winnerPlayer = snap.players[snap.winner];
            const isWinner = snap.winner === myId;
            const reasonTitle =
                snap.winReason === "MILITARY"
                    ? "SUPREMACÍA MILITAR"
                    : snap.winReason === "SCIENCE"
                    ? "SUPREMACÍA CIENTÍFICA"
                    : "VICTORIA CIVIL POR PUNTOS";

            return `
                <div class="interactive modal-backdrop-anim" style="
                    position: fixed; inset: 0; background: rgba(15, 8, 2, 0.82);
                    display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px;
                ">
                    <div class="parchment-panel modal-card-anim" style="
                        border-radius: 16px; padding: clamp(18px, 3.5vw, 30px);
                        max-width: 520px; width: 100%; text-align: center;
                        border: 3px solid #b88322;
                    ">
                        <div style="border-radius:10px; overflow:hidden; border:1.5px solid #8c622d; margin-bottom:12px; max-height:160px; background:#1c130a;">
                            <img src="/assets/game_over.png" style="width:100%; height:150px; object-fit:cover; display:block;" />
                        </div>
                        <div class="font-serif" style="font-size:12px; color:#8c5a20; font-weight:800; letter-spacing:2px; margin-bottom:4px;">
                            ${reasonTitle}
                        </div>
                        <h2 class="font-serif" style="font-size: clamp(20px, 4vw, 28px); color:#241507; margin-bottom:16px;">
                            ${isWinner ? "¡Has Triunfado en 7 Wonders Duel!" : `Vencedor: ${winnerPlayer?.name || "Rival"}`}
                        </h2>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                            ${Object.values(snap.players)
                                .map(
                                    p => `
                                <div style="
                                    background: ${
                                        p.sessionId === snap.winner
                                            ? "rgba(212, 164, 69, 0.25)"
                                            : "rgba(140, 98, 45, 0.1)"
                                    };
                                    border: 2px solid ${
                                        p.sessionId === snap.winner ? "#b88322" : "rgba(140, 98, 45, 0.4)"
                                    };
                                    border-radius: 10px; padding: 12px;
                                ">
                                    <div class="font-serif" style="font-weight:900; color:#241507; font-size:15px; margin-bottom:6px;">
                                        ${p.name}
                                    </div>
                                    <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:6px;">
                                        ${renderLaurelVP(p.score, 36)}
                                        ${renderCoinBadge(p.coins, 30)}
                                    </div>
                                    <div style="font-size:11px; color:#5c4328; font-weight:700;">
                                        ${p.wonders.filter(w => w.isBuilt).length} Maravillas • ${
                                        new Set(p.scienceSymbols).size
                                    } Ciencia
                                    </div>
                                </div>
                            `
                                )
                                .join("")}
                        </div>

                        <button id="btn-back-lobby" class="btn-imperial-gold" style="
                            padding: 12px 28px; font-size: 14px; width: 100%;
                        ">
                            Volver al Lobby
                        </button>
                    </div>
                </div>
            `;
        }

        if (isMyTurn && snap.gamePhase === "SELECT_PROGRESS_TOKEN") {
            return `
                <div class="interactive modal-backdrop-anim" style="
                    position: fixed; inset: 0; background: rgba(15, 8, 2, 0.78);
                    display: flex; align-items: center; justify-content: center; z-index: 250; padding: 16px;
                ">
                    <div class="parchment-panel modal-card-anim" style="
                        border-radius: 16px; padding: 22px; max-width: 500px; width: 100%; text-align: center;
                    ">
                        <h3 class="font-serif" style="color:#1c6b43; font-size:20px; margin-bottom:4px;">
                            ¡Descubrimiento Científico!
                        </h3>
                        <p style="color:#5c4328; font-size:13px; margin-bottom:14px;">
                            Has reunido dos símbolos idénticos. Elige una Ficha de Progreso:
                        </p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${snap.availableProgressTokens
                                .map(tid => {
                                    const t = PROGRESS_TOKENS[tid];
                                    if (!t) return "";
                                    return `
                                    <button class="btn-pick-progress" data-token-id="${tid}" style="
                                        padding: 10px 12px; border-radius: 10px; border: 1.5px solid #1c6b43;
                                        background: rgba(28, 107, 67, 0.12); color: #241507; cursor: pointer;
                                        display: flex; justify-content: space-between; align-items: center; gap: 10px;
                                    ">
                                        <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                                            <img src="${getTokenAssetUrl(tid)}" style="width:38px; height:38px; border-radius:50%;" />
                                            <div>
                                                <div class="font-serif" style="font-weight:800; font-size:14px; color:#185933;">${t.name}</div>
                                                <div style="font-size:11.5px; color:#4a3219;">${t.description}</div>
                                            </div>
                                        </div>
                                        <span class="btn-emerald" style="padding:5px 10px; font-size:11px;">Elegir</span>
                                    </button>
                                `;
                                })
                                .join("")}
                        </div>
                    </div>
                </div>
            `;
        }

        if (isMyTurn && snap.gamePhase === "LIBRARY_PICK") {
            return `
                <div class="interactive modal-backdrop-anim" style="
                    position: fixed; inset: 0; background: rgba(15, 8, 2, 0.78);
                    display: flex; align-items: center; justify-content: center; z-index: 250; padding: 16px;
                ">
                    <div class="parchment-panel modal-card-anim" style="
                        border-radius: 16px; padding: 22px; max-width: 500px; width: 100%; text-align: center;
                    ">
                        <h3 class="font-serif" style="color:#281a0e; font-size:20px; margin-bottom:4px;">
                            La Gran Biblioteca de Alejandría
                        </h3>
                        <p style="color:#5c4328; font-size:13px; margin-bottom:14px;">
                            Elige 1 de estas 3 Fichas de Progreso reservadas fuera del tablero:
                        </p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${snap.libraryChoices
                                .map(tid => {
                                    const t = PROGRESS_TOKENS[tid];
                                    if (!t) return "";
                                    return `
                                    <button class="btn-pick-library" data-token-id="${tid}" style="
                                        padding: 10px 12px; border-radius: 10px; border: 1.5px solid #8c622d;
                                        background: rgba(140, 98, 45, 0.14); color: #241507; cursor: pointer;
                                        display: flex; justify-content: space-between; align-items: center; gap: 10px;
                                    ">
                                        <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                                            <img src="${getTokenAssetUrl(tid)}" style="width:38px; height:38px; border-radius:50%;" />
                                            <div>
                                                <div class="font-serif" style="font-weight:800; font-size:14px;">${t.name}</div>
                                                <div style="font-size:11.5px; color:#5c4328;">${t.description}</div>
                                            </div>
                                        </div>
                                        <span class="btn-imperial-gold" style="padding:5px 10px; font-size:11px;">Elegir</span>
                                    </button>
                                `;
                                })
                                .join("")}
                        </div>
                    </div>
                </div>
            `;
        }

        if (isMyTurn && snap.gamePhase === "MAUSOLEUM_PICK") {
            return `
                <div class="interactive modal-backdrop-anim" style="
                    position: fixed; inset: 0; background: rgba(15, 8, 2, 0.78);
                    display: flex; align-items: center; justify-content: center; z-index: 250; padding: 16px;
                ">
                    <div class="parchment-panel modal-card-anim" style="
                        border-radius: 16px; padding: 22px; max-width: 540px; max-height: 82dvh; overflow-y: auto; width: 100%; text-align: center;
                    ">
                        <h3 class="font-serif" style="color:#281a0e; font-size:20px; margin-bottom:4px;">
                            El Mausoleo de Halicarnaso
                        </h3>
                        <p style="color:#5c4328; font-size:13px; margin-bottom:14px;">
                            Elige cualquier carta descartada para construirla GRATIS:
                        </p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${snap.discardedCards
                                .map(cid => {
                                    const c = CARDS_BY_ID[cid];
                                    if (!c) return "";
                                    return `
                                    <button class="btn-pick-mausoleum" data-card-id="${cid}" style="
                                        padding: 8px 12px; border-radius: 10px; border: 1.5px solid ${COLOR_META[c.type].hex};
                                        background: rgba(140, 98, 45, 0.12); color: #241507; cursor: pointer;
                                        display: flex; justify-content: space-between; align-items: center; gap: 10px;
                                    ">
                                        <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                                            <img src="${getCardAssetUrl(c)}" style="width:32px; height:48px; object-fit:cover; border-radius:4px; border:1px solid #8c622d;" />
                                            <div>
                                                <div class="font-serif" style="font-weight:800; font-size:14px;">${c.name}</div>
                                                <div style="font-size:11.5px; color:#5c4328;">${describeCardFull(c)}</div>
                                            </div>
                                        </div>
                                        <span class="btn-emerald" style="padding:6px 10px; font-size:11px; white-space:nowrap;">Construir Gratis</span>
                                    </button>
                                `;
                                })
                                .join("")}
                        </div>
                    </div>
                </div>
            `;
        }

        if (isMyTurn && snap.gamePhase === "DESTROY_CARD" && opp) {
            const targetCards = opp.builtCards.filter(
                cid => CARDS_BY_ID[cid]?.type === snap.destroyTargetColor
            );
            return `
                <div class="interactive modal-backdrop-anim" style="
                    position: fixed; inset: 0; background: rgba(15, 8, 2, 0.78);
                    display: flex; align-items: center; justify-content: center; z-index: 250; padding: 16px;
                ">
                    <div class="parchment-panel modal-card-anim" style="
                        border-radius: 16px; padding: 22px; max-width: 480px; width: 100%; text-align: center;
                    ">
                        <h3 class="font-serif" style="color:#a63a22; font-size:20px; margin-bottom:4px;">
                            Sabotaje Imperial
                        </h3>
                        <p style="color:#5c4328; font-size:13px; margin-bottom:14px;">
                            Elige qué edificio de ${opp.name} será destruido:
                        </p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            ${targetCards
                                .map(cid => {
                                    const c = CARDS_BY_ID[cid];
                                    if (!c) return "";
                                    return `
                                    <button class="btn-pick-destroy" data-card-id="${cid}" style="
                                        padding: 8px 12px; border-radius: 10px; border: 1.5px solid #a63a22;
                                        background: rgba(166, 58, 34, 0.12); color: #241507; cursor: pointer;
                                        display: flex; justify-content: space-between; align-items: center;
                                    ">
                                        <div style="display:flex; align-items:center; gap:10px; text-align:left;">
                                            <img src="${getCardAssetUrl(c)}" style="width:32px; height:48px; object-fit:cover; border-radius:4px;" />
                                            <div>
                                                <div class="font-serif" style="font-weight:800; font-size:14px;">${c.name}</div>
                                                <div style="font-size:11.5px; color:#5c4328;">${describeCardFull(c)}</div>
                                            </div>
                                        </div>
                                        <span class="btn-imperial-gold" style="padding:6px 12px; font-size:11px; background:#a63a22; color:#fff;">Destruir</span>
                                    </button>
                                `;
                                })
                                .join("")}
                        </div>
                    </div>
                </div>
            `;
        }

        if (isMyTurn && snap.gamePhase === "CHOOSE_AGE_STARTER") {
            return `
                <div class="interactive modal-backdrop-anim" style="
                    position: fixed; inset: 0; background: rgba(15, 8, 2, 0.78);
                    display: flex; align-items: center; justify-content: center; z-index: 250; padding: 16px;
                ">
                    <div class="parchment-panel modal-card-anim" style="
                        border-radius: 16px; padding: 24px; max-width: 440px; width: 100%; text-align: center;
                    ">
                        <h3 class="font-serif" style="color:#281a0e; font-size:20px; margin-bottom:6px;">
                            Albores de la Era ${snap.currentAge === 2 ? "II" : "III"}
                        </h3>
                        <p style="color:#5c4328; font-size:13px; margin-bottom:18px;">
                            Elige qué gobernante tomará el primer turno de la nueva Era:
                        </p>
                        <div style="display:flex; gap:10px; justify-content:center;">
                            ${Object.values(snap.players)
                                .map(
                                    p => `
                                <button class="btn-pick-starter btn-imperial-gold" data-starter-id="${p.sessionId}" style="
                                    flex: 1; padding: 12px; font-size: 13.5px;
                                ">
                                    Empieza ${p.name}
                                </button>
                            `
                                )
                                .join("")}
                        </div>
                    </div>
                </div>
            `;
        }

        return "";
    }

    private bindHUDActions(
        snap: GameStateSnapshot,
        me: PlayerSnapshot | undefined,
        opp: PlayerSnapshot | undefined
    ) {
        const ui = document.getElementById("ui-layer");
        if (!ui) return;

        // Settings modal events
        document.getElementById("btn-open-settings")?.addEventListener("click", () => {
            network.playSound("click");
            this.isSettingsOpen = true;
            this.confirmingLeave = false;
            this.renderGameHUD(snap);
        });
        document.getElementById("btn-close-settings")?.addEventListener("click", () => {
            this.isSettingsOpen = false;
            this.confirmingLeave = false;
            this.renderGameHUD(snap);
        });
        document.getElementById("settings-modal-backdrop")?.addEventListener("click", () => {
            this.isSettingsOpen = false;
            this.confirmingLeave = false;
            this.renderGameHUD(snap);
        });
        document.getElementById("btn-copy-room-code")?.addEventListener("click", () => {
            if (snap.roomCode) {
                navigator.clipboard?.writeText(snap.roomCode);
                network.showToast(`¡Código ${snap.roomCode} copiado!`, true);
            }
        });
        document.getElementById("btn-toggle-anim")?.addEventListener("click", () => {
            network.setAnimationsEnabled(!network.animationsEnabled);
            this.renderGameHUD(snap);
        });
        document.getElementById("btn-toggle-sound")?.addEventListener("click", () => {
            network.setSoundEnabled(!network.soundEnabled);
            this.renderGameHUD(snap);
        });
        document.getElementById("btn-toggle-fullscreen")?.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {});
            } else {
                document.exitFullscreen?.().catch(() => {});
            }
            setTimeout(() => this.renderGameHUD(snap), 150);
        });
        document.getElementById("btn-request-leave")?.addEventListener("click", () => {
            this.confirmingLeave = true;
            this.renderGameHUD(snap);
        });
        document.getElementById("btn-cancel-leave")?.addEventListener("click", () => {
            this.confirmingLeave = false;
            this.renderGameHUD(snap);
        });
        document.getElementById("btn-confirm-leave")?.addEventListener("click", async () => {
            this.isSettingsOpen = false;
            await network.leaveRoom(true);
            this.scene.start("LobbyScene");
        });

        // City detail drawer buttons
        ui.querySelectorAll(".btn-open-city-detail").forEach(btn => {
            btn.addEventListener("click", () => {
                const target = (btn as HTMLElement).getAttribute("data-target") as "me" | "opp";
                this.expandedCityDrawer = target || "me";
                this.renderGameHUD(snap);
            });
        });
        document.getElementById("btn-close-city-detail")?.addEventListener("click", () => {
            this.expandedCityDrawer = "none";
            this.renderGameHUD(snap);
        });
        document.getElementById("city-detail-backdrop")?.addEventListener("click", () => {
            this.expandedCityDrawer = "none";
            this.renderGameHUD(snap);
        });

        // Progress disc tap on mobile to show tooltip toast
        ui.querySelectorAll(".progress-disc-icon").forEach(disc => {
            disc.addEventListener("click", () => {
                const tid = (disc as HTMLElement).getAttribute("data-token-id");
                const t = tid ? PROGRESS_TOKENS[tid] : undefined;
                if (t) {
                    network.showToast(`${t.name}: ${t.description}`, true);
                }
            });
        });

        // Wonder card tap: if an available pyramid card is currently selected and you tap one of your own unbuilt wonders, build it! Otherwise inspect the wonder in the bottom dock!
        ui.querySelectorAll(".wonder-card-tap").forEach(el => {
            el.addEventListener("click", () => {
                const wid = (el as HTMLElement).getAttribute("data-wonder-id");
                const owner = (el as HTMLElement).getAttribute("data-owner");
                if (!wid) return;

                if (
                    this.selectedSlotIndex !== null &&
                    owner === "me" &&
                    snap.currentTurn === network.sessionId &&
                    snap.gamePhase === "AGE_PLAY"
                ) {
                    const slot = snap.pyramid[this.selectedSlotIndex];
                    const ws = me?.wonders.find(w => w.wonderId === wid);
                    if (slot && slot.available && ws && !ws.isBuilt && snap.totalWondersBuilt < 7) {
                        const idx = this.selectedSlotIndex;
                        this.selectedSlotIndex = null;
                        network.sendTurnAction(idx, "BUILD_WONDER", wid);
                        return;
                    }
                }

                network.playSound("click");
                this.selectedSlotIndex = null;
                this.inspectedWonderId = this.inspectedWonderId === wid ? null : wid;
                this.renderGameHUD(snap, false);
            });
        });

        // Close non-blocking dock
        document.getElementById("btn-close-dock")?.addEventListener("click", () => {
            this.selectedSlotIndex = null;
            this.inspectedWonderId = null;
            this.renderGameHUD(snap, false);
        });

        // Dock card actions
        document.getElementById("btn-action-build")?.addEventListener("click", () => {
            if (this.selectedSlotIndex !== null) {
                const idx = this.selectedSlotIndex;
                this.selectedSlotIndex = null;
                network.sendTurnAction(idx, "BUILD");
            }
        });
        document.getElementById("btn-action-discard")?.addEventListener("click", () => {
            if (this.selectedSlotIndex !== null) {
                const idx = this.selectedSlotIndex;
                this.selectedSlotIndex = null;
                network.sendTurnAction(idx, "DISCARD");
            }
        });
        ui.querySelectorAll(".btn-dock-wonder").forEach(btn => {
            btn.addEventListener("click", () => {
                const wid = (btn as HTMLElement).getAttribute("data-wonder-id");
                if (this.selectedSlotIndex !== null && wid) {
                    const idx = this.selectedSlotIndex;
                    this.selectedSlotIndex = null;
                    network.sendTurnAction(idx, "BUILD_WONDER", wid);
                }
            });
        });

        // Special Phase actions
        ui.querySelectorAll(".btn-pick-progress").forEach(btn => {
            btn.addEventListener("click", () => {
                const tid = (btn as HTMLElement).getAttribute("data-token-id");
                if (tid) network.sendSelectProgressToken(tid);
            });
        });
        ui.querySelectorAll(".btn-pick-library").forEach(btn => {
            btn.addEventListener("click", () => {
                const tid = (btn as HTMLElement).getAttribute("data-token-id");
                if (tid) network.sendSelectLibraryToken(tid);
            });
        });
        ui.querySelectorAll(".btn-pick-mausoleum").forEach(btn => {
            btn.addEventListener("click", () => {
                const cid = (btn as HTMLElement).getAttribute("data-card-id");
                if (cid) network.sendSelectMausoleumCard(cid);
            });
        });
        ui.querySelectorAll(".btn-pick-destroy").forEach(btn => {
            btn.addEventListener("click", () => {
                const cid = (btn as HTMLElement).getAttribute("data-card-id");
                if (cid) network.sendSelectDestroyCard(cid);
            });
        });
        ui.querySelectorAll(".btn-pick-starter").forEach(btn => {
            btn.addEventListener("click", () => {
                const sid = (btn as HTMLElement).getAttribute("data-starter-id");
                if (sid) network.sendChooseAgeStarter(sid);
            });
        });

        document.getElementById("btn-back-lobby")?.addEventListener("click", async () => {
            await network.leaveRoom(false);
            this.scene.start("LobbyScene");
        });
    }
}
