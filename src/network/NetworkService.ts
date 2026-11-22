import { Client, Room } from "@colyseus/sdk";

export interface WonderSnapshot {
    wonderId: string;
    isBuilt: boolean;
}

export interface PyramidSlotSnapshot {
    index: number;
    cardId: string;
    row: number;
    col: number;
    faceUp: boolean;
    removed: boolean;
    available: boolean;
    coveredBy: number[];
}

export interface PlayerSnapshot {
    sessionId: string;
    name: string;
    isBot: boolean;
    coins: number;
    wonders: WonderSnapshot[];
    builtCards: string[];
    progressTokens: string[];
    scienceSymbols: string[];
    score: number;
}

export interface PublicRoomSummary {
    roomId: string;
    roomCode: string;
    roomName: string;
    hostName: string;
    hasPassword: boolean;
    playerCount: number;
    maxPlayers: number;
}

export interface ChatMessageSnapshot {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    time: string;
}

export interface GameStateSnapshot {
    roomCode: string;
    players: Record<string, PlayerSnapshot>;
    playerOrder: string[];
    currentTurn: string;
    gamePhase: string;
    currentAge: number;
    draftWonders: string[];
    draftRound: number;
    draftStep: number;
    pyramid: PyramidSlotSnapshot[];
    discardedCards: string[];
    availableProgressTokens: string[];
    discardedProgressTokens: string[];
    libraryChoices: string[];
    destroyTargetColor: string;
    pendingExtraTurn: boolean;
    militaryPosition: number;
    militaryTokenP1_2CoinsRemoved: boolean;
    militaryTokenP1_5CoinsRemoved: boolean;
    militaryTokenP2_2CoinsRemoved: boolean;
    militaryTokenP2_5CoinsRemoved: boolean;
    totalWondersBuilt: number;
    winner: string;
    winReason: string;
    logs: string[];
    chatMessages: ChatMessageSnapshot[];
}

type StateChangeListener = (snapshot: GameStateSnapshot) => void;

class NetworkService {
    private client: Client;
    private httpBaseUrl: string;
    public room: Room | null = null;
    private listeners = new Set<StateChangeListener>();
    public lastSnapshot: GameStateSnapshot | null = null;

    // Settings persisted in localStorage
    public animationsEnabled: boolean =
        localStorage.getItem("7wd_animations") !== "false";
    public soundEnabled: boolean =
        localStorage.getItem("7wd_sound") !== "false";

    private audioCtx: AudioContext | null = null;

