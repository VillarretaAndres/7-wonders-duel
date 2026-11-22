export type ResourceType = "wood" | "stone" | "clay" | "glass" | "papyrus";
export type CardColor = "brown" | "grey" | "blue" | "yellow" | "green" | "red" | "purple";

export interface ResourceCost {
    wood?: number;
    stone?: number;
    clay?: number;
    glass?: number;
    papyrus?: number;
}

export interface WonderData {
    id: string;
    name: string;
    description: string;
    cost: ResourceCost;
    effects: { type: string; value: any }[];
}

export interface CardEffect {
    type: string;
    resource?: ResourceType;
    resources?: ResourceType[];
    amount?: number;
    symbol?: string;
    targetColors?: CardColor[];
    coinsPerItem?: number;
    vpPerItem?: number;
    guildType?: string;
}

export interface CardData {
    id: string;
    name: string;
    age: 1 | 2 | 3;
    isGuild?: boolean;
    type: CardColor;
    cost: {
        coins?: number;
        resources?: ResourceCost;
        chainParentId?: string;
    };
    effects: CardEffect[];
    chainUnlocksId?: string;
}

export interface ProgressTokenData {
    id: string;
    name: string;
    icon: string;
    description: string;
}

export const RESOURCE_META: Record<
    ResourceType,
    { label: string; icon: string; color: string }
> = {
    wood: { label: "Madera", icon: "🪵", color: "#6d4c2f" },
    clay: { label: "Arcilla", icon: "🧱", color: "#b35437" },
    stone: { label: "Piedra", icon: "🪨", color: "#7f8c8d" },
    glass: { label: "Vidrio", icon: "🧪", color: "#3498db" },
    papyrus: { label: "Papiro", icon: "📜", color: "#d4b46a" },
};

export const SCIENCE_META: Record<string, { label: string; icon: string }> = {
    WHEEL: { label: "Rueda", icon: "⚙️" },
    MORTAR: { label: "Mortero", icon: "⚗️" },
    TABLET: { label: "Tablilla", icon: "🪧" },
    COMPASS: { label: "Compás", icon: "📐" },
    SUNDIAL: { label: "Reloj Solar", icon: "🧭" },
    GLOBE: { label: "Esfera Armilar", icon: "🌐" },
    LAW: { label: "Ley", icon: "⚖️" },
};

export const COLOR_META: Record<
    CardColor,
    { label: string; hex: string; numHex: number; textHex: string }
> = {
    brown: { label: "Materia Prima", hex: "#6e472b", numHex: 0x6e472b, textHex: "#ffd7b5" },
    grey: { label: "Manufactura", hex: "#6c7a89", numHex: 0x6c7a89, textHex: "#e4ecf5" },
    red: { label: "Militar", hex: "#a92323", numHex: 0xa92323, textHex: "#ffd2d2" },
    green: { label: "Científico", hex: "#1e7e45", numHex: 0x1e7e45, textHex: "#c9f7da" },
    yellow: { label: "Comercial", hex: "#c79116", numHex: 0xc79116, textHex: "#fff2c2" },
    blue: { label: "Civil", hex: "#1f5fa8", numHex: 0x1f5fa8, textHex: "#cde4ff" },
    purple: { label: "Gremio", hex: "#662d91", numHex: 0x662d91, textHex: "#ead1ff" },
};

export const PROGRESS_TOKENS: Record<string, ProgressTokenData> = {
    AGRICULTURE: {
        id: "AGRICULTURE",
        name: "Agricultura",
        icon: "🌾",
        description: "+6 Monedas de inmediato y +4 PV al final.",
    },
    ARCHITECTURE: {
        id: "ARCHITECTURE",
        name: "Arquitectura",
        icon: "🏛️",
        description: "Tus futuras Maravillas cuestan 2 recursos menos.",
    },
    ECONOMY: {
        id: "ECONOMY",
        name: "Economía",
        icon: "⚖️",
        description: "Recibes las monedas que gaste tu rival al comerciar.",
    },
    LAW: {
        id: "LAW",
        name: "Ley",
        icon: "📜",
        description: "Otorga el símbolo científico de Balanza (Ley).",
    },
    MASONRY: {
        id: "MASONRY",
        name: "Albañilería",
        icon: "🧱",
        description: "Tus futuros edificios azules cuestan 2 recursos menos.",
    },
    MATHEMATICS: {
        id: "MATHEMATICS",
        name: "Matemáticas",
        icon: "🔢",
        description: "3 PV por cada ficha de progreso que poseas (incluida esta).",
    },
    PHILOSOPHY: {
        id: "PHILOSOPHY",
        name: "Filosofía",
        icon: "🦉",
        description: "+7 PV al final de la partida.",
    },
    STRATEGY: {
        id: "STRATEGY",
        name: "Estrategia",
        icon: "⚔️",
        description: "Tus futuros edificios militares rojos otorgan +1 Escudo extra.",
    },
    THEOLOGY: {
        id: "THEOLOGY",
        name: "Teología",
        icon: "⚡",
        description: "Todas tus futuras Maravillas te otorgan Turno Extra.",
    },
    URBANISM: {
        id: "URBANISM",
        name: "Urbanismo",
        icon: "🏙️",
        description: "+6 Monedas ahora y +4 Monedas cada vez que construyas por cadena.",
    },
};

