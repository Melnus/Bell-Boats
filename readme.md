# BellBoats - Logistics & Trade Network

BellBoats is a logistics and trade network add-on for Minecraft Bedrock Edition. Connect your bases using bells and dyed shulker boxes, embark on long-distance delivery routes via boats, rails, or horseback, and earn emeralds based on cargo value, travel distance, and village population.

→日本語版は[こちら](/readme_jp.md)

---

## Overview

Install this add-on to establish trading hubs across your world. Pack goods into a designated shulker box, initiate transport at a bell, and deliver the cargo to another base to receive emerald payouts scaled by cargo worth, travel distance, and destination bed counts.

---

## Required Items & Controls

Interact with any placed Bell (`minecraft:bell`) while holding the following items:

| Item | Control | Function |
| :--- | :--- | :--- |
| **Stick** | Right-click Bell | **Register new base** / **Check local market data** |
| **Book** | Right-click Bell | **Dismantle (unregister) base** |
| **Paper** | Right-click Bell | **Start delivery** / **Complete delivery** |
| **Paper** | Sneak + Right-click Bell | **Cancel delivery (return all cargo)** |

---

## How to Set Up a Trade Network

### 1. Registering a Base
1. Place a Bell (`minecraft:bell`) at your desired station or dock.
2. Place a dyed Shulker Box within a **12-block radius** of the bell.
   - Undyed default shulker boxes cannot be used. Dye the box with any of the 16 colors.
   - Each registered base must use a unique color (colors cannot be shared across bases).
3. Right-click the bell with a **Stick** to register it as a trade hub of that color.
4. You must register **at least two bases** to begin trading.

### 2. Starting a Delivery
1. Place the cargo items you wish to transport into the registered shulker box at your origin base.
2. Right-click the origin bell while holding **Paper**.
3. All contents from the shulker box are automatically withdrawn into your digital delivery ticket, initiating transport mode.

### 3. Completing a Delivery
1. Travel to another registered base via boat, horse, minecart, or foot.
2. Ensure that a shulker box matching the destination's assigned color is placed within a 12-block radius of the destination bell.
3. Right-click the destination bell while holding **Paper**.
4. The cargo will be safely deposited into the destination shulker box, and your delivery fee will be rewarded in emeralds (and emerald blocks for large sums).

---

## Economy, Pricing & Bonus Multipliers

The final emerald reward is calculated using the following formula:

```
Final Reward = Total Base Cargo Value × Distance Multiplier × Population Multiplier
```

### 1. Base Item Values (`item-values.js`)
Items have pre-configured baseline emerald values:
- Netherite Ingot: 12 E
- Diamond: 4 E
- Iron Ingot: 0.4 E
- Cobblestone / Dirt / Sand: 0.01 E
- Any item without an explicit entry is automatically assigned a reasonable baseline value via keyword pattern matching (ores, tools, logs, etc.).

### 2. Biome Specialties & Market Cycles
Each base features rotating local specialties and demanded goods based on its biome, updating roughly every three in-game days:
- **Local Specialty (0.5x Purchase Cost)**: Goods native to the origin biome cost half their normal value to procure.
- **Demanded Goods (2.0x Sale Value)**: Delivering items that the destination base currently demands doubles their baseline payout.
- Right-click any registered bell with a **Stick** to display its current biome, local specialty, and demanded item.

### 3. Distance Bonus
- Adds **+10% (x0.1) per 100 blocks** of direct linear distance between the origin and destination bells.
- There is no upper limit: delivering across thousands of blocks yields immense payouts.

### 4. Population (Bed) Bonus
- Adds **+10% (x0.1) per bed** detected within a 12-block radius of the destination bell.
- Delivering to thriving villages or large player-built settlements with many beds dramatically increases revenue. There is no upper limit.

---

## Safety & Cargo Protection

Built-in fail-safes prevent cargo duplication or accidental item loss:

- **Storage Space Verification**: If the destination shulker box is missing, broken, or lacks enough open slots to hold the incoming shipment, delivery will pause with an alert message. The cargo remains secured in your ticket until space is cleared.
- **Delivery Cancellation**: If you decide to cancel mid-route, sneak and right-click any bell with **Paper** to return all items directly into your inventory. Excess items drop safely at your feet.

---

## Scoreboard Integration

Every successful delivery automatically adds the earned emerald amount to the `logistics_score` objective on the world scoreboard, allowing server administrators to track trade volume and rank top haulers.

---

## Credits & Specifications

- Add-on Name: BellBoats
- Version: 0.1.2
- Author: Melnus
- Target Platform: Minecraft Bedrock Edition 1.21.0 or higher (Script API enabled)
```
