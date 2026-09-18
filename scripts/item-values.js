// ============================================================
// アイテム価値テーブル(エメラルド換算) - item-values.js
// main.js の同じ scripts フォルダに置いて、相対importで読み込みます。
//
// 優先順位:
//   1. ITEM_VALUES に明示的な値があればそれを使う
//   2. なければ typeId のパターンから TIER_RULES で自動判定
//   3. どちらにも当てはまらなければ DEFAULT_VALUE
//
// バニラは1000種類以上アイテムがあり、「適正価格」はそもそも正解のない
// ゲームバランスの話なので、全部を手打ちするのは非現実的です。代表的な
// アイテムだけ個別指定し、それ以外は接頭辞/接尾辞のパターンで自動的に
// 階層分けする方式にしています。これで実質「全アイテムに値がつく」
// 状態になります。正式なアイテムID一覧が欲しい場合は
// @minecraft/vanilla-data パッケージの MinecraftItemTypes 列挙体が
// 使えます(npm i @minecraft/vanilla-data)。
// ============================================================

export const DEFAULT_VALUE = 0.02;

// ---- 個別指定(ここに書いたものが最優先) ----
export const ITEM_VALUES = {
  // 鉱石・貴重資源
  "minecraft:diamond": 4,
  "minecraft:emerald": 1,
  "minecraft:netherite_ingot": 12,
  "minecraft:netherite_scrap": 6,
  "minecraft:ancient_debris": 8,
  "minecraft:gold_ingot": 1,
  "minecraft:raw_gold": 0.8,
  "minecraft:iron_ingot": 0.4,
  "minecraft:raw_iron": 0.3,
  "minecraft:copper_ingot": 0.15,
  "minecraft:raw_copper": 0.1,
  "minecraft:lapis_lazuli": 0.2,
  "minecraft:redstone": 0.15,
  "minecraft:quartz": 0.2,
  "minecraft:amethyst_shard": 0.3,
  "minecraft:glowstone_dust": 0.1,
  "minecraft:coal": 0.1,
  "minecraft:charcoal": 0.08,

  // 食料
  "minecraft:cod": 0.1,
  "minecraft:salmon": 0.1,
  "minecraft:tropical_fish": 0.15,
  "minecraft:pufferfish": 0.2,
  "minecraft:beef": 0.12,
  "minecraft:porkchop": 0.12,
  "minecraft:chicken": 0.1,
  "minecraft:mutton": 0.1,
  "minecraft:rabbit": 0.1,
  "minecraft:bread": 0.08,
  "minecraft:wheat": 0.04,
  "minecraft:carrot": 0.04,
  "minecraft:potato": 0.04,
  "minecraft:beetroot": 0.04,
  "minecraft:sugar_cane": 0.05,
  "minecraft:melon_slice": 0.04,
  "minecraft:pumpkin": 0.06,
  "minecraft:apple": 0.06,
  "minecraft:cocoa_beans": 0.06,
  "minecraft:honey_bottle": 0.15,
  "minecraft:egg": 0.03,
  "minecraft:milk_bucket": 0.15,

  // 木材
  "minecraft:oak_log": 0.05,
  "minecraft:spruce_log": 0.05,
  "minecraft:birch_log": 0.05,
  "minecraft:jungle_log": 0.05,
  "minecraft:acacia_log": 0.05,
  "minecraft:dark_oak_log": 0.05,
  "minecraft:mangrove_log": 0.05,
  "minecraft:cherry_log": 0.05,
  "minecraft:crimson_stem": 0.06,
  "minecraft:warped_stem": 0.06,

  // MOBドロップ
  "minecraft:string": 0.05,
  "minecraft:spider_eye": 0.08,
  "minecraft:gunpowder": 0.1,
  "minecraft:ender_pearl": 0.6,
  "minecraft:blaze_rod": 0.8,
  "minecraft:ghast_tear": 1.5,
  "minecraft:slime_ball": 0.1,
  "minecraft:phantom_membrane": 0.4,
  "minecraft:leather": 0.08,
  "minecraft:feather": 0.05,
  "minecraft:bone": 0.05,
  "minecraft:rotten_flesh": 0.01,
  "minecraft:shulker_shell": 2,
  "minecraft:dragon_breath": 2,

  // 染料・羊毛
  "minecraft:white_dye": 0.03,
  "minecraft:ink_sac": 0.05,
};

// ---- パターン一致による自動階層(ITEM_VALUESに無い場合だけ適用) ----
// 上から順にチェックし、最初にマッチしたものを採用します。
// 好みの価格バランスに合わせて自由に調整してください。
const TIER_RULES = [
  { test: (id) => id.includes("netherite"), value: 10 },
  { test: (id) => id.includes("diamond"), value: 3.5 },
  { test: (id) => id.includes("emerald"), value: 1 },
  { test: (id) => id.includes("raw_") || id.includes("_ore"), value: 0.3 },
  { test: (id) => id.includes("gold"), value: 0.6 },
  { test: (id) => id.includes("iron"), value: 0.3 },
  { test: (id) => id.includes("copper"), value: 0.12 },
  { test: (id) => id.includes("concrete") || id.includes("terracotta") || id.includes("glazed"), value: 0.04 },
  { test: (id) => id.includes("wool") || id.includes("_dye"), value: 0.04 },
  { test: (id) => id.includes("log") || id.includes("planks") || id.includes("stem"), value: 0.05 },
  { test: (id) => id.includes("stone") || id.includes("dirt") || id.includes("sand") || id.includes("gravel"), value: 0.01 },
  { test: (id) => id.includes("sword") || id.includes("axe") || id.includes("pickaxe") || id.includes("shovel") || id.includes("hoe"), value: 0.5 },
  { test: (id) => id.includes("helmet") || id.includes("chestplate") || id.includes("leggings") || id.includes("boots"), value: 0.6 },
  { test: (id) => id.includes("potion"), value: 0.5 },
  { test: (id) => id.includes("enchanted_book"), value: 3 },
];

export function getItemValue(typeId) {
  if (typeId in ITEM_VALUES) return ITEM_VALUES[typeId];
  for (const rule of TIER_RULES) {
    if (rule.test(typeId)) return rule.value;
  }
  return DEFAULT_VALUE;
}