export const WONDERS: Record<string, WonderData> = {
    the_appian_way: {
        id: "the_appian_way",
        name: "La Vía Apia",
        description: "+3🪙, rival -3🪙, ⚡ Turno Extra, 3🏆",
        cost: { stone: 2, clay: 2, papyrus: 1 },
        effects: [
            { type: "ADD_COINS", value: 3 },
            { type: "OPPONENT_LOSE_COINS", value: 3 },
            { type: "EXTRA_TURN", value: true },
            { type: "ADD_VICTORY_POINTS", value: 3 },
        ],
    },
    circus_maximus: {
        id: "circus_maximus",
        name: "El Circo Máximo",
        description: "💥 Destruye 1 gris rival, +1⚔️, 3🏆",
        cost: { stone: 2, wood: 1, glass: 1 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 3 },
            { type: "MILITARY_POINTS", value: 1 },
            { type: "DESTROY_GREY_CARD", value: true },
        ],
    },
    the_colossus: {
        id: "the_colossus",
        name: "El Coloso",
        description: "+2⚔️ Escudos Militares, 3🏆",
        cost: { clay: 3, glass: 1 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 3 },
            { type: "MILITARY_POINTS", value: 2 },
        ],
    },
    the_great_library: {
        id: "the_great_library",
        name: "La Gran Biblioteca",
        description: "🟢 Elige 1 de 3 Fichas de Progreso de la caja, 4🏆",
        cost: { wood: 3, glass: 1, papyrus: 1 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 4 },
            { type: "DRAW_PROGRESS_TOKEN", value: 3 },
        ],
    },
    the_great_lighthouse: {
        id: "the_great_lighthouse",
        name: "El Gran Faro",
        description: "Produce 1 🪵/🪨/🧱 por turno, 4🏆",
        cost: { wood: 1, stone: 1, papyrus: 2 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 4 },
            { type: "PROVIDE_CHOICE_RESOURCE", value: ["wood", "stone", "clay"] },
        ],
    },
    the_hanging_gardens: {
        id: "the_hanging_gardens",
        name: "Los Jardines Colgantes",
        description: "+6🪙, ⚡ Turno Extra, 3🏆",
        cost: { wood: 2, glass: 1, papyrus: 1 },
        effects: [
            { type: "ADD_COINS", value: 6 },
            { type: "EXTRA_TURN", value: true },
            { type: "ADD_VICTORY_POINTS", value: 3 },
        ],
    },
    mausoleum_at_halicarnassus: {
        id: "mausoleum_at_halicarnassus",
        name: "El Mausoleo",
        description: "⚱️ Construye gratis 1 carta del descarte, 2🏆",
        cost: { clay: 2, glass: 2, papyrus: 1 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 2 },
            { type: "BUILD_FROM_DISCARD", value: true },
        ],
    },
    port_of_piraeus: {
        id: "port_of_piraeus",
        name: "El Pireo",
        description: "Produce 1 🧪/📜 por turno, ⚡ Turno Extra, 2🏆",
        cost: { wood: 2, stone: 1, clay: 1 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 2 },
            { type: "PROVIDE_CHOICE_RESOURCE", value: ["glass", "papyrus"] },
            { type: "EXTRA_TURN", value: true },
        ],
    },
    pyramids_of_giza: {
        id: "pyramids_of_giza",
        name: "Las Pirámides",
        description: "Otorga 9🏆 Puntos de Victoria",
        cost: { stone: 3, papyrus: 1 },
        effects: [{ type: "ADD_VICTORY_POINTS", value: 9 }],
    },
    the_sphinx: {
        id: "the_sphinx",
        name: "La Esfinge",
        description: "⚡ Turno Extra, 6🏆",
        cost: { stone: 1, clay: 1, glass: 2 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 6 },
            { type: "EXTRA_TURN", value: true },
        ],
    },
    statue_of_zeus: {
        id: "statue_of_zeus",
        name: "La Estatua de Zeus",
        description: "💥 Destruye 1 marrón rival, +1⚔️, 3🏆",
        cost: { stone: 1, wood: 1, clay: 1, papyrus: 2 },
        effects: [
            { type: "ADD_VICTORY_POINTS", value: 3 },
            { type: "MILITARY_POINTS", value: 1 },
            { type: "DESTROY_BROWN_CARD", value: true },
        ],
    },
    temple_of_artemis: {
        id: "temple_of_artemis",
        name: "El Templo de Artemisa",
        description: "+12🪙 Monedas, ⚡ Turno Extra",
        cost: { wood: 1, stone: 1, glass: 1, papyrus: 1 },
        effects: [
            { type: "ADD_COINS", value: 12 },
            { type: "EXTRA_TURN", value: true },
        ],
    },
};

