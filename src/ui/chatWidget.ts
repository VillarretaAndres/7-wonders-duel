import { ChatMessageSnapshot, GameStateSnapshot, network } from "../network/NetworkService";

class ChatWidgetManager {
    private isOpen: boolean = false;
    private unreadCount: number = 0;
    private lastKnownCount: number = 0;
    private activeRoomId: string = "";
    private initialized: boolean = false;
    private previewText: string = "";
    private previewTimeout: ReturnType<typeof setTimeout> | null = null;

    public init() {
        if (this.initialized) return;
        this.initialized = true;

        network.onStateUpdate(snap => {
            this.onStateUpdate(snap);
        });
    }

    private onStateUpdate(snap: GameStateSnapshot) {
        const currentRoomId = network.room?.roomId || "";
        if (currentRoomId !== this.activeRoomId) {
            this.activeRoomId = currentRoomId;
            this.lastKnownCount = snap.chatMessages.length;
            this.unreadCount = 0;
            this.isOpen = false;
            this.previewText = "";
        }

        const isActiveMatch =
            Boolean(network.room) &&
            snap.gamePhase !== "WAITING";

        const container = document.getElementById("chat-layer");
        if (!container) return;

        if (!isActiveMatch) {
            container.innerHTML = "";
            return;
        }

        // Check for newly arrived messages
        if (snap.chatMessages.length > this.lastKnownCount) {
            const newMsgs = snap.chatMessages.slice(this.lastKnownCount);
            this.lastKnownCount = snap.chatMessages.length;

            for (const m of newMsgs) {
                const isFromMe = m.senderId === network.sessionId;
                if (!isFromMe) {
                    network.playSound("chat");
                    if (!this.isOpen) {
                        this.unreadCount++;
                        this.showPreviewBubble(`${m.senderName}: ${m.text}`);
                    }
                } else {
                    network.playSound("click");
                }
            }
        } else {
            this.lastKnownCount = snap.chatMessages.length;
        }

        this.ensureDOMStructure(container);
        this.updateMessagesDOM(snap.chatMessages);
        this.updateBadgeAndVisibility();
    }

