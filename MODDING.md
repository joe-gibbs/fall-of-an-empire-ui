# WebUI Modding

The WebUI mod path is a small React package inside a content pack. The source lives in the mod. The game loads the built script and stylesheet from the mod's `mod.json`.

Use `Mods/Sicily827/WebUI/` as the maintained example.

## Layout

```text
Mods/
  YourModName/
    mod.json
    WebUI/
      package.json
      vite.config.ts
      src/
      public/
        assets/
      dist/
```

Write TypeScript, React, CSS, and source PNG/JPG files under `WebUI/`. Do not edit `dist/` by hand. The build creates the packaged JavaScript, CSS, and generated WebP assets.

`mod.json` points at the built files:

```json
"webui": {
  "localization": "WebUI/Localization/{locale}.po",
  "entries": [
    {
      "id": "your_mod_screen",
      "script": "WebUI/dist/index.js"
    }
  ],
  "styles": ["WebUI/dist/style.css"]
}
```

## Localisation

Mod WebUI text uses PO catalogues declared by `webui.localization`. Use `{locale}` in the path; the runtime loads `en`, the base locale, and the current locale in that order. Missing translated entries fall back to the English PO entry.

```text
Mods/
  YourModName/
    WebUI/
      Localization/
        en.po
        de.po
```

Use `msgctxt` as the stable WebUI key:

```po
msgctxt "YourMod.Screen.Title"
msgid "Command"
msgstr "Command"
```

Mod code can read text through the SDK:

```ts
const { localization: { t } } = globalThis.FOAE;

t('YourMod.Screen.Title');
t('YourMod.Screen.Count', { Count: 3 });
```

Build one mod:

```powershell
python Automation/build_mod_webui.py YourModName
```

Build every mod WebUI package:

```powershell
python Automation/build_mod_webui.py --all
```

## Runtime SDK

The host publishes the SDK on `globalThis.FOAE`. Mods can also import from `@foae/sdk` when their Vite config maps that import to `/sdk/foae-sdk.js`.

The TypeScript declaration for that public surface is:

```text
WebUI/public/sdk/foae-sdk.d.ts
```

The runtime shim is:

```text
WebUI/public/sdk/foae-sdk.js
```

The SDK exposes:

- `registerScreen`, `registerSidebar`, and `registerTopbarButton`
- common components such as `ScreenShell`, `SectionHeading`, `GameButton`, and `Panel`
- data hooks such as `useGameState`, `useFaction`, `useSettlement`, and `usePlayerFactionId`
- `bridgeCall` and `onBridgeEvent` for mod-owned bridge actions
- image preload helpers

Keep mod code on that surface. Do not import from `WebUI/src/`; those files are the base game's implementation and can move.

## Generated Files

These files are generated and should not be edited by hand:

- `WebUI/src/bridge-types.generated.ts`
- `WebUI/src/localization/webui-text.generated.ts`
- `Mods/<ModId>/WebUI/dist/`
- generated WebP files under mod WebUI `dist/assets/`

Change the source files, then rerun the relevant generator or build helper.

## Sample Mod

`Mods/Sicily827/WebUI/` shows the current supported pattern:

- `src/index.tsx` registers a screen and topbar button through `globalThis.FOAE`
- `src/foae-sdk.d.ts` references the shared host SDK declaration and keeps only Sicily-specific payload types
- `public/assets/` contains source images
- `dist/` is build output

The sample is intentionally campaign-specific. Copy the package shape and SDK usage, not the Sicily game rules.