export const CARDS_LIST: CardData[] = [
    // ERA I
    { id: "lumber_yard", name: "Aserradero Primitivo", age: 1, type: "brown", cost: {}, effects: [{ type: "PRODUCE_RESOURCE", resource: "wood", amount: 1 }] },
    { id: "logging_camp", name: "Campamento Maderero", age: 1, type: "brown", cost: { coins: 1 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "wood", amount: 1 }] },
    { id: "clay_pool", name: "Pozo de Arcilla", age: 1, type: "brown", cost: {}, effects: [{ type: "PRODUCE_RESOURCE", resource: "clay", amount: 1 }] },
    { id: "clay_pit", name: "Cantera de Arcilla", age: 1, type: "brown", cost: { coins: 1 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "clay", amount: 1 }] },
    { id: "quarry", name: "Cantera", age: 1, type: "brown", cost: {}, effects: [{ type: "PRODUCE_RESOURCE", resource: "stone", amount: 1 }] },
    { id: "stone_pit", name: "Pozo de Piedra", age: 1, type: "brown", cost: { coins: 1 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "stone", amount: 1 }] },
    { id: "glassworks", name: "Taller de Vidrio", age: 1, type: "grey", cost: { coins: 1 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "glass", amount: 1 }] },
    { id: "press", name: "Prensa", age: 1, type: "grey", cost: { coins: 1 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "papyrus", amount: 1 }] },
    { id: "guard_tower", name: "Torre de Guardia", age: 1, type: "red", cost: {}, effects: [{ type: "MILITARY_SHIELDS", amount: 1 }] },
    { id: "stable", name: "Establos", age: 1, type: "red", cost: { resources: { wood: 1 } }, effects: [{ type: "MILITARY_SHIELDS", amount: 1 }], chainUnlocksId: "horse_breeders" },
    { id: "garrison", name: "Guarnición", age: 1, type: "red", cost: { resources: { clay: 1 } }, effects: [{ type: "MILITARY_SHIELDS", amount: 1 }], chainUnlocksId: "barracks" },
    { id: "palisade", name: "Empalizada", age: 1, type: "red", cost: { coins: 2 }, effects: [{ type: "MILITARY_SHIELDS", amount: 1 }], chainUnlocksId: "fortifications" },
    { id: "workshop", name: "Taller", age: 1, type: "green", cost: { resources: { papyrus: 1 } }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "COMPASS" }, { type: "ADD_VICTORY_POINTS", amount: 1 }], chainUnlocksId: "archery_range" },
    { id: "apothecary", name: "Boticario", age: 1, type: "green", cost: { resources: { glass: 1 } }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "WHEEL" }, { type: "ADD_VICTORY_POINTS", amount: 1 }] },
    { id: "scriptorium", name: "Scriptorium", age: 1, type: "green", cost: { coins: 2 }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "TABLET" }], chainUnlocksId: "library" },
    { id: "pharmacist", name: "Farmacia", age: 1, type: "green", cost: { coins: 2 }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "MORTAR" }], chainUnlocksId: "dispensary" },
    { id: "stone_reserve", name: "Reserva de Piedra", age: 1, type: "yellow", cost: { coins: 3 }, effects: [{ type: "RESOURCE_DISCOUNT", resources: ["stone"] }] },
    { id: "clay_reserve", name: "Reserva de Arcilla", age: 1, type: "yellow", cost: { coins: 3 }, effects: [{ type: "RESOURCE_DISCOUNT", resources: ["clay"] }] },
    { id: "wood_reserve", name: "Reserva de Madera", age: 1, type: "yellow", cost: { coins: 3 }, effects: [{ type: "RESOURCE_DISCOUNT", resources: ["wood"] }] },
    { id: "tavern", name: "Taberna", age: 1, type: "yellow", cost: {}, effects: [{ type: "ADD_COINS", amount: 4 }], chainUnlocksId: "lighthouse" },
    { id: "theater", name: "Teatro", age: 1, type: "blue", cost: {}, effects: [{ type: "ADD_VICTORY_POINTS", amount: 3 }], chainUnlocksId: "statue" },
    { id: "altar", name: "Altar", age: 1, type: "blue", cost: {}, effects: [{ type: "ADD_VICTORY_POINTS", amount: 3 }], chainUnlocksId: "temple" },
    { id: "baths", name: "Termas", age: 1, type: "blue", cost: { resources: { stone: 1 } }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 3 }], chainUnlocksId: "aqueduct" },

    // ERA II
    { id: "sawmill", name: "Aserradero", age: 2, type: "brown", cost: { coins: 2 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "wood", amount: 2 }] },
    { id: "brickyard", name: "Ladrillar", age: 2, type: "brown", cost: { coins: 2 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "clay", amount: 2 }] },
    { id: "shelf_quarry", name: "Cantera Escalonada", age: 2, type: "brown", cost: { coins: 2 }, effects: [{ type: "PRODUCE_RESOURCE", resource: "stone", amount: 2 }] },
    { id: "glassblower", name: "Soplador de Vidrio", age: 2, type: "grey", cost: {}, effects: [{ type: "PRODUCE_RESOURCE", resource: "glass", amount: 1 }] },
    { id: "drying_room", name: "Secadero", age: 2, type: "grey", cost: {}, effects: [{ type: "PRODUCE_RESOURCE", resource: "papyrus", amount: 1 }] },
    { id: "tribunal", name: "Tribunal", age: 2, type: "blue", cost: { resources: { wood: 2, glass: 1 } }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 5 }] },
    { id: "statue", name: "Estatua", age: 2, type: "blue", cost: { resources: { clay: 2 }, chainParentId: "theater" }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 4 }], chainUnlocksId: "gardens" },
    { id: "temple", name: "Templo", age: 2, type: "blue", cost: { resources: { wood: 1, papyrus: 1 }, chainParentId: "altar" }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 4 }], chainUnlocksId: "pantheon" },
    { id: "aqueduct", name: "Acueducto", age: 2, type: "blue", cost: { resources: { stone: 3 }, chainParentId: "baths" }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 5 }] },
    { id: "rostrum", name: "Rostra", age: 2, type: "blue", cost: { resources: { stone: 1, wood: 1 } }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 4 }], chainUnlocksId: "senate" },
    { id: "walls", name: "Murallas", age: 2, type: "red", cost: { resources: { stone: 2 } }, effects: [{ type: "MILITARY_SHIELDS", amount: 2 }] },
    { id: "horse_breeders", name: "Criadores de Caballos", age: 2, type: "red", cost: { resources: { clay: 1, wood: 1 }, chainParentId: "stable" }, effects: [{ type: "MILITARY_SHIELDS", amount: 1 }] },
    { id: "barracks", name: "Cuartel", age: 2, type: "red", cost: { coins: 3, chainParentId: "garrison" }, effects: [{ type: "MILITARY_SHIELDS", amount: 1 }] },
    { id: "archery_range", name: "Campo de Tiro con Arco", age: 2, type: "red", cost: { resources: { stone: 1, wood: 1, papyrus: 1 }, chainParentId: "workshop" }, effects: [{ type: "MILITARY_SHIELDS", amount: 2 }], chainUnlocksId: "siege_workshop" },
    { id: "parade_ground", name: "Plaza de Armas", age: 2, type: "red", cost: { resources: { clay: 2, glass: 1 } }, effects: [{ type: "MILITARY_SHIELDS", amount: 2 }], chainUnlocksId: "circus" },
    { id: "library", name: "Biblioteca", age: 2, type: "green", cost: { resources: { stone: 1, wood: 1, glass: 1 }, chainParentId: "scriptorium" }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "TABLET" }, { type: "ADD_VICTORY_POINTS", amount: 2 }] },
    { id: "dispensary", name: "Dispensario", age: 2, type: "green", cost: { resources: { clay: 2, stone: 1 }, chainParentId: "pharmacist" }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "MORTAR" }, { type: "ADD_VICTORY_POINTS", amount: 2 }] },
    { id: "school", name: "Escuela", age: 2, type: "green", cost: { resources: { wood: 1, papyrus: 2 } }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "WHEEL" }, { type: "ADD_VICTORY_POINTS", amount: 1 }], chainUnlocksId: "university" },
    { id: "laboratory", name: "Laboratorio", age: 2, type: "green", cost: { resources: { wood: 1, glass: 2 } }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "COMPASS" }, { type: "ADD_VICTORY_POINTS", amount: 1 }], chainUnlocksId: "observatory" },
    { id: "forum", name: "Foro", age: 2, type: "yellow", cost: { coins: 3, resources: { clay: 1 } }, effects: [{ type: "PROVIDE_CHOICE_RESOURCE", resources: ["glass", "papyrus"] }] },
    { id: "caravansery", name: "Caravasar", age: 2, type: "yellow", cost: { coins: 2, resources: { glass: 1, papyrus: 1 } }, effects: [{ type: "PROVIDE_CHOICE_RESOURCE", resources: ["wood", "clay", "stone"] }] },
    { id: "customs_house", name: "Aduana", age: 2, type: "yellow", cost: { coins: 4 }, effects: [{ type: "RESOURCE_DISCOUNT", resources: ["glass", "papyrus"] }] },
    { id: "brewery", name: "Cervecería", age: 2, type: "yellow", cost: {}, effects: [{ type: "ADD_COINS", amount: 6 }], chainUnlocksId: "arena" },

    // ERA III
    { id: "pantheon", name: "Panteón", age: 3, type: "blue", cost: { resources: { clay: 1, wood: 1, papyrus: 2 }, chainParentId: "temple" }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 6 }] },
    { id: "gardens", name: "Jardines", age: 3, type: "blue", cost: { resources: { clay: 2, wood: 2 }, chainParentId: "statue" }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 6 }] },
    { id: "town_hall", name: "Ayuntamiento", age: 3, type: "blue", cost: { resources: { stone: 3, wood: 2 } }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 7 }] },
    { id: "palace", name: "Palacio", age: 3, type: "blue", cost: { resources: { clay: 1, stone: 1, wood: 1, glass: 2 } }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 7 }] },
    { id: "senate", name: "Senado", age: 3, type: "blue", cost: { resources: { clay: 2, stone: 1, papyrus: 1 }, chainParentId: "rostrum" }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 5 }] },
    { id: "obelisk", name: "Obelisco", age: 3, type: "blue", cost: { resources: { stone: 2, glass: 1 } }, effects: [{ type: "ADD_VICTORY_POINTS", amount: 5 }] },
    { id: "arsenal", name: "Arsenal", age: 3, type: "red", cost: { resources: { clay: 3, wood: 2 } }, effects: [{ type: "MILITARY_SHIELDS", amount: 3 }] },
    { id: "pretorium", name: "Pretorio", age: 3, type: "red", cost: { coins: 8 }, effects: [{ type: "MILITARY_SHIELDS", amount: 3 }] },
    { id: "fortifications", name: "Fortificaciones", age: 3, type: "red", cost: { resources: { stone: 2, clay: 1, papyrus: 1 }, chainParentId: "palisade" }, effects: [{ type: "MILITARY_SHIELDS", amount: 2 }] },
    { id: "siege_workshop", name: "Taller de Asedio", age: 3, type: "red", cost: { resources: { wood: 3, glass: 1 }, chainParentId: "archery_range" }, effects: [{ type: "MILITARY_SHIELDS", amount: 2 }] },
    { id: "circus", name: "Circo", age: 3, type: "red", cost: { resources: { clay: 2, stone: 2 }, chainParentId: "parade_ground" }, effects: [{ type: "MILITARY_SHIELDS", amount: 2 }] },
    { id: "academy", name: "Academia", age: 3, type: "green", cost: { resources: { stone: 1, wood: 1, glass: 2 } }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "SUNDIAL" }, { type: "ADD_VICTORY_POINTS", amount: 3 }] },
    { id: "study", name: "Estudio", age: 3, type: "green", cost: { resources: { wood: 2, glass: 1, papyrus: 1 } }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "SUNDIAL" }, { type: "ADD_VICTORY_POINTS", amount: 3 }] },
    { id: "university", name: "Universidad", age: 3, type: "green", cost: { resources: { clay: 1, glass: 1, papyrus: 1 }, chainParentId: "school" }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "GLOBE" }, { type: "ADD_VICTORY_POINTS", amount: 2 }] },
    { id: "observatory", name: "Observatorio", age: 3, type: "green", cost: { resources: { stone: 1, papyrus: 2 }, chainParentId: "laboratory" }, effects: [{ type: "SCIENCE_SYMBOL", symbol: "GLOBE" }, { type: "ADD_VICTORY_POINTS", amount: 2 }] },
    { id: "chamber_of_commerce", name: "Cámara de Comercio", age: 3, type: "yellow", cost: { resources: { papyrus: 2 } }, effects: [{ type: "COINS_PER_CARD_COLOR", targetColors: ["grey"], coinsPerItem: 3 }, { type: "VP_PER_CARD_COLOR", targetColors: ["grey"], vpPerItem: 3 }] },
    { id: "port", name: "Puerto", age: 3, type: "yellow", cost: { resources: { wood: 1, glass: 1, papyrus: 1 } }, effects: [{ type: "COINS_PER_CARD_COLOR", targetColors: ["brown"], coinsPerItem: 2 }, { type: "VP_PER_CARD_COLOR", targetColors: ["brown"], vpPerItem: 2 }] },
    { id: "armory", name: "Armería", age: 3, type: "yellow", cost: { resources: { stone: 2, glass: 1 } }, effects: [{ type: "COINS_PER_CARD_COLOR", targetColors: ["red"], coinsPerItem: 1 }, { type: "VP_PER_CARD_COLOR", targetColors: ["red"], vpPerItem: 1 }] },
    { id: "lighthouse", name: "Faro", age: 3, type: "yellow", cost: { resources: { clay: 2, glass: 1 }, chainParentId: "tavern" }, effects: [{ type: "COINS_PER_CARD_COLOR", targetColors: ["yellow"], coinsPerItem: 1 }, { type: "VP_PER_CARD_COLOR", targetColors: ["yellow"], vpPerItem: 1 }] },
    { id: "arena", name: "Arena", age: 3, type: "yellow", cost: { resources: { clay: 1, stone: 1, wood: 1 }, chainParentId: "brewery" }, effects: [{ type: "COINS_PER_WONDER", coinsPerItem: 2 }, { type: "VP_PER_WONDER", vpPerItem: 1 }] },

    // GREMIOS
    { id: "merchants_guild", name: "Gremio de Mercaderes", age: 3, isGuild: true, type: "purple", cost: { resources: { clay: 1, wood: 1, glass: 1, papyrus: 1 } }, effects: [{ type: "GUILD_SCORING", guildType: "MERCHANTS", targetColors: ["yellow"], coinsPerItem: 1, vpPerItem: 1 }] },
    { id: "shipowners_guild", name: "Gremio de Armadores", age: 3, isGuild: true, type: "purple", cost: { resources: { clay: 1, stone: 1, glass: 1, papyrus: 1 } }, effects: [{ type: "GUILD_SCORING", guildType: "SHIPOWNERS", targetColors: ["brown", "grey"], coinsPerItem: 1, vpPerItem: 1 }] },
    { id: "builders_guild", name: "Gremio de Constructores", age: 3, isGuild: true, type: "purple", cost: { resources: { stone: 2, clay: 1, wood: 1, glass: 1 } }, effects: [{ type: "GUILD_SCORING", guildType: "BUILDERS", vpPerItem: 2 }] },
    { id: "magistrates_guild", name: "Gremio de Magistrados", age: 3, isGuild: true, type: "purple", cost: { resources: { wood: 2, clay: 1, papyrus: 1 } }, effects: [{ type: "GUILD_SCORING", guildType: "MAGISTRATES", targetColors: ["blue"], coinsPerItem: 1, vpPerItem: 1 }] },
    { id: "scientists_guild", name: "Gremio de Científicos", age: 3, isGuild: true, type: "purple", cost: { resources: { clay: 2, wood: 2 } }, effects: [{ type: "GUILD_SCORING", guildType: "SCIENTISTS", targetColors: ["green"], coinsPerItem: 1, vpPerItem: 1 }] },
    { id: "moneylenders_guild", name: "Gremio de Prestamistas", age: 3, isGuild: true, type: "purple", cost: { resources: { stone: 2, wood: 2 } }, effects: [{ type: "GUILD_SCORING", guildType: "MONEYLENDERS", vpPerItem: 1 }] },
    { id: "tacticians_guild", name: "Gremio de Estrategas", age: 3, isGuild: true, type: "purple", cost: { resources: { stone: 2, clay: 1, papyrus: 1 } }, effects: [{ type: "GUILD_SCORING", guildType: "TACTICIANS", targetColors: ["red"], coinsPerItem: 1, vpPerItem: 1 }] },
];