    private showPreviewBubble(msg: string) {
        this.previewText = msg;
        this.updateBadgeAndVisibility();
        if (this.previewTimeout) clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            this.previewText = "";
            this.updateBadgeAndVisibility();
        }, 3200);
    }

    private ensureDOMStructure(container: HTMLElement) {
        if (container.querySelector("#chat-fab-btn")) return;

        container.innerHTML = `
            <!-- Floating Chat Toggle Button (Right side, accessible on Mobile & PC) -->
            <div style="
                position: fixed;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                z-index: 260;
                display: flex;
                align-items: center;
                gap: 6px;
                pointer-events: auto;
            ">
                <!-- Incoming message preview bubble -->
                <div id="chat-preview-bubble" style="
                    display: none;
                    max-width: 190px;
                    background: linear-gradient(160deg, #f8eedb, #e2c799);
                    color: #241507;
                    border: 1.5px solid #b88322;
                    border-radius: 10px;
                    padding: 5px 10px;
                    font-size: 11px;
                    font-weight: 700;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    cursor: pointer;
                "></div>

                <button id="chat-fab-btn" title="Abrir / Cerrar Chat" style="
                    position: relative;
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: linear-gradient(180deg, #3a2615, #1f1309);
                    border: 2px solid #d4a445;
                    color: #f2c968;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.7);
                    transition: transform 0.15s ease;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f2c968" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span id="chat-unread-badge" style="
                        display: none;
                        position: absolute;
                        top: -4px;
                        right: -4px;
                        min-width: 18px;
                        height: 18px;
                        border-radius: 9px;
                        background: #c0392b;
                        border: 1.5px solid #fff;
                        color: #fff;
                        font-size: 10px;
                        font-weight: 900;
                        align-items: center;
                        justify-content: center;
                        padding: 0 4px;
                    ">0</span>
                </button>
            </div>

            <!-- Chat Drawer / Window -->
            <div id="chat-panel-backdrop" style="
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(15, 8, 2, 0.45);
                z-index: 270;
                align-items: center;
                justify-content: center;
                padding: 12px;
                pointer-events: auto;
            ">
                <div class="parchment-panel modal-card-anim" style="
                    width: 100%;
                    max-width: 380px;
                    height: min(440px, 78dvh);
                    border-radius: 14px;
                    border: 2.5px solid #8c622d;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                " onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(180deg, #3a2615, #24160b);
                        color: #f2c968;
                        padding: 9px 14px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1.5px solid #9e733b;
                    ">
                        <span class="font-serif" style="font-weight:800; font-size:14px;">
                            Chat de la Sala
                        </span>
                        <button id="chat-close-btn" class="btn-imperial-gold" style="
                            padding: 2px 10px;
                            font-size: 11.5px;
                        ">Cerrar</button>
                    </div>

                    <!-- Messages List -->
                    <div id="chat-messages-list" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 7px;
                        background: rgba(255, 249, 237, 0.55);
                    "></div>

                    <!-- Quick Chat Chips -->
                    <div style="
                        display: flex;
                        gap: 5px;
                        overflow-x: auto;
                        padding: 6px 10px;
                        border-top: 1px solid rgba(140, 98, 45, 0.25);
                        background: rgba(140, 98, 45, 0.08);
                    ">
                        <button class="chat-quick-chip" data-msg="¡Buena suerte!" style="
                            padding: 3px 8px; border-radius: 12px; border: 1px solid #8c622d;
                            background: #fff9ed; color: #241507; font-size: 10.5px; font-weight: 700;
                            white-space: nowrap; cursor: pointer;
                        ">¡Buena suerte!</button>
                        <button class="chat-quick-chip" data-msg="¡Buena jugada!" style="
                            padding: 3px 8px; border-radius: 12px; border: 1px solid #8c622d;
                            background: #fff9ed; color: #241507; font-size: 10.5px; font-weight: 700;
                            white-space: nowrap; cursor: pointer;
                        ">¡Buena jugada!</button>
                        <button class="chat-quick-chip" data-msg="Pensando..." style="
                            padding: 3px 8px; border-radius: 12px; border: 1px solid #8c622d;
                            background: #fff9ed; color: #241507; font-size: 10.5px; font-weight: 700;
                            white-space: nowrap; cursor: pointer;
                        ">Pensando...</button>
                        <button class="chat-quick-chip" data-msg="¡Bien jugado!" style="
                            padding: 3px 8px; border-radius: 12px; border: 1px solid #8c622d;
                            background: #fff9ed; color: #241507; font-size: 10.5px; font-weight: 700;
                            white-space: nowrap; cursor: pointer;
                        ">¡Bien jugado!</button>
                    </div>

                    <!-- Input Form -->
                    <div style="
                        display: flex;
                        gap: 6px;
                        padding: 8px 10px;
                        border-top: 1.5px solid rgba(140, 98, 45, 0.35);
                        background: rgba(140, 98, 45, 0.14);
                    ">
                        <input id="chat-text-input" type="text" maxlength="160" placeholder="Escribe un mensaje..." style="
                            flex: 1;
                            min-width: 0;
                            padding: 8px 11px;
                            border-radius: 7px;
                            border: 1.5px solid #a17942;
                            background: #fff9ed;
                            color: #241507;
                            font-size: 13px;
                            font-weight: 600;
                            outline: none;
                        " />
                        <button id="chat-send-btn" class="btn-imperial-gold" style="
                            padding: 8px 14px;
                            font-size: 12px;
                            white-space: nowrap;
                        ">Enviar</button>
                    </div>
                </div>
            </div>
        `;

        // Stop events inside #chat-layer from reaching Phaser canvas
        for (const evt of ["mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend", "click"]) {
            container.addEventListener(evt, e => e.stopPropagation());
        }

        document.getElementById("chat-fab-btn")?.addEventListener("click", () => {
            this.toggleChat(!this.isOpen);
        });
        document.getElementById("chat-preview-bubble")?.addEventListener("click", () => {
            this.toggleChat(true);
        });
        document.getElementById("chat-close-btn")?.addEventListener("click", () => {
            this.toggleChat(false);
        });
        document.getElementById("chat-panel-backdrop")?.addEventListener("click", () => {
            this.toggleChat(false);
        });

        const inputEl = document.getElementById("chat-text-input") as HTMLInputElement | null;
        const sendCurrentText = () => {
            if (!inputEl) return;
            const val = inputEl.value.trim();
            if (!val) return;
            network.sendChatMessage(val);
            inputEl.value = "";
        };

        document.getElementById("chat-send-btn")?.addEventListener("click", sendCurrentText);
        inputEl?.addEventListener("keydown", e => {
            if (e.key === "Enter") sendCurrentText();
        });

        container.querySelectorAll(".chat-quick-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const msg = (chip as HTMLElement).getAttribute("data-msg");
                if (msg) {
                    network.sendChatMessage(msg);
                }
            });
        });
    }

    private toggleChat(open: boolean) {
        network.playSound("click");
        this.isOpen = open;
        if (open) {
            this.unreadCount = 0;
            this.previewText = "";
        }
        this.updateBadgeAndVisibility();
        if (open) {
            const listEl = document.getElementById("chat-messages-list");
            if (listEl) listEl.scrollTop = listEl.scrollHeight;
        }
    }

    private updateBadgeAndVisibility() {
        const badge = document.getElementById("chat-unread-badge");
        const backdrop = document.getElementById("chat-panel-backdrop");
        const preview = document.getElementById("chat-preview-bubble");

        if (badge) {
            if (this.unreadCount > 0 && !this.isOpen) {
                badge.style.display = "inline-flex";
                badge.textContent = String(this.unreadCount);
            } else {
                badge.style.display = "none";
            }
        }

        if (backdrop) {
            backdrop.style.display = this.isOpen ? "flex" : "none";
        }

        if (preview) {
            if (this.previewText && !this.isOpen) {
                preview.style.display = "block";
                preview.textContent = this.previewText;
            } else {
                preview.style.display = "none";
            }
        }
    }

    private updateMessagesDOM(messages: ChatMessageSnapshot[]) {
        const listEl = document.getElementById("chat-messages-list");
        if (!listEl) return;

        if (messages.length === 0) {
            listEl.innerHTML = `
                <div style="margin:auto; text-align:center; color:#7d603c; font-size:12px; font-style:italic;">
                    No hay mensajes aún. ¡Saluda a tu oponente!
                </div>
            `;
            return;
        }

        const myId = network.sessionId;
        listEl.innerHTML = messages
            .map(m => {
                const isMe = m.senderId === myId;
                return `
                    <div style="
                        align-self: ${isMe ? "flex-end" : "flex-start"};
                        max-width: 82%;
                        background: ${
                            isMe
                                ? "linear-gradient(135deg, #2b6ca3, #18456e)"
                                : "linear-gradient(135deg, #fffDF9, #edd9b4)"
                        };
                        color: ${isMe ? "#fff8eb" : "#241507"};
                        border: 1px solid ${isMe ? "#8ab8e6" : "#a17942"};
                        border-radius: ${isMe ? "10px 10px 2px 10px" : "10px 10px 10px 2px"};
                        padding: 6px 10px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                    ">
                        <div style="display:flex; justify-content:space-between; gap:8px; font-size:9.5px; opacity:0.8; margin-bottom:2px; font-weight:700;">
                            <span>${isMe ? "Tú" : m.senderName}</span>
                            <span>${m.time}</span>
                        </div>
                        <div style="font-size:12.5px; line-height:1.35; word-break:break-word; font-weight:600;">
                            ${this.escapeHTML(m.text)}
                        </div>
                    </div>
                `;
            })
            .join("");

        listEl.scrollTop = listEl.scrollHeight;
    }

    private escapeHTML(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
}

export const chatWidget = new ChatWidgetManager();