    constructor() {
        // 1. Check if VITE_BACKEND_URL is configured (in client/.env or hosting platform variables)
        const envBackendUrl = (
            (import.meta as any).env?.VITE_BACKEND_URL || ""
        )
            .trim()
            .replace(/\/+$/, "");

        if (envBackendUrl) {
            // Normalize HTTP(S) URL for REST endpoints (/api/rooms, /api/room-by-code)
            this.httpBaseUrl = envBackendUrl
                .replace(/^wss:\/\//i, "https://")
                .replace(/^ws:\/\//i, "http://");

            // Normalize WS(S) URL for Colyseus Client
            const wsUrl = envBackendUrl
                .replace(/^https:\/\//i, "wss://")
                .replace(/^http:\/\//i, "ws://");

            this.client = new Client(wsUrl);
            return;
        }

        // 2. Fallback when VITE_BACKEND_URL is empty:
        // Uses Vite's local "/colyseus" and "/api" proxy (or direct "/" if on port 2567)
        const isDirectColyseusPort = window.location.port === "2567";
        if (isDirectColyseusPort) {
            this.httpBaseUrl = "";
            this.client = new Client("/");
        } else {
            this.httpBaseUrl = "";
            this.client = new Client("/colyseus");
        }
    }

    public get sessionId(): string {
        return this.room?.sessionId || "";
    }

    public setAnimationsEnabled(val: boolean) {
        this.animationsEnabled = val;
        localStorage.setItem("7wd_animations", String(val));
    }

    public setSoundEnabled(val: boolean) {
        this.soundEnabled = val;
        localStorage.setItem("7wd_sound", String(val));
        if (val) this.playSound("click");
    }

    /**
     * Subtle WebAudio procedural board game sound effects (card flip, coin clink, build chime, chat ping).
     */
    public playSound(type: "click" | "flip" | "coin" | "build" | "wonder" | "victory" | "chat") {
        if (!this.soundEnabled) return;
        try {
            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioCtx) return;
                this.audioCtx = new AudioCtx();
            }
            if (this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }
            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            const playTone = (freq: number, dur: number, delay: number, oscType: OscillatorType = "triangle", vol: number = 0.08) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = oscType;
                osc.frequency.setValueAtTime(freq, now + delay);
                gain.gain.setValueAtTime(vol, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + dur);
            };

            if (type === "click") {
                playTone(520, 0.06, 0, "sine", 0.05);
            } else if (type === "chat") {
                playTone(659.25, 0.11, 0, "sine", 0.09);
                playTone(987.77, 0.22, 0.08, "sine", 0.1);
            } else if (type === "flip") {
                playTone(340, 0.08, 0, "triangle", 0.06);
                playTone(460, 0.09, 0.05, "triangle", 0.06);
            } else if (type === "coin") {
                playTone(1046, 0.14, 0, "sine", 0.07);
                playTone(1318, 0.18, 0.07, "sine", 0.07);
            } else if (type === "build") {
                playTone(440, 0.12, 0, "triangle", 0.08);
                playTone(554, 0.16, 0.08, "triangle", 0.08);
            } else if (type === "wonder") {
                playTone(392, 0.15, 0, "triangle", 0.09);
                playTone(493, 0.15, 0.1, "triangle", 0.09);
                playTone(587, 0.25, 0.2, "triangle", 0.1);
            } else if (type === "victory") {
                playTone(523, 0.16, 0, "triangle", 0.09);
                playTone(659, 0.16, 0.12, "triangle", 0.09);
                playTone(784, 0.16, 0.24, "triangle", 0.09);
                playTone(1046, 0.35, 0.36, "triangle", 0.1);
            }
        } catch {
            // Audio ignored if blocked by browser autoplay policy
        }
    }

    /**
     * Fetches the list of public waiting rooms from the server.
     */
    public async fetchPublicRooms(): Promise<PublicRoomSummary[]> {
        const resp = await fetch(`${this.httpBaseUrl}/api/rooms`);
        if (!resp.ok) return [];
        const data = await resp.json();
        return Array.isArray(data?.rooms) ? data.rooms : [];
    }

    /**
     * Creates a new room with full options (public/private, optional password, optional custom code, room name).
     */
    public async createConfiguredRoom(opts: {
        playerName: string;
        roomName?: string;
        isPublic: boolean;
        password?: string;
        customCode?: string;
    }): Promise<void> {
        if (this.room) {
            await this.room.leave();
            this.room = null;
        }
        this.room = await this.client.create("duel_room", {
            name: opts.playerName,
            roomName: opts.roomName?.trim() || undefined,
            isPublic: opts.isPublic,
            password: opts.password?.trim() || "",
            customCode: opts.customCode?.trim().toUpperCase() || undefined,
        });
        this.bindRoomEvents(this.room);
        this.playSound("build");
    }

    /**
     * Looks up a room by its 5-character code (returns metadata including whether it requires a password).
     */
    public async lookupRoomByCode(code: string): Promise<PublicRoomSummary> {
        const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!cleaned) {
            throw new Error("Introduce un código de sala válido.");
        }
        const resp = await fetch(`${this.httpBaseUrl}/api/room-by-code/${encodeURIComponent(cleaned)}`);
        const data = await resp.json();
        if (!resp.ok || !data.found || !data.roomId) {
            throw new Error(data.error || `No se encontró ninguna sala con el código "${cleaned}".`);
        }
        return {
            roomId: data.roomId,
            roomCode: data.roomCode,
            roomName: data.roomName || `Sala ${data.roomCode}`,
            hostName: data.hostName || "Anfitrión",
            hasPassword: Boolean(data.hasPassword),
            playerCount: 1,
            maxPlayers: 2,
        };
    }

    /**
     * Joins a specific room by its Colyseus roomId, passing optional password.
     */
    public async joinRoomById(roomId: string, playerName: string, password?: string): Promise<void> {
        if (this.room) {
            await this.room.leave();
            this.room = null;
        }
        this.room = await this.client.joinById(roomId, {
            name: playerName,
            password: password?.trim() || "",
        });
        this.bindRoomEvents(this.room);
        this.playSound("build");
    }

    public async leaveRoom(notifyForfeit: boolean = false): Promise<void> {
        if (this.room) {
            if (notifyForfeit) {
                try {
                    this.room.send("leave_match");
                } catch {
                    // ignore
                }
            }
            await this.room.leave();
            this.room = null;
            this.lastSnapshot = null;
        }
    }

    private bindRoomEvents(room: Room) {
        room.onStateChange((rawState: any) => {
            const snap = this.extractSnapshot(rawState);
            this.lastSnapshot = snap;
            for (const listener of this.listeners) {
                listener(snap);
            }
        });

        room.onMessage("board_state", () => {
            // Handled via state sync
        });

        room.onMessage("action_error", (payload: { message?: string }) => {
            if (payload?.message) {
                this.showToast(payload.message);
            }
        });
    }

    public onStateUpdate(cb: StateChangeListener): () => void {
        this.listeners.add(cb);
        if (this.lastSnapshot) {
            cb(this.lastSnapshot);
        }
        return () => {
            this.listeners.delete(cb);
        };
    }