export const CARDS_BY_ID: Record<string, CardData> = Object.fromEntries(
    CARDS_LIST.map(c => [c.id, c])
);

const ALL_RESOURCES: ResourceType[] = ["wood", "stone", "clay", "glass", "papyrus"];

export function formatResourceCost(cost?: ResourceCost, coins?: number): string {
    const parts: string[] = [];
    if (coins && coins > 0) parts.push(`${coins}🪙`);
    if (cost) {
        for (const r of ALL_RESOURCES) {
            const count = cost[r];
            if (count && count > 0) {
                parts.push(`${count}${RESOURCE_META[r].icon}`);
            }
        }
    }
    return parts.length > 0 ? parts.join(" ") : "Gratis";
}

export function formatCardEffectsShort(card: CardData): string {
    const parts: string[] = [];
    for (const eff of card.effects) {
        if (eff.type === "PRODUCE_RESOURCE" && eff.resource && eff.amount) {
            parts.push(`+${eff.amount}${RESOURCE_META[eff.resource].icon}`);
        } else if (eff.type === "PROVIDE_CHOICE_RESOURCE" && eff.resources) {
            parts.push(eff.resources.map(r => RESOURCE_META[r].icon).join("/"));
        } else if (eff.type === "RESOURCE_DISCOUNT" && eff.resources) {
            parts.push(`${eff.resources.map(r => RESOURCE_META[r].icon).join("")}=1🪙`);
        } else if (eff.type === "ADD_VICTORY_POINTS" && eff.amount) {
            parts.push(`${eff.amount}🏆`);
        } else if (eff.type === "MILITARY_SHIELDS" && eff.amount) {
            parts.push(`${"⚔️".repeat(eff.amount)}`);
        } else if (eff.type === "SCIENCE_SYMBOL" && eff.symbol) {
            parts.push(`${SCIENCE_META[eff.symbol]?.icon || "🔬"}`);
        } else if (eff.type === "ADD_COINS" && eff.amount) {
            parts.push(`+${eff.amount}🪙`);
        } else if (eff.type === "COINS_PER_CARD_COLOR") {
            parts.push(`+${eff.coinsPerItem}🪙/carta`);
        } else if (eff.type === "VP_PER_CARD_COLOR") {
            parts.push(`+${eff.vpPerItem}🏆/carta`);
        } else if (eff.type === "COINS_PER_WONDER") {
            parts.push(`+2🪙/Marav.`);
        } else if (eff.type === "VP_PER_WONDER") {
            parts.push(`+1🏆/Marav.`);
        } else if (eff.type === "GUILD_SCORING") {
            if (eff.guildType === "BUILDERS") parts.push(`2🏆/Maravilla`);
            else if (eff.guildType === "MONEYLENDERS") parts.push(`1🏆/3🪙`);
            else parts.push(`1🪙+1🏆/carta`);
        }
    }
    return parts.join(" ");
}

