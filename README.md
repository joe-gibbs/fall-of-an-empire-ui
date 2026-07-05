# Fall of an Empire WebUI

The WebUI is the React/TypeScript source for the FoaeCefUI interface. In game it talks to Unreal through generated bridge actions. For browser-only UI work, run the mock bridge instead.

For WebUI modding, see [MODDING.md](MODDING.md). It covers the `mod.json` `webui` block, the `@foae/sdk` surface, generated files, and the Sicily sample mod.

## Browser Mock Mode

```powershell
npm.cmd run dev:mock
```

Open the printed Vite URL. The mock bridge installs a browser `window.engine`, returns fixture data for the generated bridge actions, and adds a small launcher in the bottom-right corner for opening registered screens, sidebars, events, and the courtier-promotion modal.

Useful direct URLs:

```text
http://localhost:5173/?mock=1&screen=economy
http://localhost:5173/?mock=1&screen=military
http://localhost:5173/?mock=1&sidebar=settlement&id=mock-settlement-capital
http://localhost:5173/?mock=1&sidebar=character&id=mock-person-ruler
http://localhost:5173/?mock=1&event=1
http://localhost:5173/?mock=1&outcome=victory
http://localhost:5173/?mock=1&outcome=defeat&cause=conquest
http://localhost:5173/?mock=1&mode=mainmenu
```

The mock lives under `src/dev/` and is only installed in Vite dev mode when `--mode mock`, `VITE_FOAE_MOCK_UI=1`, or `?mock=1` is present. Production builds keep using the real runtime bridge.

## Checks

```powershell
npm.cmd run lint
npm.cmd run build
```
