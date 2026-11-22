import { GameStateSnapshot, network } from "../network/NetworkService";

export function renderSettingsButtonHTML(roomCode?: string): string {
    return `
        <button id="btn-open-settings" title="Configuración, Código de Sala y Salir" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 7px;
            background: rgba(255, 240, 210, 0.12);
            border: 1.5px solid #9e733b;
            color: #f4e6cc;
            font-family: 'Cinzel', serif;
            font-weight: 800;
            font-size: 11.5px;
            cursor: pointer;
            transition: filter 0.15s ease, transform 0.15s ease;
        ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f2c968" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Menú${roomCode ? ` • ${roomCode}` : ""}</span>
        </button>
    `;
}

export function renderSettingsModalHTML(
    isOpen: boolean,
    confirmingLeave: boolean,
    snap: GameStateSnapshot
): string {
    if (!isOpen) return "";

    return `
        <div class="interactive modal-backdrop-anim" id="settings-modal-backdrop" style="
            position: fixed;
            inset: 0;
            background: rgba(15, 8, 2, 0.76);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 350;
            padding: 16px;
        ">
            <div class="parchment-panel modal-card-anim" style="
                border-radius: 16px;
                padding: clamp(18px, 3vw, 26px);
                max-width: 430px;
                width: 100%;
                border: 2.5px solid #8c622d;
            " onclick="event.stopPropagation()">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid rgba(140,98,45,0.35); padding-bottom:10px; margin-bottom:14px;">
                    <h3 class="font-serif" style="font-size:18px; color:#241507;">
                        Configuración y Sala
                    </h3>
                    <button id="btn-close-settings" style="
                        background: rgba(140,98,45,0.15);
                        border: 1px solid #8c622d;
                        border-radius: 6px;
                        padding: 3px 10px;
                        font-family: 'Cinzel', serif;
                        font-weight: 800;
                        font-size: 12px;
                        color: #281a0e;
                        cursor: pointer;
                    ">Cerrar</button>
                </div>

                <!-- Room Code Display & Copy -->
                <div style="
                    background: rgba(140, 98, 45, 0.14);
                    border: 1.5px solid #8c622d;
                    border-radius: 10px;
                    padding: 10px 14px;
                    margin-bottom: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <div style="font-size:10px; font-weight:800; color:#5c4328; letter-spacing:1px;">CÓDIGO DE LA SALA</div>
                        <div class="font-serif" style="font-size:20px; font-weight:900; color:#241507; letter-spacing:2px;">
                            ${snap.roomCode || "---"}
                        </div>
                    </div>
                    <button id="btn-copy-room-code" class="btn-imperial-gold" style="padding:6px 12px; font-size:11.5px;">
                        Copiar Código
                    </button>
                </div>

                <!-- Toggles: Animations, Sound, Fullscreen -->
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:18px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.45); padding:9px 12px; border-radius:8px; border:1px solid rgba(140,98,45,0.3);">
                        <div>
                            <div class="font-serif" style="font-weight:800; font-size:13px; color:#241507;">Animaciones del Tablero</div>
                            <div style="font-size:11px; color:#5c4328;">Volteo 3D de cartas, reparto y transiciones</div>
                        </div>
                        <button id="btn-toggle-anim" class="${network.animationsEnabled ? "btn-emerald" : "btn-imperial-gold"}" style="padding:5px 12px; font-size:11.5px;">
                            ${network.animationsEnabled ? "Activadas" : "Desactivadas"}
                        </button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.45); padding:9px 12px; border-radius:8px; border:1px solid rgba(140,98,45,0.3);">
                        <div>
                            <div class="font-serif" style="font-weight:800; font-size:13px; color:#241507;">Efectos de Sonido</div>
                            <div style="font-size:11px; color:#5c4328;">Sonidos al voltear cartas, monedas y construir</div>
                        </div>
                        <button id="btn-toggle-sound" class="${network.soundEnabled ? "btn-emerald" : "btn-imperial-gold"}" style="padding:5px 12px; font-size:11.5px;">
                            ${network.soundEnabled ? "Activados" : "Desactivados"}
                        </button>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.45); padding:9px 12px; border-radius:8px; border:1px solid rgba(140,98,45,0.3);">
                        <div>
                            <div class="font-serif" style="font-weight:800; font-size:13px; color:#241507;">Pantalla Completa</div>
                            <div style="font-size:11px; color:#5c4328;">Ideal para jugar en celular o tablet</div>
                        </div>
                        <button id="btn-toggle-fullscreen" class="btn-lapis" style="padding:5px 12px; font-size:11.5px;">
                            ${document.fullscreenElement ? "Salir" : "Activar"}
                        </button>
                    </div>
                </div>

                <!-- Leave / Forfeit Match Section -->
                <div style="border-top: 1.5px solid rgba(140,98,45,0.35); padding-top: 14px;">
                    ${
                        !confirmingLeave
                            ? `
                        <button id="btn-request-leave" style="
                            width: 100%;
                            padding: 11px;
                            border-radius: 8px;
                            border: 1.5px solid #a63a22;
                            background: linear-gradient(180deg, #b83b24, #872312);
                            color: #fff6e5;
                            font-family: 'Cinzel', serif;
                            font-weight: 800;
                            font-size: 13px;
                            cursor: pointer;
                            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                        ">
                            Abandonar Partida y Salir al Lobby
                        </button>
                    `
                            : `
                        <div style="background:rgba(166,58,34,0.14); border:1.5px solid #a63a22; border-radius:10px; padding:12px; text-align:center;">
                            <div class="font-serif" style="font-weight:800; font-size:13px; color:#7a1f0e; margin-bottom:8px;">
                                ¿Seguro que deseas abandonar la partida actual?
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button id="btn-cancel-leave" class="btn-imperial-gold" style="flex:1; padding:8px; font-size:12px;">
                                    Seguir Jugando
                                </button>
                                <button id="btn-confirm-leave" style="
                                    flex:1; padding:8px; font-size:12px; border-radius:8px;
                                    border:1.5px solid #a63a22; background:#9e2a1b; color:#fff;
                                    font-family:'Cinzel',serif; font-weight:800; cursor:pointer;
                                ">
                                    Sí, Salir
                                </button>
                            </div>
                        </div>
                    `
                    }
                </div>
            </div>
        </div>
    `;
}