export function describeCardFull(card: CardData): string {
    const desc: string[] = [];
    for (const eff of card.effects) {
        if (eff.type === "PRODUCE_RESOURCE" && eff.resource && eff.amount) {
            desc.push(
                `Produce ${eff.amount} de ${RESOURCE_META[eff.resource].label} (${
                    RESOURCE_META[eff.resource].icon
                })`
            );
        } else if (eff.type === "PROVIDE_CHOICE_RESOURCE" && eff.resources) {
            desc.push(
                `Produce 1 recurso a elegir cada turno: ${eff.resources
                    .map(r => `${RESOURCE_META[r].icon} ${RESOURCE_META[r].label}`)
                    .join(" o ")}`
            );
        } else if (eff.type === "RESOURCE_DISCOUNT" && eff.resources) {
            desc.push(
                `Fija en 1🪙 el comercio de: ${eff.resources
                    .map(r => `${RESOURCE_META[r].icon} ${RESOURCE_META[r].label}`)
                    .join(", ")}`
            );
        } else if (eff.type === "ADD_VICTORY_POINTS" && eff.amount) {
            desc.push(`Otorga ${eff.amount} Puntos de Victoria (🏆)`);
        } else if (eff.type === "MILITARY_SHIELDS" && eff.amount) {
            desc.push(`Avanza ${eff.amount} Escudo(s) Militar(es) (⚔️)`);
        } else if (eff.type === "SCIENCE_SYMBOL" && eff.symbol) {
            desc.push(
                `Símbolo Científico: ${SCIENCE_META[eff.symbol]?.icon} ${
                    SCIENCE_META[eff.symbol]?.label
                }`
            );
        } else if (eff.type === "ADD_COINS" && eff.amount) {
            desc.push(`Otorga +${eff.amount} Monedas inmediatamente (🪙)`);
        } else if (eff.type === "COINS_PER_CARD_COLOR" && eff.targetColors) {
            desc.push(
                `+${eff.coinsPerItem}🪙 por cada carta ${eff.targetColors
                    .map(c => COLOR_META[c].label)
                    .join("/")} en tu ciudad`
            );
        } else if (eff.type === "VP_PER_CARD_COLOR" && eff.targetColors) {
            desc.push(
                `+${eff.vpPerItem}🏆 al final por cada carta ${eff.targetColors
                    .map(c => COLOR_META[c].label)
                    .join("/")} en tu ciudad`
            );
        } else if (eff.type === "COINS_PER_WONDER") {
            desc.push(`+${eff.coinsPerItem}🪙 por cada Maravilla construida en tu ciudad`);
        } else if (eff.type === "VP_PER_WONDER") {
            desc.push(`+${eff.vpPerItem}🏆 por cada Maravilla construida en tu ciudad`);
        } else if (eff.type === "GUILD_SCORING") {
            if (eff.guildType === "BUILDERS") {
                desc.push(
                    `Otorga 2🏆 por cada Maravilla construida en la ciudad que tenga más Maravillas`
                );
            } else if (eff.guildType === "MONEYLENDERS") {
                desc.push(`Otorga 1🏆 por cada grupo de 3🪙 en la ciudad más rica al final`);
            } else if (eff.targetColors) {
                desc.push(
                    `Otorga 1🪙 ahora y 1🏆 al final por cada carta de ${eff.targetColors
                        .map(c => COLOR_META[c].label)
                        .join("/")} en la ciudad con más cartas de ese tipo`
                );
            }
        }
    }
    if (card.cost.chainParentId) {
        const parent = CARDS_BY_ID[card.cost.chainParentId];
        if (parent) {
            desc.push(`🔗 Se construye GRATIS si posees: ${parent.name}`);
        }
    }
    if (card.chainUnlocksId) {
        const child = CARDS_BY_ID[card.chainUnlocksId];
        if (child) {
            desc.push(`🔓 Desbloquea construcción gratuita de: ${child.name}`);
        }
    }
    return desc.join(" • ");
}