    private extractSnapshot(raw: any): GameStateSnapshot {
        const players: Record<string, PlayerSnapshot> = {};
        if (raw.players && typeof raw.players.forEach === "function") {
            raw.players.forEach((p: any, key: string) => {
                players[key] = {
                    sessionId: p.sessionId || key,
                    name: p.name || "Jugador",
                    isBot: Boolean(p.isBot),
                    coins: Number(p.coins ?? 7),
                    wonders: Array.from(p.wonders || []).map((w: any) => ({
                        wonderId: w.wonderId,
                        isBuilt: Boolean(w.isBuilt),
                    })),
                    builtCards: Array.from(p.builtCards || []),
                    progressTokens: Array.from(p.progressTokens || []),
                    scienceSymbols: Array.from(p.scienceSymbols || []),
                    score: Number(p.score ?? 0),
                };
            });
        }

        const pyramid: PyramidSlotSnapshot[] = Array.from(raw.pyramid || []).map((s: any) => ({
            index: Number(s.index),
            cardId: String(s.cardId || "HIDDEN"),
            row: Number(s.row),
            col: Number(s.col),
            faceUp: Boolean(s.faceUp),
            removed: Boolean(s.removed),
            available: Boolean(s.available),
            coveredBy: Array.from(s.coveredBy || []).map(Number),
        }));

        return {
            roomCode: String(raw.roomCode || ""),
            players,
            playerOrder: Array.from(raw.playerOrder || []),
            currentTurn: String(raw.currentTurn || ""),
            gamePhase: String(raw.gamePhase || "WAITING"),
            currentAge: Number(raw.currentAge || 1),
            draftWonders: Array.from(raw.draftWonders || []),
            draftRound: Number(raw.draftRound || 1),
            draftStep: Number(raw.draftStep || 0),
            pyramid,
            discardedCards: Array.from(raw.discardedCards || []),
            availableProgressTokens: Array.from(raw.availableProgressTokens || []),
            discardedProgressTokens: Array.from(raw.discardedProgressTokens || []),
            libraryChoices: Array.from(raw.libraryChoices || []),
            destroyTargetColor: String(raw.destroyTargetColor || ""),
            pendingExtraTurn: Boolean(raw.pendingExtraTurn),
            militaryPosition: Number(raw.militaryPosition || 0),
            militaryTokenP1_2CoinsRemoved: Boolean(raw.militaryTokenP1_2CoinsRemoved),
            militaryTokenP1_5CoinsRemoved: Boolean(raw.militaryTokenP1_5CoinsRemoved),
            militaryTokenP2_2CoinsRemoved: Boolean(raw.militaryTokenP2_2CoinsRemoved),
            militaryTokenP2_5CoinsRemoved: Boolean(raw.militaryTokenP2_5CoinsRemoved),
            totalWondersBuilt: Number(raw.totalWondersBuilt || 0),
            winner: String(raw.winner || ""),
            winReason: String(raw.winReason || ""),
            logs: Array.from(raw.logs || []),
            chatMessages: Array.from(raw.chatMessages || []).map((m: any) => ({
                id: String(m.id || ""),
                senderId: String(m.senderId || ""),
                senderName: String(m.senderName || "Gobernante"),
                text: String(m.text || ""),
                time: String(m.time || ""),
            })),
        };
    }

    public sendChatMessage(text: string) {
        const clean = text.trim().slice(0, 160);
        if (!clean) return;
        this.room?.send("send_chat", { text: clean });
    }

    public sendDraftWonder(wonderId: string) {
        this.playSound("wonder");
        this.room?.send("draft_wonder", { wonderId });
    }

    public sendTurnAction(
        slotIndex: number,
        action: "BUILD" | "DISCARD" | "BUILD_WONDER",
        wonderId?: string
    ) {
        if (action === "DISCARD") this.playSound("coin");
        else if (action === "BUILD_WONDER") this.playSound("wonder");
        else this.playSound("build");
        this.room?.send("play_turn_action", { slotIndex, action, wonderId });
    }

    public sendSelectProgressToken(tokenId: string) {
        this.playSound("build");
        this.room?.send("select_progress_token", { tokenId });
    }

    public sendSelectLibraryToken(tokenId: string) {
        this.playSound("build");
        this.room?.send("select_library_token", { tokenId });
    }

    public sendSelectMausoleumCard(cardId: string) {
        this.playSound("build");
        this.room?.send("select_mausoleum_card", { cardId });
    }

    public sendSelectDestroyCard(cardId: string) {
        this.playSound("click");
        this.room?.send("select_destroy_card", { cardId });
    }

    public sendChooseAgeStarter(starterId: string) {
        this.playSound("click");
        this.room?.send("choose_age_starter", { starterId });
    }

    public showToast(message: string, isInfo: boolean = false) {
        const div = document.createElement("div");
        div.className = "toast-msg";
        if (isInfo) {
            div.style.background = "linear-gradient(180deg, #1c6b43, #114229)";
            div.style.borderColor = "#7ed9a3";
        }
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => {
            div.style.opacity = "0";
            setTimeout(() => div.remove(), 300);
        }, 2800);
    }
}

export const network = new NetworkService();
