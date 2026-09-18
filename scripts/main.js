// ============================================================
// BellBoats - 物流・交易ネットワーク
//
// 【操作一覧】
// ・木の棒 (stick): 拠点の登録 / 相場情報の確認
// ・本 (book): 拠点の解体・登録解除
// ・紙 (paper): 運送の開始 / 納品
// ・紙 (paper) + スニーク: 運送の中止（アイテム返却）
// ============================================================

import { world, ItemStack } from "@minecraft/server";
import { getItemValue } from "./item-values.js";

const REGISTRATION_RADIUS = 12;
const EXCLUDED_COLORS = ["shulker_box"];
const BASES_KEY = "logi_bases_v2";
const TICKET_KEY = "logi_ticket_v2";

const DISTANCE_BONUS_PER_BLOCKS = 100;
const DISTANCE_BONUS_RATE = 0.1;
// 距離ボーナスに上限は設けない(遠くまで運ぶほど常に得になる)
const BED_BONUS_RATE = 0.1; // 納品先のベッド1つにつき+10%(上限なし)
const EMERALD_BLOCK_VALUE = 9;
const CYCLE_TICKS = 24000 * 3;

// ---- 多言語メッセージ辞書 (日英) ----
const MESSAGES = {
  ja: {
    base_registered: (color, total) => `§a拠点を登録しました (${color}) 計${total}箇所`,
    already_registered: (color) => `§eこの拠点は既に登録されています (${color})`,
    color_in_use: (color) => `§c色「${color}」は既に別の拠点で使われています`,
    no_shulker_near: "§c近くに登録可能なシュルカーボックスがありません",
    not_a_base: "§cここは登録された拠点ではありません",
    need_two_bases: "§c拠点が2つ以上登録されていないため、運送できません",
    cancel_success: (count) => `§e運送を中止しました。預かっていたアイテム(${count}個)を返却しました`,
    cancel_empty: "§7現在は運送中ではありません",
    no_source_shulker: (color) => `§c近くに${color}のシュルカーボックスが見つかりません`,
    no_dest_shulker: (color) => `§c納品先の${color}のシュルカーがありません！設置してから再タップしてください`,
    dest_shulker_full: (color) => `§c納品先の${color}のシュルカーに空きが足りません！整理してから再タップしてください`,
    shulker_empty: "§cシュルカーボックスの中身が空です",
    delivery_started: (count, color, sp, dem) => `§b運送開始！ 積荷:${count}個 (${color})\n§7[特産: ${sp} (安値) / 需要: ${dem} (高値)]`,
    delivery_same_base: "§e運送中です。別の拠点のベルで紙を右クリックしてください",
    delivery_complete: (dist, distBonus, bedCount, popBonus, count, reward) => `§a納品完了！ 距離:${Math.round(dist)}m (x${distBonus.toFixed(1)}) 人口:${bedCount}戸 (x${popBonus.toFixed(1)}) 積荷:${count}個 → 運送料:${reward}エメラルド`,
    market_info: (biome, sp, dem) => `§6[市場] 地域:${biome} | 特産: ${sp} (売0.5x) | 需要: ${dem} (買2.0x)`,
    base_removed: (color, total) => `§c拠点を解体しました (${color}) 残り${total}箇所`
  },
  en: {
    base_registered: (color, total) => `§aBase registered! (${color}) Total: ${total}`,
    already_registered: (color) => `§eThis base is already registered (${color})`,
    color_in_use: (color) => `§cColor "${color}" is already used by another base`,
    no_shulker_near: "§cNo registrable shulker box found nearby",
    not_a_base: "§cThis bell is not a registered base",
    need_two_bases: "§cDelivery requires at least 2 registered bases",
    cancel_success: (count) => `§eDelivery cancelled. Returned ${count} cargo items`,
    cancel_empty: "§7You are not currently delivering anything",
    no_source_shulker: (color) => `§cCould not find a ${color} shulker box nearby`,
    no_dest_shulker: (color) => `§cDestination ${color} shulker box missing! Place one and tap again`,
    dest_shulker_full: (color) => `§cDestination ${color} shulker box is full! Free up space and tap again`,
    shulker_empty: "§cThe shulker box is empty",
    delivery_started: (count, color, sp, dem) => `§bDelivery started! Cargo:${count} (${color})\n§7[Specialty: ${sp} (Low) / Demand: ${dem} (High)]`,
    delivery_same_base: "§eDelivering... Right-click another base's bell with paper",
    delivery_complete: (dist, distBonus, bedCount, popBonus, count, reward) => `§aDelivered! Dist:${Math.round(dist)}m (x${distBonus.toFixed(1)}) Pop:${bedCount} (x${popBonus.toFixed(1)}) Cargo:${count} → Fee:${reward} Emeralds`,
    market_info: (biome, sp, dem) => `§6[Market] Region:${biome} | Specialty: ${sp} (0.5x) | Demanded: ${dem} (2.0x)`,
    base_removed: (color, total) => `§cBase dismantled! (${color}) Remaining: ${total}`
  }
};