/**
 * Client-side mirror of EconomyEngine for live UI cost badges and previews.
 */
export function getFixedProductionClient(builtCards: string[]): Record<ResourceType, number> {
    const prod: Record<ResourceType, number> = {
        wood: 0,
        stone: 0,
        clay: 0,
        glass: 0,
        papyrus: 0,
    };
    for (const cid of builtCards) {
        const c = CARDS_BY_ID[cid];
        if (!c) continue;
        for (const eff of c.effects) {
            if (eff.type === "PRODUCE_RESOURCE" && eff.resource && eff.amount) {
                prod[eff.resource] += eff.amount;
            }
        }
    }
    return prod;
}

export function getDiscountedResourcesClient(builtCards: string[]): Set<ResourceType> {
    const set = new Set<ResourceType>();
    for (const cid of builtCards) {
        const c = CARDS_BY_ID[cid];
        if (!c) continue;
        for (const eff of c.effects) {
            if (eff.type === "RESOURCE_DISCOUNT" && eff.resources) {
                eff.resources.forEach(r => set.add(r));
            }
        }
    }
    return set;
}

export function getChoicePoolsClient(
    builtCards: string[],
    builtWonderIds: string[]
): ResourceType[][] {
    const pools: ResourceType[][] = [];
    for (const cid of builtCards) {
        const c = CARDS_BY_ID[cid];
        if (!c) continue;
        for (const eff of c.effects) {
            if (eff.type === "PROVIDE_CHOICE_RESOURCE" && eff.resources) {
                pools.push(eff.resources);
            }
        }
    }
    for (const wid of builtWonderIds) {
        const w = WONDERS[wid];
        if (!w) continue;
        for (const eff of w.effects) {
            if (eff.type === "PROVIDE_CHOICE_RESOURCE" && Array.isArray(eff.value)) {
                pools.push(eff.value);
            }
        }
    }
    return pools;
}

