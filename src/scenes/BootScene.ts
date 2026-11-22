import Phaser from "phaser";
import { ASSET_MANIFEST } from "../data/assetManifest";

export class BootScene extends Phaser.Scene {
    constructor() {
        super("BootScene");
    }

    preload() {
        const { width, height } = this.scale;

        // Warm Ancient Sandstone loading backdrop
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x3a2615, 0x3a2615, 0x1c1209, 0x1c1209, 1);
        bg.fillRect(0, 0, width, height);

        const barW = Math.min(340, width - 48);
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x1f140a, 0.9);
        progressBox.fillRoundedRect(width / 2 - barW / 2, height / 2 - 12, barW, 24, 6);
        progressBox.lineStyle(2, 0xc89532, 0.9);
        progressBox.strokeRoundedRect(width / 2 - barW / 2, height / 2 - 12, barW, 24, 6);

        const progressBar = this.add.graphics();

        const titleText = this.add
            .text(width / 2, height / 2 - 52, "7 WONDERS DUEL", {
                fontSize: "28px",
                color: "#f2c968",
                fontFamily: "'Cinzel', Georgia, serif",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        const percentText = this.add
            .text(width / 2, height / 2, "0%", {
                fontSize: "13px",
                color: "#fff5e0",
                fontFamily: "'Cinzel', serif",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        const assetText = this.add
            .text(width / 2, height / 2 + 36, "Preparando el tablero y las maravillas...", {
                fontSize: "13px",
                color: "#d9c29c",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
            })
            .setOrigin(0.5);

        this.load.on("progress", (value: number) => {
            percentText.setText(`${Math.floor(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0xd4a445, 1);
            progressBar.fillRoundedRect(
                width / 2 - barW / 2 + 3,
                height / 2 - 9,
                Math.max(8, (barW - 6) * value),
                18,
                4
            );
        });

        this.load.on("complete", () => {
            progressBar.destroy();
            progressBox.destroy();
            titleText.destroy();
            percentText.destroy();
            assetText.destroy();
        });

        // 1. Common boards and tokens
        this.load.image("bg_main", ASSET_MANIFEST.common.background);
        this.load.image("board_bg", ASSET_MANIFEST.common.boardBackground);
        this.load.image("military_board", ASSET_MANIFEST.common.militaryBoard);
        this.load.image("military_lead", ASSET_MANIFEST.common.militaryLead);
        this.load.image("coins_icon", ASSET_MANIFEST.common.coins);
        this.load.image("loot2", ASSET_MANIFEST.common.loot2);
        this.load.image("loot5", ASSET_MANIFEST.common.loot5);
        this.load.image("game_over", ASSET_MANIFEST.common.gameOver);
        this.load.image("victorypoints", "/assets/victorypoints.png");

        // 2. Card backs
        this.load.image("card_back_age1", ASSET_MANIFEST.backs.age1);
        this.load.image("card_back_age2", ASSET_MANIFEST.backs.age2);
        this.load.image("card_back_age3", ASSET_MANIFEST.backs.age3);
        this.load.image("card_back_guilds", ASSET_MANIFEST.backs.guilds);
        this.load.image("disc_back", ASSET_MANIFEST.backs.disc);

        // Coin tokens
        this.load.image("coin3", "/assets/3coin.png");
        this.load.image("coin6", "/assets/6coin.png");
        this.load.image("coin_back", "/assets/coin-back.png");

        // 3. All 73 cards
        for (const [id, path] of Object.entries(ASSET_MANIFEST.cards)) {
            this.load.image(`card_${id}`, path);
        }

        // 4. All 12 Wonders
        for (const [id, path] of Object.entries(ASSET_MANIFEST.wonders)) {
            this.load.image(`wonder_${id}`, path);
        }

        // 5. All 10 Progress Tokens
        for (const [id, path] of Object.entries(ASSET_MANIFEST.tokens)) {
            this.load.image(`token_${id}`, path);
        }
    }

    create() {
        this.scene.start("LobbyScene");
    }
}
