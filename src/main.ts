import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { WonderDraftScene } from "./scenes/WonderDraftScene";
import { chatWidget } from "./ui/chatWidget";

chatWidget.init();

// Prevent any pointer/mouse/touch events on the HTML UI layer from bubbling to window / Phaser canvas
const uiLayer = document.getElementById("ui-layer");
if (uiLayer) {
    const stopIfInteractive = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (target && target !== uiLayer) {
            e.stopPropagation();
        }
    };
    for (const evtName of [
        "mousedown",
        "mouseup",
        "pointerdown",
        "pointerup",
        "touchstart",
        "touchend",
        "click",
    ]) {
        uiLayer.addEventListener(evtName, stopIfInteractive, false);
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "phaser-container",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#2a1d12",
    input: {
        windowEvents: false,
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, LobbyScene, WonderDraftScene, GameScene],
};

new Phaser.Game(config);
