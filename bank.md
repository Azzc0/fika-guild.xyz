Here is the comprehensive documentation of your custom `Scanner.lua` data format. You can copy this documentation block directly into your project notes or keep it handy for future refactoring.

---

## 📘 Specification: Guild Bank Data Format

Your system packs an entire 98-slot guild bank tab into a highly optimized, client-side alphanumeric string using a base-36 algorithm ($0\dots9, A\dotsZ$) to minimize transit file size.

### 1. Root Level Structure

The JSON payload consists of an object containing `string: string` key-value pairs where the keys determine the data type:

* **Key `"0"**`: Total guild funds represented as a plain integer string in total copper (e.g., `"19213405"`).
* **Keys ending in `0` (`10`, `20`, `30`, etc.)**: Tab Metadata headers.
* **Keys ending in `1` through `4` (`11-14`, `21-24`, etc.)**: Item rows split into specific slot range chunks.

### 2. Metadata Header Specification

Every key ending in `0` maps to a string containing three data segments delimited by a colon (`:`):

```
"10": "[TAB_NAME]:[ICON_NAME]:[UNIX_TIMESTAMP]"

```

* **`TAB_NAME`**: The clean string name of the guild bank tab (e.g., `Kaffebordet`).
* **`ICON_NAME`**: The raw texture string asset identification (e.g., `INV_MISC_BEER_02`).
* **`UNIX_TIMESTAMP`**: A 10-digit epoch integer marking exactly when that individual tab scan completed on the game server.

### 3. Grid Chunks Specification

Each bank tab has 98 interactive item slots total, broken down by your Lua engine into 4 string segments:

* **`TabKey + 1`**: Slots $1 \dots 25$
* **`TabKey + 2`**: Slots $26 \dots 50$
* **`TabKey + 3`**: Slots $51 \dots 75$
* **`TabKey + 4`**: Slots $76 \dots 98$

#### Token Segmentation (The 8-Character Block)

If a chunk contains items, it forms a concatenated string of 8-character long data tokens. If a chunk contains no items, it reads as exactly `"EMPTY"`.

Each 8-character block breaks down into three precise positional slices:

```
  01   0AQU   01
  ──   ────   ──
  ▲     ▲     ▲
  │     │     └─ [Chars 7-8] Stack Count (Decodes from Base-36)
  │     └─────── [Chars 3-6] Item ID Database Reference (Decodes from Base-36)
  └───────────── [Chars 1-2] Grid Slot Index (Decodes from Base-36)

```