function getLang(player) {
  const locale = player.clientSystemInfo?.locale ?? "";
  return locale.startsWith("ja") ? "ja" : "en";
}

function t(player, key, ...args) {
  const lang = getLang(player);
  const val = MESSAGES[lang][key] ?? MESSAGES["en"][key];
  return typeof val === "function" ? val(...args) : val;
}

function dist3(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const BIOME_ITEMS = {
  desert: ["minecraft:cactus", "minecraft:sand", "minecraft:glass"],
  plains: ["minecraft:wheat", "minecraft:carrot", "minecraft:potato"],
  forest: ["minecraft:oak_log", "minecraft:apple", "minecraft:stick"],
  taiga: ["minecraft:spruce_log", "minecraft:sweet_berries"],
  mountains: ["minecraft:cobblestone", "minecraft:coal", "minecraft:iron_ingot"],
  swamp: ["minecraft:slime_ball", "minecraft:clay_ball"],
  jungle: ["minecraft:cocoa_beans", "minecraft:bamboo", "minecraft:melon_slice"],
  ocean: ["minecraft:cod", "minecraft:salmon", "minecraft:kelp"],
  default: ["minecraft:bread", "minecraft:sugar", "minecraft:leather"]
};

function getMarketStatus(base, dimension) {
  let cycle = 0;
  try {
    const time = world.getAbsoluteTime ? world.getAbsoluteTime() : 0;
    cycle = Math.floor(time / CYCLE_TICKS);
  } catch {
    cycle = 0;
  }

  let biomeKey = "default";
  const biomeId = base.biomeId ?? "";
  for (const k of Object.keys(BIOME_ITEMS)) {
    if (biomeId.includes(k)) { biomeKey = k; break; }
  }
  const pool = BIOME_ITEMS[biomeKey] ?? BIOME_ITEMS["default"];
  const allKeys = Object.keys(BIOME_ITEMS).filter((k) => k !== biomeKey && k !== "default");
  const demandPool = BIOME_ITEMS[allKeys[cycle % allKeys.length]] ?? BIOME_ITEMS["default"];

  const specialty = pool[cycle % pool.length];
  const demanded = demandPool[(cycle + 1) % demandPool.length];

  return { biomeKey, specialty, demanded };
}

function loadBases() {
  const raw = world.getDynamicProperty(BASES_KEY);
  if (typeof raw !== "string") return [];
  try { return JSON.parse(raw); } catch { return []; }
}
function saveBases(bases) {
  world.setDynamicProperty(BASES_KEY, JSON.stringify(bases));
}
function findBaseByColor(bases, color) {
  return bases.find((b) => b.color === color);
}
function findBaseAtLocation(bases, loc, dimensionId, radius) {
  let best = null, bestDist = Infinity;
  for (const b of bases) {
    if (b.dimension !== dimensionId) continue;
    const d = dist3(b.bell, loc);
    if (d <= radius && d < bestDist) { best = b; bestDist = d; }
  }
  return best;
}
function shulkerColor(typeId) {
  if (!typeId.endsWith("shulker_box")) return null;
  return typeId.replace("minecraft:", "");
}

function findNearbyShulkerOfColor(center, dimension, radius, color) {
  const targetType = `minecraft:${color}`;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const pos = { x: center.x + dx, y: center.y + dy, z: center.z + dz };
        let block;
        try { block = dimension.getBlock(pos); } catch { continue; }
        if (block && block.typeId === targetType) return block;
      }
    }
  }
  return null;
}

// 納品先シュルカーを探すのと同時に、周辺のベッド数(=人口)も数える。
// スキャンを2回に増やさないよう、ひとつのループで両方処理する。
function findNearbyShulkerAndCountBeds(center, dimension, radius, color) {
  const targetType = `minecraft:${color}`;
  let shulkerBlock = null;
  let bedCount = 0;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const pos = { x: center.x + dx, y: center.y + dy, z: center.z + dz };
        let block;
        try { block = dimension.getBlock(pos); } catch { continue; }
        if (!block) continue;
        if (!shulkerBlock && block.typeId === targetType) shulkerBlock = block;
        if (block.typeId.endsWith("_bed") && block.permutation.getState("head_piece_bit") === true) {
          bedCount++;
        }
      }
    }
  }
  return { shulkerBlock, bedCount };
}

