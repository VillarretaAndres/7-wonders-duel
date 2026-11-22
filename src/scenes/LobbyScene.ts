import Phaser from "phaser";
import { GameStateSnapshot, network, PublicRoomSummary } from "../network/NetworkService";

type LobbyViewMode = "home" | "rooms" | "create";

export class LobbyScene extends Phaser.Scene {
    private unsubscribe?: () => void;
    private bgImage?: Phaser.GameObjects.Image;
    private viewMode: LobbyViewMode = "home";
    private publicRooms: PublicRoomSummary[] = [];
    private isLoadingRooms: boolean = false;
    private createIsPublic: boolean = true;
    private passwordPromptRoom: PublicRoomSummary | null = null;

    constructor() {
        super("LobbyScene");
    }

    create() {
        const { width, height } = this.scale;
        this.viewMode = "home";
        this.passwordPromptRoom = null;

        if (this.textures.exists("bg_main")) {
            this.bgImage = this.add.image(width / 2, height / 2, "bg_main");
            this.fitBackground(width, height);
        }

        const vignette = this.add.graphics();
        this.drawVignette(vignette, width, height);

        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.fitBackground(gameSize.width, gameSize.height);
            this.drawVignette(vignette, gameSize.width, gameSize.height);
        });

        this.renderLobbyDOM();

        this.unsubscribe = network.onStateUpdate(snap => {
            this.handleStateChange(snap);
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.unsubscribe) this.unsubscribe();
        });
    }

    private fitBackground(w: number, h: number) {
        if (!this.bgImage) return;
        this.bgImage.setPosition(w / 2, h / 2);
        const scale = Math.max(w / 1536, h / 1024);
        this.bgImage.setScale(scale);
    }

    private drawVignette(gfx: Phaser.GameObjects.Graphics, w: number, h: number) {
        gfx.clear();
        gfx.fillGradientStyle(0x1f1207, 0x1f1207, 0x140b03, 0x140b03, 0.35);
        gfx.fillRect(0, 0, w, h);
    }

    private async loadRoomsList() {
        this.isLoadingRooms = true;
        this.renderLobbyDOM();
        try {
            this.publicRooms = await network.fetchPublicRooms();
        } catch {
            this.publicRooms = [];
        }
        this.isLoadingRooms = false;
        this.renderLobbyDOM();
    }

    private getSavedPlayerName(): string {
        return localStorage.getItem("7wd_player_name") || "César";
    }

    private savePlayerName(val: string): string {
        const clean = val.trim() || "César";
        localStorage.setItem("7wd_player_name", clean);
        return clean;
    }

    private renderLobbyDOM(waitingState?: GameStateSnapshot) {
        const ui = document.getElementById("ui-layer");
        if (!ui) return;

        const isWaitingInRoom = waitingState && waitingState.gamePhase === "WAITING";
        const savedName = this.getSavedPlayerName();

        let bodyContent = "";

        if (isWaitingInRoom) {
            bodyContent = `
                <div style="
                    padding: 18px 16px;
                    border-radius: 12px;
                    background: rgba(140, 98, 45, 0.14);
                    border: 2px solid #8c622d;
                    margin-bottom: 16px;
                ">
                    <div style="font-size:11px; font-weight:800; color:#5c3d18; letter-spacing:1.5px; margin-bottom:6px;">
                        CÓDIGO DE LA SALA
                    </div>
                    <div class="font-serif" style="
                        font-size: 32px;
                        font-weight: 900;
                        color: #241507;
                        letter-spacing: 6px;
                        background: #fff9ed;
                        border: 1.5px solid #b88322;
                        border-radius: 10px;
                        padding: 8px 14px;
                        margin-bottom: 12px;
                        box-shadow: inset 0 2px 6px rgba(0,0,0,0.12);
                    ">
                        ${waitingState.roomCode || "..."}
                    </div>
                    <button id="btn-copy-waiting-code" class="btn-imperial-gold" style="
                        padding: 8px 18px;
                        font-size: 12.5px;
                        margin-bottom: 12px;
                    ">
                        Copiar Código
                    </button>
                    <p style="font-size: 12.5px; color: #5c4328; line-height: 1.45;">
                        Esperando a que el segundo jugador se una a la sala...
                    </p>
                </div>

                <button id="btn-cancel-waiting" style="
                    width: 100%;
                    padding: 11px 18px;
                    border-radius: 8px;
                    border: 1.5px solid #a63a22;
                    background: linear-gradient(180deg, #b83b24, #872312);
                    color: #fff6e5;
                    font-family: 'Cinzel', serif;
                    font-weight: 800;
                    font-size: 13px;
                    cursor: pointer;
                ">
                    Cancelar y Salir de la Sala
                </button>
            `;
        } else if (this.viewMode === "home") {
            bodyContent = `
                <div style="text-align:left; margin-bottom: 20px;">
                    <label class="font-serif" style="display:block; font-size:11.5px; color:#5c3d18; margin-bottom:6px; font-weight:800; letter-spacing:1px;">
                        NOMBRE DEL GOBERNANTE
                    </label>
                    <input id="player-name-input" type="text" value="${savedName}" maxlength="18" placeholder="Tu nombre..." style="
                        width: 100%;
                        padding: 11px 14px;
                        border-radius: 8px;
                        border: 1.5px solid #a17942;
                        background: #fff9ed;
                        color: #241507;
                        font-family: 'Cinzel', serif;
                        font-size: 15px;
                        font-weight: 700;
                        outline: none;
                        box-shadow: inset 0 2px 5px rgba(74, 50, 25, 0.14);
                    " />
                </div>

                <div style="display:flex; flex-direction:column; gap:12px;">
                    <button id="btn-open-rooms-browser" class="btn-imperial-gold" style="
                        width: 100%;
                        padding: 14px 18px;
                        font-size: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <img src="/assets/tokens/urbanism.png" style="width:24px; height:24px; border-radius:50%;" />
                        <span>Salas</span>
                    </button>

                    <button id="btn-open-create-room" class="btn-lapis" style="
                        width: 100%;
                        padding: 13px 18px;
                        font-size: 14.5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <img src="/assets/victorypoints.png" style="width:20px; height:20px;" />
                        <span>Crear Sala</span>
                    </button>
                </div>
            `;
        } else if (this.viewMode === "create") {
            bodyContent = `
                <div style="text-align:left; display:flex; flex-direction:column; gap:13px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(140,98,45,0.35); padding-bottom:8px;">
                        <span class="font-serif" style="font-size:15px; font-weight:900; color:#241507;">Configurar Nueva Sala</span>
                        <button id="btn-back-home" style="
                            background: rgba(140,98,45,0.15); border: 1px solid #8c622d;
                            border-radius: 6px; padding: 3px 10px; font-family:'Cinzel',serif;
                            font-weight: 800; font-size: 11.5px; color: #281a0e; cursor: pointer;
                        ">Volver</button>
                    </div>

                    <!-- Room Name -->
                    <div>
                        <label class="font-serif" style="display:block; font-size:11px; color:#5c3d18; margin-bottom:4px; font-weight:800;">
                            NOMBRE DE LA SALA
                        </label>
                        <input id="create-room-name" type="text" maxlength="26" value="Sala de ${savedName}" style="
                            width: 100%; padding: 9px 12px; border-radius: 7px;
                            border: 1.5px solid #a17942; background: #fff9ed; color: #241507;
                            font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; font-weight: 700; outline: none;
                        " />
                    </div>

                    <!-- Visibility Toggle: Pública vs Solo por Código -->
                    <div>
                        <label class="font-serif" style="display:block; font-size:11px; color:#5c3d18; margin-bottom:5px; font-weight:800;">
                            VISIBILIDAD DE LA SALA
                        </label>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <button id="btn-vis-public" type="button" class="${this.createIsPublic ? "btn-emerald" : ""}" style="
                                padding: 9px 8px; font-size: 12px; border-radius: 7px; font-family:'Cinzel',serif; font-weight:800; cursor:pointer;
                                ${!this.createIsPublic ? "background:rgba(140,98,45,0.12); border:1.5px solid #8c622d; color:#5c4328;" : ""}
                            ">
                                Pública (En Lista)
                            </button>
                            <button id="btn-vis-private" type="button" class="${!this.createIsPublic ? "btn-emerald" : ""}" style="
                                padding: 9px 8px; font-size: 12px; border-radius: 7px; font-family:'Cinzel',serif; font-weight:800; cursor:pointer;
                                ${this.createIsPublic ? "background:rgba(140,98,45,0.12); border:1.5px solid #8c622d; color:#5c4328;" : ""}
                            ">
                                Privada (Solo Código)
                            </button>
                        </div>
                        <div style="font-size:11px; color:#5c4328; margin-top:4px;">
                            ${
                                this.createIsPublic
                                    ? "Aparecerá en la lista de Salas para que otros jugadores la vean."
                                    : "Oculta de la lista pública; solo podrán entrar quienes tengan el código."
                            }
                        </div>
                    </div>

                    <!-- Optional Password -->
                    <div>
                        <label class="font-serif" style="display:block; font-size:11px; color:#5c3d18; margin-bottom:4px; font-weight:800;">
                            CONTRASEÑA (OPCIONAL)
                        </label>
                        <input id="create-room-password" type="password" maxlength="20" placeholder="Déjalo vacío para acceso libre" style="
                            width: 100%; padding: 9px 12px; border-radius: 7px;
                            border: 1.5px solid #a17942; background: #fff9ed; color: #241507;
                            font-size: 13.5px; font-weight: 600; outline: none;
                        " />
                    </div>

                    <button id="btn-confirm-create-room" class="btn-imperial-gold" style="
                        width: 100%; padding: 12px 16px; font-size: 14px; margin-top: 4px;
                    ">
                        Crear Sala Ahora
                    </button>
                </div>
            `;
        } else if (this.viewMode === "rooms") {
            const roomsListHtml = this.isLoadingRooms
                ? `<div style="padding:24px 10px; font-size:13px; color:#5c4328; font-style:italic;">Buscando salas activas...</div>`
                : this.publicRooms.length === 0
                ? `<div style="padding:22px 12px; font-size:12.5px; color:#5c4328; background:rgba(140,98,45,0.08); border:1px dashed #8c622d; border-radius:8px;">
                    No hay salas públicas en espera en este momento.<br/>Puedes crear una o unirte directamente con un código arriba.
                   </div>`
                : this.publicRooms
                      .map(
                          r => `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 10px;
                            background: #fff9ed;
                            border: 1.5px solid #a17942;
                            border-radius: 9px;
                            padding: 9px 12px;
                            text-align: left;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                        ">
                            <div style="min-width:0; flex:1;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span class="font-serif" style="font-weight:800; font-size:13.5px; color:#241507; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                        ${r.roomName}
                                    </span>
                                    ${
                                        r.hasPassword
                                            ? `<span style="font-size:10px; background:#a63a22; color:#fff; padding:1px 6px; border-radius:4px; font-weight:700;">Con Clave</span>`
                                            : `<span style="font-size:10px; background:#1c6b43; color:#fff; padding:1px 6px; border-radius:4px; font-weight:700;">Abierta</span>`
                                    }
                                </div>
                                <div style="font-size:11px; color:#5c4328; margin-top:2px;">
                                    Anfitrión: <b>${r.hostName}</b> • Código: <b>${r.roomCode}</b>
                                </div>
                            </div>
                            <button class="btn-join-listed-room btn-imperial-gold" data-room-id="${r.roomId}" style="
                                padding: 7px 14px; font-size: 12px; white-space: nowrap;
                            ">
                                Entrar
                            </button>
                        </div>
                    `
                      )
                      .join("");

            bodyContent = `
                <div style="text-align:left; display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(140,98,45,0.35); padding-bottom:8px;">
                        <span class="font-serif" style="font-size:15px; font-weight:900; color:#241507;">Salas</span>
                        <div style="display:flex; gap:6px;">
                            <button id="btn-refresh-rooms" style="
                                background: rgba(28,85,136,0.12); border: 1px solid #2b6ca3;
                                border-radius: 6px; padding: 3px 10px; font-family:'Cinzel',serif;
                                font-weight: 800; font-size: 11px; color: #18456e; cursor: pointer;
                            ">Actualizar</button>
                            <button id="btn-back-home" style="
                                background: rgba(140,98,45,0.15); border: 1px solid #8c622d;
                                border-radius: 6px; padding: 3px 10px; font-family:'Cinzel',serif;
                                font-weight: 800; font-size: 11px; color: #281a0e; cursor: pointer;
                            ">Volver</button>
                        </div>
                    </div>

                    <!-- Direct Code Join Bar -->
                    <div style="
                        background: rgba(28, 85, 136, 0.08);
                        border: 1.5px solid rgba(28, 85, 136, 0.35);
                        border-radius: 9px;
                        padding: 10px;
                    ">
                        <div class="font-serif" style="font-size:10.5px; font-weight:800; color:#1c5588; margin-bottom:6px; letter-spacing:0.6px;">
                            ENTRAR POR CÓDIGO DE SALA
                        </div>
                        <div style="display:flex; gap:8px;">
                            <input id="room-code-input" type="text" maxlength="8" placeholder="CÓDIGO" style="
                                flex: 1; min-width: 0; padding: 8px 10px; border-radius: 7px;
                                border: 1.5px solid #5a89b8; background: #fff9ed; color: #18456e;
                                font-family: 'Cinzel', serif; font-size: 15px; font-weight: 900;
                                letter-spacing: 2px; text-transform: uppercase; text-align: center; outline: none;
                            " />
                            <button id="btn-join-code" class="btn-lapis" style="padding: 8px 16px; font-size: 12.5px;">
                                Unirse
                            </button>
                        </div>
                    </div>

                    <!-- Public Rooms List -->
                    <div>
                        <div class="font-serif" style="font-size:10.5px; font-weight:800; color:#5c3d18; margin-bottom:6px; letter-spacing:0.6px;">
                            SALAS PÚBLICAS DISPONIBLES (${this.publicRooms.length})
                        </div>
                        <div style="display:flex; flex-direction:column; gap:7px; max-height:210px; overflow-y:auto; padding-right:2px;">
                            ${roomsListHtml}
                        </div>
                    </div>
                </div>
            `;
        }

        // Password Prompt Modal if joining a password-protected room
        const passwordModalHtml = this.passwordPromptRoom
            ? `
            <div class="interactive modal-backdrop-anim" id="pwd-modal-backdrop" style="
                position: fixed; inset: 0; background: rgba(15, 8, 2, 0.72);
                display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px;
            ">
                <div class="parchment-panel modal-card-anim" style="
                    border-radius: 14px; padding: 20px 22px; max-width: 380px; width: 100%;
                    border: 2.5px solid #8c622d; text-align: center;
                " onclick="event.stopPropagation()">
                    <h3 class="font-serif" style="font-size:17px; color:#241507; margin-bottom:4px;">
                        Sala Protegida con Contraseña
                    </h3>
                    <p style="font-size:12px; color:#5c4328; margin-bottom:12px;">
                        Introduce la contraseña para entrar a <b>${this.passwordPromptRoom.roomName}</b>:
                    </p>
                    <input id="join-password-input" type="password" maxlength="20" placeholder="Contraseña..." style="
                        width: 100%; padding: 10px 12px; border-radius: 8px;
                        border: 1.5px solid #a17942; background: #fff9ed; color: #241507;
                        font-size: 14px; font-weight: 700; outline: none; margin-bottom: 12px; text-align: center;
                    " />
                    <div style="display:flex; gap:8px;">
                        <button id="btn-cancel-pwd" style="
                            flex:1; padding:9px; border-radius:8px; border:1px solid #8c622d;
                            background:rgba(140,98,45,0.15); color:#281a0e; font-family:'Cinzel',serif; font-weight:800; cursor:pointer;
                        ">Cancelar</button>
                        <button id="btn-submit-pwd" class="btn-imperial-gold" style="flex:1; padding:9px; font-size:12.5px;">
                            Entrar
                        </button>
                    </div>
                </div>
            </div>
        `
            : "";

        ui.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                padding: 16px;
            ">
                <div class="interactive parchment-panel modal-card-anim" style="
                    border-radius: 16px;
                    padding: clamp(18px, 3.2vw, 28px);
                    max-width: 480px;
                    width: 100%;
                    text-align: center;
                    position: relative;
                ">
                    <div style="
                        border: 1px solid rgba(140, 98, 45, 0.45);
                        border-radius: 11px;
                        padding: clamp(16px, 2.5vw, 22px);
                        background: radial-gradient(circle at 50% 0%, rgba(255, 250, 238, 0.65), transparent 75%);
                    ">
                        <!-- Authentic Game Relics Header -->
                        <div style="display:flex; justify-content:center; align-items:center; gap:14px; margin-bottom:8px;">
                            <img src="/assets/3coin.png" alt="Moneda 3" style="width:36px; height:36px; object-fit:contain; filter:drop-shadow(0 3px 5px rgba(40,22,5,0.45));" />
                            <img src="/assets/tokens/philosophy.png" alt="Filosofía" style="width:44px; height:44px; object-fit:contain; filter:drop-shadow(0 4px 6px rgba(40,22,5,0.5));" />
                            <img src="/assets/6coin.png" alt="Moneda 6" style="width:38px; height:38px; object-fit:contain; filter:drop-shadow(0 3px 5px rgba(40,22,5,0.45));" />
                        </div>

                        <h1 class="font-serif" style="
                            font-size: clamp(22px, 4.5vw, 30px);
                            color: #2b1908;
                            letter-spacing: 2px;
                            margin-bottom: 4px;
                            text-shadow: 0 1px 0 rgba(255,255,255,0.7);
                        ">
                            7 WONDERS DUEL
                        </h1>
                        <div style="
                            width: 120px;
                            height: 2px;
                            background: linear-gradient(90deg, transparent, #8c622d, transparent);
                            margin: 6px auto 16px auto;
                        "></div>

                        ${bodyContent}
                    </div>
                </div>
            </div>
            ${passwordModalHtml}
        `;

        this.bindLobbyEvents(waitingState);
    }

    private bindLobbyEvents(waitingState?: GameStateSnapshot) {
        const ui = document.getElementById("ui-layer");
        if (!ui) return;

        const nameInput = document.getElementById("player-name-input") as HTMLInputElement | null;
        nameInput?.addEventListener("input", () => {
            this.savePlayerName(nameInput.value);
        });

        // Home navigation buttons
        document.getElementById("btn-open-rooms-browser")?.addEventListener("click", () => {
            if (nameInput) this.savePlayerName(nameInput.value);
            network.playSound("click");
            this.viewMode = "rooms";
            this.loadRoomsList();
        });

        document.getElementById("btn-open-create-room")?.addEventListener("click", () => {
            if (nameInput) this.savePlayerName(nameInput.value);
            network.playSound("click");
            this.viewMode = "create";
            this.renderLobbyDOM();
        });

        document.getElementById("btn-back-home")?.addEventListener("click", () => {
            network.playSound("click");
            this.viewMode = "home";
            this.renderLobbyDOM();
        });

        document.getElementById("btn-refresh-rooms")?.addEventListener("click", () => {
            network.playSound("click");
            this.loadRoomsList();
        });

        // Create Room View events
        document.getElementById("btn-vis-public")?.addEventListener("click", () => {
            this.createIsPublic = true;
            this.renderLobbyDOM();
        });
        document.getElementById("btn-vis-private")?.addEventListener("click", () => {
            this.createIsPublic = false;
            this.renderLobbyDOM();
        });
        document.getElementById("btn-confirm-create-room")?.addEventListener("click", async () => {
            const roomNameEl = document.getElementById("create-room-name") as HTMLInputElement | null;
            const pwdEl = document.getElementById("create-room-password") as HTMLInputElement | null;
            try {
                await network.createConfiguredRoom({
                    playerName: this.getSavedPlayerName(),
                    roomName: roomNameEl?.value?.trim(),
                    isPublic: this.createIsPublic,
                    password: pwdEl?.value?.trim() || "",
                });
            } catch (e: any) {
                network.showToast("Error al crear la sala: " + (e?.message || ""));
            }
        });

        // Join by Code in Rooms Browser
        const codeInput = document.getElementById("room-code-input") as HTMLInputElement | null;
        const handleCodeLookupAndJoin = async () => {
            const code = codeInput?.value?.trim() || "";
            if (!code) {
                network.showToast("Escribe el código de la sala.");
                return;
            }
            try {
                const roomSummary = await network.lookupRoomByCode(code);
                if (roomSummary.hasPassword) {
                    this.passwordPromptRoom = roomSummary;
                    this.renderLobbyDOM();
                } else {
                    await network.joinRoomById(roomSummary.roomId, this.getSavedPlayerName());
                }
            } catch (e: any) {
                network.showToast(e?.message || "No se encontró la sala.");
            }
        };
        document.getElementById("btn-join-code")?.addEventListener("click", handleCodeLookupAndJoin);
        codeInput?.addEventListener("keydown", e => {
            if (e.key === "Enter") handleCodeLookupAndJoin();
        });

        // Join a public room from the list
        ui.querySelectorAll(".btn-join-listed-room").forEach(btn => {
            btn.addEventListener("click", async () => {
                const rid = (btn as HTMLElement).getAttribute("data-room-id");
                const roomSummary = this.publicRooms.find(r => r.roomId === rid);
                if (!roomSummary) return;

                if (roomSummary.hasPassword) {
                    this.passwordPromptRoom = roomSummary;
                    this.renderLobbyDOM();
                } else {
                    try {
                        await network.joinRoomById(roomSummary.roomId, this.getSavedPlayerName());
                    } catch (e: any) {
                        network.showToast(e?.message || "No se pudo entrar a la sala.");
                        this.loadRoomsList();
                    }
                }
            });
        });

        // Password modal events
        const pwdInput = document.getElementById("join-password-input") as HTMLInputElement | null;
        pwdInput?.focus();

        const submitPwdJoin = async () => {
            if (!this.passwordPromptRoom) return;
            const pwd = pwdInput?.value || "";
            const targetRoom = this.passwordPromptRoom;
            try {
                this.passwordPromptRoom = null;
                await network.joinRoomById(targetRoom.roomId, this.getSavedPlayerName(), pwd);
            } catch (e: any) {
                network.showToast(e?.message || "Contraseña incorrecta.");
                this.renderLobbyDOM();
            }
        };

        document.getElementById("btn-submit-pwd")?.addEventListener("click", submitPwdJoin);
        pwdInput?.addEventListener("keydown", e => {
            if (e.key === "Enter") submitPwdJoin();
        });
        document.getElementById("btn-cancel-pwd")?.addEventListener("click", () => {
            this.passwordPromptRoom = null;
            this.renderLobbyDOM();
        });
        document.getElementById("pwd-modal-backdrop")?.addEventListener("click", () => {
            this.passwordPromptRoom = null;
            this.renderLobbyDOM();
        });

        // Waiting Room actions
        document.getElementById("btn-copy-waiting-code")?.addEventListener("click", () => {
            if (waitingState?.roomCode) {
                navigator.clipboard?.writeText(waitingState.roomCode);
                network.showToast(`¡Código ${waitingState.roomCode} copiado!`, true);
            }
        });
        document.getElementById("btn-cancel-waiting")?.addEventListener("click", async () => {
            await network.leaveRoom(false);
            this.viewMode = "home";
            this.renderLobbyDOM();
        });
    }

    private handleStateChange(snap: GameStateSnapshot) {
        if (snap.gamePhase === "WAITING") {
            this.renderLobbyDOM(snap);
        } else if (snap.gamePhase === "WONDER_DRAFT") {
            this.scene.start("WonderDraftScene");
        } else {
            this.scene.start("GameScene");
        }
    }
}