export function calculateTradeCostClient(
    required: ResourceCost | undefined,
    myBuiltCards: string[],
    myBuiltWonders: string[],
    oppBuiltCards: string[],
    discountResourcesCount: number = 0
): number {
    if (!required) return 0;
    const myProd = getFixedProductionClient(myBuiltCards);
    const oppProd = getFixedProductionClient(oppBuiltCards);
    const discounts = getDiscountedResourcesClient(myBuiltCards);

    const unitCost: Record<ResourceType, number> = {
        wood: discounts.has("wood") ? 1 : 2 + oppProd.wood,
        stone: discounts.has("stone") ? 1 : 2 + oppProd.stone,
        clay: discounts.has("clay") ? 1 : 2 + oppProd.clay,
        glass: discounts.has("glass") ? 1 : 2 + oppProd.glass,
        papyrus: discounts.has("papyrus") ? 1 : 2 + oppProd.papyrus,
    };

    const deficit: Record<ResourceType, number> = {
        wood: Math.max(0, (required.wood || 0) - myProd.wood),
        stone: Math.max(0, (required.stone || 0) - myProd.stone),
        clay: Math.max(0, (required.clay || 0) - myProd.clay),
        glass: Math.max(0, (required.glass || 0) - myProd.glass),
        papyrus: Math.max(0, (required.papyrus || 0) - myProd.papyrus),
    };

    const pools = getChoicePoolsClient(myBuiltCards, myBuiltWonders);

    const solve = (idx: number, cur: Record<ResourceType, number>): number => {
        if (idx >= pools.length) {
            const prices: number[] = [];
            for (const r of ALL_RESOURCES) {
                for (let i = 0; i < cur[r]; i++) prices.push(unitCost[r]);
            }
            prices.sort((a, b) => b - a);
            let sum = 0;
            for (let i = discountResourcesCount; i < prices.length; i++) sum += prices[i];
            return sum;
        }
        let best = solve(idx + 1, cur);
        for (const opt of pools[idx]) {
            if (cur[opt] > 0) {
                cur[opt]--;
                const cand = solve(idx + 1, cur);
                if (cand < best) best = cand;
                cur[opt]++;
            }
        }
        return best;
    };

    return solve(0, deficit);
}