function findNearbyRegistrableShulker(center, dimension, radius) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const pos = { x: center.x + dx, y: center.y + dy, z: center.z + dz };
        let block;
        try { block = dimension.getBlock(pos); } catch { continue; }
        const color = block ? shulkerColor(block.typeId) : null;
        if (color && !EXCLUDED_COLORS.includes(color)) return { color, block };
      }
    }
  }
  return null;
}

function giveReward(dimension, location, amount) {
  let blocks = Math.floor(amount / EMERALD_BLOCK_VALUE);
  const remainder = amount % EMERALD_BLOCK_VALUE;
  while (blocks > 0) {
    const stackAmount = Math.min(blocks, 64);
    dimension.spawnItem(new ItemStack("minecraft:emerald_block", stackAmount), location);
    blocks -= stackAmount;
  }
  if (remainder > 0) {
    dimension.spawnItem(new ItemStack("minecraft:emerald", remainder), location);
  }
}

function deliverItemsToContainer(items, container, dimension, fallbackLocation) {
  for (const item of items) {
    const stack = new ItemStack(item.typeId, item.amount);
    const leftover = container.addItem(stack);
    if (leftover && leftover.amount > 0) {
      dimension.spawnItem(leftover, fallbackLocation);
    }
  }
}

function returnItemsToPlayer(player, items) {
  const inv = player.getComponent("minecraft:inventory")?.container;
  for (const item of items) {
    const stack = new ItemStack(item.typeId, item.amount);
    if (inv) {
      const leftover = inv.addItem(stack);
      if (leftover && leftover.amount > 0) {
        player.dimension.spawnItem(leftover, player.location);
      }
    } else {
      player.dimension.spawnItem(stack, player.location);
    }
  }
}

