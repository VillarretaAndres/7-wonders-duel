import Phaser from "phaser";
import { formatResourceCost, PROGRESS_TOKENS, WONDERS } from "../data/gameCatalog";
import { GameStateSnapshot, network } from "../network/NetworkService";
import { getTokenAssetUrl, getWonderAssetUrl, renderCostMedallionsHTML } from "../ui/gameIcons";
import { renderSettingsButtonHTML, renderSettingsModalHTML } from "../ui/settingsModal";

export class WonderDraftScene extends Phaser.Scene {
    private unsubscribe?: () => void;
    private bgImage?: Phaser.GameObjects.Image;
    private isSettingsOpen: boolean = false;
    private confirmingLeave: boolean = false;
    private previewWonderId: string | null = null;
    private latestSnap: GameStateSnapshot | null = null;

    constructor() {
        super("WonderDraftScene");
    }

    create() {
        const { width, height } = this.scale;
        this.isSettingsOpen = false;
        this.confirmingLeave = false;
        this.previewWonderId = null;

        if (this.textures.exists("board_bg")) {
            this.bgImage = this.add.image(width / 2, height / 2, "board_bg");
            this.fitBoard(width, height);
        }

        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.fitBoard(gameSize.width, gameSize.height);
        });

        this.unsubscribe = network.onStateUpdate(snap => {
            this.latestSnap = snap;
            if (snap.gamePhase === "WAITING") {
                this.scene.start("LobbyScene");
                return;
            }
            if (snap.gamePhase !== "WONDER_DRAFT") {
                this.scene.start("GameScene");
                return;
            }
            if (
                this.previewWonderId &&
                !snap.draftWonders.includes(this.previewWonderId)
            ) {
                this.previewWonderId = snap.draftWonders[0] || null;
            }
            if (!this.previewWonderId && snap.draftWonders.length > 0) {
                this.previewWonderId = snap.draftWonders[0];
            }
            this.renderDraftUI(snap);
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.unsubscribe) this.unsubscribe();
        });
    }

    private fitBoard(w: number, h: number) {
        if (!this.bgImage) return;
        this.bgImage.setPosition(w / 2, h / 2);
        const scale = Math.max(w / 1509, h / 1024);
        this.bgImage.setScale(scale);
    }

    private renderDraftUI(snap: GameStateSnapshot) {
        const ui = document.getElementById("ui-layer");
        if (!ui) return;

        const myId = network.sessionId;
        const isMyTurn = snap.currentTurn === myId;
        const activePlayer = snap.players[snap.currentTurn];

        const p1Id = snap.playerOrder[0];
        const p2Id = snap.playerOrder[1];
        const me = snap.players[myId] || snap.players[p1Id];
        const oppId = me?.sessionId === p1Id ? p2Id : p1Id;
        const opp = snap.players[oppId];

        const selectedWonder = this.previewWonderId ? WONDERS[this.previewWonderId] : undefined;

        const tokensHtml = snap.availableProgressTokens
            .map(tid => {
                const t = PROGRESS_TOKENS[tid];
                if (!t) return "";
                return `
                    <img src="${getTokenAssetUrl(tid)}" title="${t.name}: ${t.description}" style="
                        width: 22px; height: 22px; border-radius: 50%;
                        border: 1px solid #6ec892; box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                        cursor: help;
                    " />
                `;
            })
            .join("");

        // Helper to render a 4-slot horizontal row of Wonders (for Rival at top & Player at bottom)
        const renderHorizontalWonderSlots = (
            label: string,
            playerName: string,
            accentColor: string,
            wList: { wonderId: string; isBuilt: boolean }[]
        ) => {
            const slots: string[] = [];
            for (let i = 0; i < 4; i++) {
                const ws = wList[i];
                const w = ws ? WONDERS[ws.wonderId] : undefined;
                if (w) {
                    slots.push(`
                        <div class="mini-wonder-slot" data-wonder-id="${w.id}" title="${w.name}: ${w.description}" style="
                            position: relative;
                            width: 100%;
                            aspect-ratio: 369 / 240;
                            border-radius: 6px;
                            overflow: hidden;
                            border: 1.5px solid ${this.previewWonderId === w.id ? "#f2c968" : "#8c622d"};
                            background: #1c130a;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.45);
                            cursor: pointer;
                        ">
                            <img src="${getWonderAssetUrl(w.id)}" style="width:100%; height:100%; object-fit:contain; display:block;" />
                            <div class="marble-nameplate" style="
                                position: absolute;
                                top: 87.3%; left: 17.5%; width: 57.5%; height: 7.1%;
                                display: flex; align-items: center; justify-content: center;
                                font-size: clamp(5.5px, 1.4vw, 8.5px); line-height: 1;
                            ">${w.name}</div>
                        </div>
                    `);
                } else {
                    slots.push(`
                        <div style="
                            width: 100%;
                            aspect-ratio: 369 / 240;
                            border-radius: 6px;
                            border: 1.5px dashed rgba(140, 98, 45, 0.45);
                            background: rgba(40, 26, 14, 0.25);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-family: 'Cinzel', serif;
                            font-size: 10px;
                            color: rgba(244, 230, 204, 0.45);
                            font-weight: 700;
                        ">
                            ${i + 1}
                        </div>
                    `);
                }
            }

            return `
                <div class="interactive parchment-panel" style="
                    border-radius: 10px;
                    padding: 6px 10px;
                    width: 100%;
                    max-width: 780px;
                    margin: 0 auto;
                ">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span class="font-serif" style="font-size:11px; font-weight:900; color:${accentColor}; text-transform:uppercase;">
                            ${label}: ${playerName}
                        </span>
                        <span style="font-size:10.5px; font-weight:700; color:#5c4328;">
                            ${wList.length} / 4 Maravillas
                        </span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
                        ${slots.join("")}
                    </div>
                </div>
            `;
        };

        // Always 2x2 grid for the 4 center Wonders so ALL 4 are visible at once on vertical mobile and desktop!
        const centerSlots: string[] = [];
        for (let i = 0; i < snap.draftWonders.length; i++) {
            const wid = snap.draftWonders[i];
            const w = WONDERS[wid];
            if (!w) continue;
            const isSelected = this.previewWonderId === wid;
            centerSlots.push(`
                <div class="interactive draft-wonder-card" data-wonder-id="${wid}" style="
                    background: linear-gradient(160deg, #f8eedb, #e2c799);
                    border: ${isSelected ? "3px solid #f2c968" : "2px solid #8c622d"};
                    border-radius: 10px;
                    padding: 5px;
                    box-shadow: ${
                        isSelected
                            ? "0 0 16px rgba(242, 201, 104, 0.85), 0 6px 16px rgba(0,0,0,0.6)"
                            : "0 5px 14px rgba(0,0,0,0.5)"
                    };
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    transition: transform 0.14s ease, border-color 0.14s ease;
                ">
                    <div style="
                        position: relative;
                        width: 100%;
                        aspect-ratio: 369 / 240;
                        border-radius: 6px;
                        overflow: hidden;
                        background: #1c130a;
                    ">
                        <img src="${getWonderAssetUrl(wid)}" alt="${w.name}" style="
                            width: 100%; height: 100%; object-fit: contain; display: block;
                        " />
                        <div class="marble-nameplate" style="
                            position: absolute;
                            top: 87.3%; left: 17.5%; width: 57.5%; height: 7.1%;
                            display: flex; align-items: center; justify-content: center;
                            font-size: clamp(7.5px, 2vw, 11.5px); line-height: 1;
                            pointer-events: none;
                        ">
                            ${w.name}
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; padding:0 2px;">
                        <span class="font-serif" style="font-size:clamp(10px, 2.5vw, 12.5px); font-weight:800; color:#241507; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${w.name}
                        </span>
                        <button class="btn-direct-pick ${isMyTurn ? "btn-imperial-gold" : ""}" data-wonder-id="${wid}" style="
                            padding: 3px 9px; font-size: 10.5px; border-radius: 5px; flex-shrink: 0;
                            ${!isMyTurn ? "background:rgba(140,98,45,0.18); border:1px solid #8c6d46; color:#6e5231;" : ""}
                        ">
                            ${isMyTurn ? "Elegir" : "Ver"}
                        </button>
                    </div>
                </div>
            `);
        }

        ui.innerHTML = `
            <div style="
                width: 100%;
                height: 100dvh;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 6px 8px;
                gap: 6px;
                overflow: hidden;
            ">
                <!-- 1. Compact Top Header -->
                <div class="interactive stone-bar" style="
                    border-radius: 9px;
                    border: 1.5px solid #9e733b;
                    padding: 5px 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                ">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="font-serif" style="
                            background: linear-gradient(180deg, #f0c96b, #b58021);
                            color: #211303; font-weight: 900; font-size: 11px;
                            padding: 2px 8px; border-radius: 5px;
                        ">DRAFT ${snap.draftRound}/2</span>
                        <div style="display:flex; gap:3px; align-items:center;">
                            ${tokensHtml}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px;">
                        <div class="${isMyTurn ? "turn-active-badge" : ""}" style="
                            padding: 3px 9px; border-radius: 6px;
                            background: ${isMyTurn ? "linear-gradient(180deg, #f2c968, #b88322)" : "rgba(255,240,210,0.1)"};
                            border: 1px solid ${isMyTurn ? "#fff1c2" : "#785a32"};
                            color: ${isMyTurn ? "#211303" : "#d9c29c"};
                            font-family: 'Cinzel', serif; font-weight: 800; font-size: 11px;
                        ">
                            ${isMyTurn ? "TU TURNO" : `TURNO: ${(activePlayer?.name || "RIVAL").slice(0, 10)}`}
                        </div>
                        ${renderSettingsButtonHTML(snap.roomCode)}
                    </div>
                </div>

                <!-- 2. Rival's 4 Wonder Slots (Top Horizontal Row) -->
                <div style="flex-shrink:0;">
                    ${renderHorizontalWonderSlots("Rival", opp?.name || "Oponente", "#a63a22", opp?.wonders || [])}
                </div>

                <!-- 3. Center 2x2 Grid of the 4 Available Wonders (Always 2 columns so all 4 fit on screen!) -->
                <div style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 0;
                    width: 100%;
                    max-width: 680px;
                    margin: 0 auto;
                    gap: 6px;
                ">
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                        width: 100%;
                        max-height: 100%;
                    ">
                        ${centerSlots.join("")}
                    </div>

                    <!-- Selected Wonder Info & Confirm Bar (Non-blocking!) -->
                    ${
                        selectedWonder
                            ? `
                        <div class="interactive parchment-panel" style="
                            width: 100%;
                            border-radius: 9px;
                            padding: 6px 10px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 8px;
                            border: 1.5px solid #b88322;
                            flex-shrink: 0;
                        ">
                            <div style="min-width:0; flex:1;">
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                    <span class="font-serif" style="font-weight:900; font-size:12.5px; color:#241507;">
                                        ${selectedWonder.name}
                                    </span>
                                    ${renderCostMedallionsHTML(selectedWonder.cost, 0, 16)}
                                </div>
                                <div style="font-size:11px; color:#4a3219; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${selectedWonder.description}
                                </div>
                            </div>
                            ${
                                isMyTurn && snap.draftWonders.includes(selectedWonder.id)
                                    ? `
                                <button id="btn-confirm-draft-wonder" class="btn-imperial-gold" data-wonder-id="${selectedWonder.id}" style="
                                    padding: 7px 14px; font-size: 12px; white-space: nowrap; flex-shrink: 0;
                                ">
                                    Reclamar Maravilla
                                </button>
                            `
                                    : ""
                            }
                        </div>
                    `
                            : ""
                    }
                </div>

                <!-- 4. My 4 Wonder Slots (Bottom Horizontal Row) -->
                <div style="flex-shrink:0;">
                    ${renderHorizontalWonderSlots("Tu Imperio", me?.name || "Tú", "#1c5588", me?.wonders || [])}
                </div>
            </div>

            ${renderSettingsModalHTML(this.isSettingsOpen, this.confirmingLeave, snap)}
        `;

        // Clicking a wonder card previews it; clicking "Elegir" or "Reclamar Maravilla" picks it!
        ui.querySelectorAll(".draft-wonder-card").forEach(cardEl => {
            cardEl.addEventListener("click", e => {
                const wid = (cardEl as HTMLElement).getAttribute("data-wonder-id");
                if (!wid) return;
                const target = e.target as HTMLElement;
                if (target.classList.contains("btn-direct-pick")) {
                    if (isMyTurn) {
                        network.sendDraftWonder(wid);
                    } else {
                        this.previewWonderId = wid;
                        this.renderDraftUI(snap);
                    }
                    return;
                }
                if (this.previewWonderId === wid && isMyTurn) {
                    network.sendDraftWonder(wid);
                } else {
                    network.playSound("click");
                    this.previewWonderId = wid;
                    this.renderDraftUI(snap);
                }
            });
        });

        ui.querySelectorAll(".mini-wonder-slot").forEach(slotEl => {
            slotEl.addEventListener("click", () => {
                const wid = (slotEl as HTMLElement).getAttribute("data-wonder-id");
                if (wid) {
                    network.playSound("click");
                    this.previewWonderId = wid;
                    this.renderDraftUI(snap);
                }
            });
        });

        document.getElementById("btn-confirm-draft-wonder")?.addEventListener("click", () => {
            if (isMyTurn && this.previewWonderId && snap.draftWonders.includes(this.previewWonderId)) {
                network.sendDraftWonder(this.previewWonderId);
            }
        });

        this.bindSettingsEvents(snap);
    }

    private bindSettingsEvents(snap: GameStateSnapshot) {
        document.getElementById("btn-open-settings")?.addEventListener("click", () => {
            network.playSound("click");
            this.isSettingsOpen = true;
            this.confirmingLeave = false;
            this.renderDraftUI(snap);
        });
        document.getElementById("btn-close-settings")?.addEventListener("click", () => {
            this.isSettingsOpen = false;
            this.confirmingLeave = false;
            this.renderDraftUI(snap);
        });
        document.getElementById("settings-modal-backdrop")?.addEventListener("click", () => {
            this.isSettingsOpen = false;
            this.confirmingLeave = false;
            this.renderDraftUI(snap);
        });
        document.getElementById("btn-copy-room-code")?.addEventListener("click", () => {
            if (snap.roomCode) {
                navigator.clipboard?.writeText(snap.roomCode);
                network.showToast(`¡Código ${snap.roomCode} copiado!`, true);
            }
        });
        document.getElementById("btn-toggle-anim")?.addEventListener("click", () => {
            network.setAnimationsEnabled(!network.animationsEnabled);
            this.renderDraftUI(snap);
        });
        document.getElementById("btn-toggle-sound")?.addEventListener("click", () => {
            network.setSoundEnabled(!network.soundEnabled);
            this.renderDraftUI(snap);
        });
        document.getElementById("btn-toggle-fullscreen")?.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {});
            } else {
                document.exitFullscreen?.().catch(() => {});
            }
            setTimeout(() => this.renderDraftUI(snap), 150);
        });
        document.getElementById("btn-request-leave")?.addEventListener("click", () => {
            this.confirmingLeave = true;
            this.renderDraftUI(snap);
        });
        document.getElementById("btn-cancel-leave")?.addEventListener("click", () => {
            this.confirmingLeave = false;
            this.renderDraftUI(snap);
        });
        document.getElementById("btn-confirm-leave")?.addEventListener("click", async () => {
            this.isSettingsOpen = false;
            await network.leaveRoom(true);
            this.scene.start("LobbyScene");
        });
    }
}