export function previewCardCostClient(
    card: CardData,
    myCoins: number,
    myBuiltCards: string[],
    myBuiltWonders: string[],
    myTokens: string[],
    oppBuiltCards: string[]
): { canAfford: boolean; totalCoins: number; isFreeByChain: boolean } {
    if (card.cost.chainParentId && myBuiltCards.includes(card.cost.chainParentId)) {
        return { canAfford: true, totalCoins: 0, isFreeByChain: true };
    }
    const baseCoins = card.cost.coins || 0;
    const discountCount =
        card.type === "blue" && myTokens.includes("MASONRY") ? 2 : 0;
    const trade = calculateTradeCostClient(
        card.cost.resources,
        myBuiltCards,
        myBuiltWonders,
        oppBuiltCards,
        discountCount
    );
    const total = baseCoins + trade;
    return {
        canAfford: myCoins >= total,
        totalCoins: total,
        isFreeByChain: false,
    };
}

export function previewWonderCostClient(
    wonder: WonderData,
    myCoins: number,
    myBuiltCards: string[],
    myBuiltWonders: string[],
    myTokens: string[],
    oppBuiltCards: string[]
): { canAfford: boolean; totalCoins: number } {
    const discountCount = myTokens.includes("ARCHITECTURE") ? 2 : 0;
    const total = calculateTradeCostClient(
        wonder.cost,
        myBuiltCards,
        myBuiltWonders,
        oppBuiltCards,
        discountCount
    );
    return {
        canAfford: myCoins >= total,
        totalCoins: total,
    };
}