function getTicket(player) {
  const raw = player.getDynamicProperty(TICKET_KEY);
  if (typeof raw !== "string") return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function setTicket(player, ticket) {
  player.setDynamicProperty(TICKET_KEY, ticket ? JSON.stringify(ticket) : undefined);
}

// ============================================================
// メインイベントリスナー
// ============================================================
world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
  if (!ev.isFirstEvent) return;
  const item = ev.itemStack;
  const block = ev.block;
  const player = ev.player;
  if (!item || block.typeId !== "minecraft:bell") return;

  const dimension = block.dimension;
  const dimensionId = dimension.id.replace("minecraft:", "");
  const loc = block.location;
  const bases = loadBases();

  // ---- 木の棒: 拠点登録 / 情報確認 ----
  if (item.typeId === "minecraft:stick") {
    const already = findBaseAtLocation(bases, loc, dimensionId, 1);
    if (already) {
      const market = getMarketStatus(already, dimension);
      player.onScreenDisplay.setActionBar(
        `${t(player, "already_registered", already.color)}\n${t(player, "market_info", market.biomeKey, market.specialty.replace("minecraft:", ""), market.demanded.replace("minecraft:", ""))}`
      );
      return;
    }
    const found = findNearbyRegistrableShulker(loc, dimension, REGISTRATION_RADIUS);
    if (!found) {
      player.onScreenDisplay.setActionBar(t(player, "no_shulker_near"));
      return;
    }
    if (findBaseByColor(bases, found.color)) {
      player.onScreenDisplay.setActionBar(t(player, "color_in_use", found.color));
      return;
    }

    let biomeId = "default";
    try {
      biomeId = dimension.getBiome(loc)?.id ?? "default";
    } catch {
      biomeId = "default";
    }

    bases.push({ color: found.color, bell: loc, dimension: dimensionId, biomeId });
    saveBases(bases);
    player.onScreenDisplay.setActionBar(t(player, "base_registered", found.color, bases.length));
    return;
  }

  // ---- 本: 拠点登録の解除 ----
  if (item.typeId === "minecraft:book") {
    const existingIndex = bases.findIndex(
      (b) => b.dimension === dimensionId && dist3(b.bell, loc) <= 1
    );

    if (existingIndex === -1) {
      player.onScreenDisplay.setActionBar(t(player, "not_a_base"));
      return;
    }

    const removedColor = bases[existingIndex].color;
    bases.splice(existingIndex, 1);
    saveBases(bases);

    try { dimension.playSound("random.anvil_break", loc); } catch {}

    player.onScreenDisplay.setActionBar(t(player, "base_removed", removedColor, bases.length));
    return;
  }

  // ---- 紙: 運送の開始/終了/中止 ----
  if (item.typeId === "minecraft:paper") {
    // スニークで中止＆手元に全返却
    if (player.isSneaking) {
      const ticket = getTicket(player);
      if (ticket && ticket.items) {
        returnItemsToPlayer(player, ticket.items);
        setTicket(player, null);
        player.onScreenDisplay.setActionBar(t(player, "cancel_success", ticket.itemCount));
      } else {
        player.onScreenDisplay.setActionBar(t(player, "cancel_empty"));
      }
      return;
    }

    const thisBase = findBaseAtLocation(bases, loc, dimensionId, 1);
    if (!thisBase) {
      player.onScreenDisplay.setActionBar(t(player, "not_a_base"));
      return;
    }

    const ticket = getTicket(player);

    // ---- 運送開始 ----
    if (!ticket) {
      if (bases.length < 2) {
        player.onScreenDisplay.setActionBar(t(player, "need_two_bases"));
        return;
      }

      const shulkerBlock = findNearbyShulkerOfColor(loc, dimension, REGISTRATION_RADIUS, thisBase.color);
      if (!shulkerBlock) {
        player.onScreenDisplay.setActionBar(t(player, "no_source_shulker", thisBase.color));
        return;
      }
      const inventory = shulkerBlock.getComponent("minecraft:inventory")?.container;
      if (!inventory) return;

      const originMarket = getMarketStatus(thisBase, dimension);
      let totalValue = 0, itemCount = 0;
      const itemsToCarry = [];

      for (let i = 0; i < inventory.size; i++) {
        const stack = inventory.getItem(i);
        if (!stack) continue;

        let val = getItemValue(stack.typeId);
        if (stack.typeId === originMarket.specialty) val *= 0.5;

        totalValue += val * stack.amount;
        itemCount += stack.amount;
        itemsToCarry.push({ typeId: stack.typeId, amount: stack.amount });
        inventory.setItem(i, undefined);
      }

      if (itemCount === 0) {
        player.onScreenDisplay.setActionBar(t(player, "shulker_empty"));
        return;
      }

      setTicket(player, {
        originColor: thisBase.color,
        originBell: thisBase.bell,
        dimension: dimensionId,
        totalValue,
        itemCount,
        items: itemsToCarry
      });

      player.onScreenDisplay.setActionBar(
        t(player, "delivery_started", itemCount, thisBase.color, originMarket.specialty.replace("minecraft:", ""), originMarket.demanded.replace("minecraft:", ""))
      );
      return;
    }

    // ---- 運送中（同じ拠点ベルの場合） ----
    if (thisBase.color === ticket.originColor) {
      player.onScreenDisplay.setActionBar(t(player, "delivery_same_base"));
      return;
    }

    // ---- 【安全対策】納品先シュルカーの有無・空き枠チェック ----
    // (このスキャンで周辺のベッド数=人口も一緒に数える)
    const { shulkerBlock: targetShulker, bedCount } =
      findNearbyShulkerAndCountBeds(loc, dimension, REGISTRATION_RADIUS, thisBase.color);
    const targetInv = targetShulker?.getComponent("minecraft:inventory")?.container;

    if (!targetShulker || !targetInv) {
      // シュルカーが無い場合は納品させずに保留！
      player.onScreenDisplay.setActionBar(t(player, "no_dest_shulker", thisBase.color));
      return;
    }

    // 空きスロット数の確認
    let emptySlots = 0;
    for (let i = 0; i < targetInv.size; i++) {
      if (!targetInv.getItem(i)) emptySlots++;
    }
    if (emptySlots < ticket.items.length) {
      // 空きスロットが不足している場合も保留！
      player.onScreenDisplay.setActionBar(t(player, "dest_shulker_full", thisBase.color));
      return;
    }

    // ---- 納品完了処理 ----
    const destMarket = getMarketStatus(thisBase, dimension);
    let finalValue = ticket.totalValue;

    for (const it of ticket.items) {
      if (it.typeId === destMarket.demanded) {
        finalValue += getItemValue(it.typeId) * it.amount * 1.0;
      }
    }

    const distance = dist3(ticket.originBell, loc);
    // 距離ボーナスは上限なし(遠くまで運ぶほど常に得になる)
    const distanceBonus = 1 + Math.floor(distance / DISTANCE_BONUS_PER_BLOCKS) * DISTANCE_BONUS_RATE;
    // 人口ボーナスも上限なし(納品先にベッドが多いほど得になる)
    const populationBonus = 1 + bedCount * BED_BONUS_RATE;
    const bonus = distanceBonus * populationBonus;
    const reward = Math.max(1, Math.round(finalValue * bonus));

    // 安全にシュルカーへ格納
    deliverItemsToContainer(ticket.items, targetInv, dimension, loc);

    giveReward(player.dimension, loc, reward);
    setTicket(player, null);

    player.onScreenDisplay.setActionBar(
      t(player, "delivery_complete", distance, distanceBonus, bedCount, populationBonus, ticket.itemCount, reward)
    );

    try {
      const objective =
        world.scoreboard.getObjective("logistics_score") ??
        world.scoreboard.addObjective("logistics_score", "輸送スコア");
      objective.addScore(player, reward);
    } catch (e) {}
  }
});