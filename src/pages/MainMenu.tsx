import React, { useCallback, useEffect, useRef, useState } from 'react';
import LitLogo from '../components/common/layout/content/LitLogo';
import SettingsPanel from '../components/settings/SettingsPanel';
import EncyclopediaScreen from '../components/screens/encyclopedia/EncyclopediaScreen';
import AchievementsScreen from '../components/screens/system/AchievementsScreen';
import LoadGameModal from '../components/screens/system/LoadGameModal';
import FactionSelection from './FactionSelection';
import LanguageSelector from '../components/mainmenu/LanguageSelector';
import Tooltip from '../components/common/tooltips/Tooltip';
import GameButton from '../components/common/buttons/GameButton';
import DropdownSelect, { type DropdownSelectOption } from '../components/common/forms/DropdownSelect';
import ContinueHeroCard from './main-menu/ContinueHeroCard';
import CreditsRoll from './main-menu/CreditsRoll';
import './main-menu/MainMenu.css';
import { bridgeCall, onBridgeEvent } from '../bridge-types.generated.ts';
import type { GetNewGameMapFactionSelectionResponse } from '../bridge-types.generated.ts';
import type { SaveEntry } from '../bridge/app/useSavesBridge';
import { useModsBridge } from '../bridge/app/useModsBridge';
import type { ModEntry, SteamWorkshopItem } from '../bridge/app/useModsBridge';
import { useEscapeStackEntry } from '../context/EscapeStack';

import { useWebUILocale, webUIText, WebUIText } from '../localization/WebUITextContext';
type MenuView = 'menu' | 'settings' | 'achievements' | 'mods' | 'encyclopedia' | 'credits' | 'newgame';
type ModsPanelView = 'installed' | 'workshop' | 'subscribed';

interface NewGameMapEntry {
  id: string;
  displayName: string;
  menuKicker: string;
  menuDescription: string;
  menuImageUrl: string;
  menuOrder: number;
  requiresFactionSelection: boolean;
}

const LOAD_GAME_CARD_IMAGE = '/assets/events/library-archive.png';
const MAIN_MENU_ROW_WIDTH_REM = 76;
const MAIN_MENU_CONTINUE_CARD_WIDTH_REM = 21.5;
const MAIN_MENU_LOAD_GAME_SLOT_WIDTH_REM = 6.75;
const WORKSHOP_CATEGORY_LABEL_KEYS: Record<string, string> = {
  Campaign: 'MainMenu.WorkshopCategoryCampaign',
  Map: 'MainMenu.WorkshopCategoryMap',
  Gameplay: 'MainMenu.WorkshopCategoryGameplay',
  Faction: 'MainMenu.WorkshopCategoryFaction',
  Units: 'MainMenu.WorkshopCategoryUnits',
  Buildings: 'MainMenu.WorkshopCategoryBuildings',
  UI: 'MainMenu.WorkshopCategoryUI',
  'Total Conversion': 'MainMenu.WorkshopCategoryTotalConversion',
  Translation: 'MainMenu.WorkshopCategoryTranslation',
};

interface MainMenuIllustratedButtonData {
  id: string;
  variant: 'load-game' | 'scenario';
  label: string;
  kicker?: string;
  description?: string;
  img?: string;
  onClick: () => void;
}

type MainMenuSlotData =
  | { kind: 'button'; key: string; slotClass: string; button: MainMenuIllustratedButtonData }
  | { kind: 'scenarios'; key: string; buttons: MainMenuIllustratedButtonData[] }
  | { kind: 'continue'; key: string };

function compareScenarioMaps(left: NewGameMapEntry, right: NewGameMapEntry): number {
  if (left.menuOrder !== right.menuOrder) return left.menuOrder - right.menuOrder;
  const nameCompare = left.displayName.localeCompare(right.displayName);
  if (nameCompare !== 0) return nameCompare;
  return left.id.localeCompare(right.id);
}

const MainMenu: React.FC = () => {
  const locale = useWebUILocale();
  const [view, setView] = useState<MenuView>('menu');

  const [skipMenuIntro, setSkipMenuIntro] = useState(false);
  const [closing, setClosing] = useState(false);
  const [latestSave, setLatestSave] = useState<SaveEntry | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [steamAchievementsAvailable, setSteamAchievementsAvailable] = useState<boolean | null>(null);
  const [showLoad, setShowLoad] = useState(false);
  const [newGameMaps, setNewGameMaps] = useState<NewGameMapEntry[]>([]);
  const [selectedNewGameMap, setSelectedNewGameMap] = useState<NewGameMapEntry | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [modsPanelView, setModsPanelView] = useState<ModsPanelView>('installed');
  const [workshopSearchDraft, setWorkshopSearchDraft] = useState('');
  const [factionSelectionCache, setFactionSelectionCache] = useState<Record<string, GetNewGameMapFactionSelectionResponse>>({});
  const closeTimerRef = useRef<number | null>(null);
  const lastIllustratedPointerActivationAtRef = useRef(0);
  const factionSelectionCacheRef = useRef(new Map<string, GetNewGameMapFactionSelectionResponse>());
  const factionSelectionRequestRef = useRef(new Map<string, Promise<GetNewGameMapFactionSelectionResponse>>());
  const SUB_VIEW_CLOSE_MS = 200;

  const {
    mods,
    setEnabled: setModEnabled,
    uploadMod,
    uploadStatuses,
    workshopItems,
    subscribedWorkshopItems,
    workshopOperations,
    steamWorkshopAvailable,
    workshopCategories,
    workshopCategory,
    setWorkshopCategory,
    workshopSearchText,
    workshopPage,
    workshopTotalResults,
    workshopError,
    subscribedWorkshopError,
    workshopQueryInProgress,
    subscribedWorkshopQueryInProgress,
    modChangesRequireRestart,
    workshopChangesRequireRestart,
    browseWorkshop,
    refreshSubscribedWorkshop,
    subscribeWorkshopItem,
    unsubscribeWorkshopItem,
    downloadWorkshopItem,
  } = useModsBridge(view === 'mods');

  const modsNeedRestart = modChangesRequireRestart || workshopChangesRequireRestart;
  const activeModsPanelView: ModsPanelView = steamWorkshopAvailable ? modsPanelView : 'installed';
  const translatedNewGameMaps = newGameMaps;

  const preloadFactionSelection = useCallback((mapId: string) => {
    const cacheKey = `${locale}:${mapId}`;
    const cached = factionSelectionCacheRef.current.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    const existingRequest = factionSelectionRequestRef.current.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = bridgeCall('game.get_new_game_map_faction_selection', { mapId })
      .then((response) => {
        factionSelectionCacheRef.current.set(cacheKey, response);
        setFactionSelectionCache((current) => ({
          ...current,
          [cacheKey]: response,
        }));
        factionSelectionRequestRef.current.delete(cacheKey);
        return response;
      })
      .catch((error) => {
        factionSelectionRequestRef.current.delete(cacheKey);
        throw error;
      });

    factionSelectionRequestRef.current.set(cacheKey, request);
    return request;
  }, [locale]);

  // Track latest save metadata so the Continue card can show character/faction/date.
  // Subscribes to list_saves pushes so deletions keep it in sync.
  useEffect(() => {
    let cancelled = false;
    const applyList = (all: SaveEntry[]) => {
      if (all.length === 0) {
        setLatestSave(null);
        return;
      }
      setLatestSave(all.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)));
    };
    (async () => {
      try {
        const res = await bridgeCall('game.list_saves');
        if (!cancelled) {
          applyList(res.saves ?? []);
          setMenuError(res.loadError || null);
        }
      } catch {
        if (!cancelled) {
          setLatestSave(null);
        }
      }
    })();
    const unsub = onBridgeEvent('game.list_saves', (data) => {
      if (!cancelled) {
        applyList(data.saves ?? []);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await bridgeCall('game.get_game_version');
        if (!cancelled) setVersion(res.version ?? null);
      } catch {
        if (!cancelled) setVersion(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyAchievementAvailability = (response: { steamAvailable: boolean }) => {
      if (!cancelled) setSteamAchievementsAvailable(response.steamAvailable);
    };
    const unsubscribe = onBridgeEvent('game.achievement_events', applyAchievementAvailability);

    bridgeCall('game.achievement_events')
      .then(applyAchievementAvailability)
      .catch(() => {
        if (!cancelled) setSteamAchievementsAvailable(null);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await bridgeCall('game.list_new_game_maps');
        if (!cancelled) {
          const maps = res.maps ?? [];
          setNewGameMaps(maps);
          maps
            .filter((map) => map.requiresFactionSelection)
            .forEach((map) => {
              void preloadFactionSelection(map.id).catch((error) => {
                console.error('[MainMenu] preloading faction selection failed', error);
              });
            });
        }
      } catch {
        if (!cancelled) {
          setNewGameMaps([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, modsNeedRestart, preloadFactionSelection]);

  const handleContinue = async () => {
    try {
      setMenuError(null);
      await bridgeCall('game.continue');
    } catch (err) {
      console.error('[MainMenu] continue failed', err);
      setMenuError(err instanceof Error ? err.message : webUIText('MainMenu.LoadSaveFailed'));
    }
  };

  const handleStartScenarioMap = async (mapId: string, playerFactionBaseName = '') => {
    if (modsNeedRestart) {
      openSubView('mods');
      return;
    }

    try {
      await bridgeCall('game.start_scenario_map', { mapId, playerFactionBaseName });
    } catch (err) {
      console.error('[MainMenu] start scenario map failed', err);
    }
  };

  const handleSelectScenarioMap = (map: NewGameMapEntry) => {
    if (map.requiresFactionSelection) {
      setSelectedNewGameMap(map);
      void preloadFactionSelection(map.id).catch((error) => {
        console.error('[MainMenu] preloading faction selection failed', error);
      });
      openSubView('newgame');
      return;
    }

    void handleStartScenarioMap(map.id);
  };

  const handleQuit = async () => {
    try {
      await bridgeCall('game.quit');
    } catch (err) {
      console.error('[MainMenu] quit failed', err);
    }
  };

  const handleRestart = async () => {
    try {
      await bridgeCall('game.restart');
    } catch (err) {
      console.error('[MainMenu] restart failed', err);
    }
  };

  const handleToggleMod = async (mod: ModEntry) => {
    await setModEnabled(mod.id, !mod.enabled);
  };

  const handleUploadMod = async (mod: ModEntry) => {
    await uploadMod(mod.id);
  };

  const handleWorkshopSearch = async (page = 1) => {
    await browseWorkshop(workshopSearchDraft.trim(), page, workshopCategory);
  };

  const handleOpenWorkshopItem = async (url: string) => {
    if (!url) return;
    try {
      await bridgeCall('ui.open_external_url', { url });
    } catch (err) {
      console.error('[MainMenu] open workshop item failed', err);
    }
  };

  const renderModActionButton = (
    key: string,
    variant: 'burgundy' | 'outline' | 'ghost',
    disabled: boolean,
    onClick: () => void,
    content: React.ReactNode,
  ) => (
    <span
      key={key}
      className="mm-mod-action-wrap"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <GameButton
        variant={variant}
        disabled={disabled}
        className="mm-mod-action-btn"
        onClick={onClick}
      >
        {content}
      </GameButton>
    </span>
  );

  const openExternalLink = async (linkId: string) => {
    try {
      await bridgeCall('ui.open_external_link', { linkId });
    } catch (err) {
      console.error('[MainMenu] open external link failed', err);
    }
  };

  useEffect(() => {
    if (!closing) return;
    closeTimerRef.current = window.setTimeout(() => {
      setView('menu');
      setClosing(false);
      setSelectedNewGameMap(null);
      closeTimerRef.current = null;
    }, SUB_VIEW_CLOSE_MS);
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [closing]);

  const goBack = () => {
    if (closing || view === 'menu') return;
    setClosing(true);
  };

  useEscapeStackEntry({
    id: 'main-menu.sub-view',
    active: view !== 'menu' && !showLoad && !closing,
    orderKey: `main-menu.${view}`,
    onClose: goBack,
  });

  const openSubView = (nextView: Exclude<MenuView, 'menu'>) => {
    setClosing(false);
    setSkipMenuIntro(true);
    setView(nextView);
  };

  const subViewClass = `mm-sub-view${closing ? ' mm-sub-view--closing' : ''}`;

  /* Sub views */
  const renderBackHeader = (title: string) => (
    <div className="mm-sub-header">
      <button
        className="mm-back-btn"
        onMouseDown={(event) => {
          event.preventDefault();
          goBack();
        }}
      >
        <span className="mm-back-arrow" aria-hidden="true" /><span><WebUIText textKey="Auto.PagesMainMenu.362.7" /></span>
      </button>
      <h2 className="mm-sub-title">{title}</h2>
    </div>
  );

  const renderSettings = () => (
    <div className={subViewClass}>
      {renderBackHeader(webUIText('MainMenu.SubviewSettings'))}
      <SettingsPanel />
    </div>
  );

  const workshopCategoryOptions: DropdownSelectOption[] = [
    { value: '', label: webUIText('MainMenu.WorkshopCategoryAll') },
    ...workshopCategories.map(category => ({
      value: category,
      label: WORKSHOP_CATEGORY_LABEL_KEYS[category]
        ? webUIText(WORKSHOP_CATEGORY_LABEL_KEYS[category])
        : category,
    })),
  ];

  const renderWorkshopItem = (item: SteamWorkshopItem) => {
    const operation = workshopOperations[item.publishedFileId];
    const isUnsubscribed = operation?.state === 'unsubscribed';
    const isSubscribed = !isUnsubscribed && item.subscribed;
    const installedModId = isUnsubscribed ? '' : item.installedModId;
    const busy = operation?.state === 'subscribing'
      || operation?.state === 'unsubscribing'
      || operation?.state === 'downloading';
    const statusKey = operation?.state === 'subscribing'
      ? 'MainMenu.WorkshopStatusSubscribing'
      : operation?.state === 'unsubscribing'
        ? 'MainMenu.WorkshopStatusUnsubscribing'
        : operation?.state === 'downloading'
          ? 'MainMenu.WorkshopStatusDownloading'
          : operation?.state === 'installed'
            ? 'MainMenu.WorkshopStatusInstalled'
            : operation?.state === 'unsubscribed'
              ? 'MainMenu.WorkshopStatusUnsubscribed'
              : operation?.state === 'failed'
                ? 'MainMenu.WorkshopStatusFailed'
                : installedModId
                  ? 'MainMenu.WorkshopStatusInstalled'
                  : isSubscribed
                    ? 'MainMenu.WorkshopStatusSubscribed'
                    : '';
    const progress = item.downloadTotalBytes > 0
      ? Math.max(0, Math.min(100, Math.round((item.downloadBytes / item.downloadTotalBytes) * 100)))
      : 0;
    const itemUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedFileId}`;
    const canDownload = isSubscribed && (item.needsUpdate || !installedModId);
    const itemCategories = (item.categories ?? []).filter(Boolean);

    return (
      <div key={item.publishedFileId} className={`mm-mod-entry mm-workshop-entry ${isSubscribed ? 'mm-mod-entry--enabled' : ''}`}>
        <div className="mm-workshop-thumb" aria-hidden="true">
          {item.previewUrl ? (
            <img src={item.previewUrl} alt="" draggable={false} />
          ) : (
            <span />
          )}
        </div>
        <div className="mm-mod-info">
          <span className="mm-mod-name">
            {item.title || webUIText('MainMenu.WorkshopUntitled')}
          </span>
          <span className="mm-mod-author">
            {webUIText('MainMenu.WorkshopVotes', { Votes: item.votesUp })}
          </span>
          {itemCategories.length > 0 && (
            <span className="mm-workshop-categories">
              {itemCategories.map(category => WORKSHOP_CATEGORY_LABEL_KEYS[category]
                ? webUIText(WORKSHOP_CATEGORY_LABEL_KEYS[category])
                : category).join(', ')}
            </span>
          )}
          {item.description && <span className="mm-mod-desc">{item.description}</span>}
          {statusKey && (
            <span className={`mm-mod-upload-status mm-workshop-status--${operation?.state ?? 'idle'}`}>
              <WebUIText textKey={statusKey} />
              {operation?.state === 'downloading' && progress > 0 ? ` ${progress}%` : ''}
            </span>
          )}
          {installedModId && (
            <span className="mm-mod-upload-status">
              {webUIText('MainMenu.WorkshopInstalledAs', { ModId: installedModId })}
            </span>
          )}
          {operation?.error && (
            <span className="mm-mod-upload-status mm-mod-upload-status--failed">{operation.error}</span>
          )}
        </div>
        <div className="mm-mod-controls">
          {renderModActionButton('open', 'outline', false, () => {
            void handleOpenWorkshopItem(itemUrl);
          }, <WebUIText textKey="MainMenu.WorkshopOpen" />)}
          {!isSubscribed && (
            renderModActionButton('subscribe', 'burgundy', busy, () => {
              void subscribeWorkshopItem(item.publishedFileId);
            }, <WebUIText textKey="MainMenu.WorkshopSubscribe" />)
          )}
          {canDownload && (
            renderModActionButton('download', 'burgundy', busy, () => {
              void downloadWorkshopItem(item.publishedFileId);
            }, <WebUIText textKey={item.needsUpdate ? 'MainMenu.WorkshopUpdate' : 'MainMenu.WorkshopInstall'} />)
          )}
          {isSubscribed && (
            renderModActionButton('unsubscribe', 'outline', busy, () => {
              void unsubscribeWorkshopItem(item.publishedFileId);
            }, <WebUIText textKey="MainMenu.WorkshopUnsubscribe" />)
          )}
        </div>
      </div>
    );
  };

  const renderMods = () => (
    <div className={subViewClass}>
      {renderBackHeader(webUIText('MainMenu.SubviewMods'))}
      <div className="mm-list-body">
        <div className="mm-mod-tabs">
          {([
            ['installed', 'MainMenu.ModTabInstalled'],
            ...(steamWorkshopAvailable
              ? [
                ['workshop', 'MainMenu.ModTabWorkshop'],
                ['subscribed', 'MainMenu.ModTabSubscribed'],
              ] as const
              : []),
          ] as const).map(([tab, labelKey]) => (
            <button
              key={tab}
              className={`mm-mod-tab ${activeModsPanelView === tab ? 'mm-mod-tab--active' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                setModsPanelView(tab);
                if (tab === 'subscribed') void refreshSubscribedWorkshop();
              }}
            >
              <WebUIText textKey={labelKey} />
            </button>
          ))}
        </div>

        {activeModsPanelView === 'installed' && mods === null && (
          <div className="mm-list-empty"><WebUIText textKey="Auto.PagesMainMenu.380.8" /></div>
        )}
        {activeModsPanelView === 'installed' && mods !== null && mods.length === 0 && (
          <div className="mm-list-empty"><WebUIText textKey="Auto.PagesMainMenu.383.9" /></div>
        )}
        {activeModsPanelView === 'installed' && mods !== null && mods.length > 0 && (
          <p className="mm-mod-notice">
            <WebUIText textKey="Auto.PagesMainMenu.387.10" />
          </p>
        )}
        {modsNeedRestart && (
          <div className="mm-mod-restart-panel">
            <span className="mm-mod-restart-copy"><WebUIText textKey="MainMenu.ModRestartRequired" /></span>
            <button
              className="mm-mod-restart-btn"
              onMouseDown={(event) => {
                event.preventDefault();
                void handleRestart();
              }}
            >
              <WebUIText textKey="MainMenu.RestartNow" />
            </button>
          </div>
        )}
        {activeModsPanelView === 'installed' && mods !== null && mods.map(mod => {
          const uploadStatus = uploadStatuses[mod.id];
          const uploadInProgress = uploadStatus?.state === 'preparing' || uploadStatus?.state === 'uploading';
          const uploadLabel = uploadInProgress
            ? webUIText('MainMenu.ModUploading')
            : uploadStatus?.publishedFileId
              ? webUIText('MainMenu.ModUpdate')
              : webUIText('MainMenu.ModUpload');
          const uploadStatusText = uploadStatus
            ? uploadStatus.state === 'preparing'
              ? webUIText('MainMenu.ModUploadPreparing')
              : uploadStatus.state === 'uploading'
                ? webUIText('MainMenu.ModUploading')
                : uploadStatus.state === 'succeeded'
                  ? webUIText('MainMenu.ModUploaded')
                  : webUIText('MainMenu.ModUploadFailed')
            : '';
          return (
            <div
              key={mod.id}
              className={`mm-mod-entry ${mod.enabled ? 'mm-mod-entry--enabled' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                void handleToggleMod(mod);
              }}
            >
              <div className="mm-mod-info">
                <span className="mm-mod-name">
                  {mod.name}
                  {mod.version ? <span className="mm-mod-version">{webUIText("Auto.Fix.Expr.pagesMainMenu.396.1", { Version: mod.version })}</span> : null}
                </span>
                {mod.author && <span className="mm-mod-author">{webUIText('MainMenu.ModAuthor', { Author: mod.author })}</span>}
                {mod.description && <span className="mm-mod-desc">{mod.description}</span>}
                {uploadStatusText && (
                  <span className={`mm-mod-upload-status mm-mod-upload-status--${uploadStatus?.state ?? 'idle'}`}>
                    {uploadStatusText}
                  </span>
                )}
                {uploadStatus?.needsLegalAgreement && (
                  <span className="mm-mod-upload-status mm-mod-upload-status--failed">
                    {webUIText('MainMenu.ModWorkshopLegalRequired')}
                  </span>
                )}
              </div>
              <div className="mm-mod-controls">
                {mod.canUploadToWorkshop && (
                  renderModActionButton('upload', 'burgundy', uploadInProgress, () => {
                    void handleUploadMod(mod);
                  }, uploadLabel)
                )}
                {uploadStatus?.url && (
                  renderModActionButton('open-workshop', 'outline', false, () => {
                    void handleOpenWorkshopItem(uploadStatus.url);
                  }, webUIText('MainMenu.ModWorkshopOpen'))
                )}
                <div
                  className={`mm-toggle ${mod.enabled ? 'mm-toggle--on' : ''}`}
                  aria-hidden="true"
                >
                  <div className="mm-toggle-knob" />
                </div>
              </div>
            </div>
          );
        })}
        {activeModsPanelView === 'workshop' && (
          <div className="mm-workshop-panel">
            <div className="mm-workshop-search">
              <input
                className="mm-workshop-search-input"
                value={workshopSearchDraft}
                placeholder={webUIText('MainMenu.WorkshopSearchPlaceholder')}
                onChange={(event) => setWorkshopSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleWorkshopSearch(1);
                  }
                }}
              />
              <DropdownSelect
                id="main-menu-workshop-category"
                className="mm-workshop-category-select"
                triggerClassName="mm-workshop-category-trigger"
                textClassName="mm-workshop-category-text"
                chevronClassName="mm-workshop-category-chevron"
                menuClassName="mm-workshop-category-menu"
                optionClassName="mm-workshop-category-option"
                optionActiveClassName="mm-workshop-category-option--active"
                value={workshopCategory}
                options={workshopCategoryOptions}
                escapeId="main-menu.workshop.category"
                isActive={false}
                position="below-left"
                portal
                closeOnScroll
                onChange={(nextCategory) => {
                  setWorkshopCategory(nextCategory);
                  void browseWorkshop(workshopSearchDraft.trim(), 1, nextCategory);
                }}
              />
              <GameButton
                variant="burgundy"
                className="mm-mod-action-btn"
                onClick={() => {
                  void handleWorkshopSearch(1);
                }}
              >
                <WebUIText textKey="MainMenu.WorkshopSearch" />
              </GameButton>
            </div>
            <div className="mm-workshop-toolbar">
              <span className="mm-workshop-page">{webUIText('MainMenu.WorkshopPage', { Page: workshopPage })}</span>
              <div className="mm-workshop-page-actions">
                <GameButton
                  variant="outline"
                  className="mm-mod-action-btn"
                  disabled={workshopQueryInProgress || workshopPage <= 1}
                  onClick={() => {
                    void browseWorkshop(workshopSearchText, Math.max(1, workshopPage - 1), workshopCategory);
                  }}
                >
                  <WebUIText textKey="MainMenu.WorkshopPrevious" />
                </GameButton>
                <GameButton
                  variant="outline"
                  className="mm-mod-action-btn"
                  disabled={workshopQueryInProgress || workshopPage * 50 >= workshopTotalResults}
                  onClick={() => {
                    void browseWorkshop(workshopSearchText, workshopPage + 1, workshopCategory);
                  }}
                >
                  <WebUIText textKey="MainMenu.WorkshopNext" />
                </GameButton>
              </div>
            </div>
            {workshopError && <div className="mm-list-empty">{workshopError}</div>}
            {!workshopError && workshopItems.length === 0 && !workshopQueryInProgress && (
              <div className="mm-list-empty"><WebUIText textKey="MainMenu.WorkshopNoResults" /></div>
            )}
            {workshopItems.map(item => renderWorkshopItem(item))}
          </div>
        )}
        {activeModsPanelView === 'subscribed' && (
          <div className="mm-workshop-panel">
            <div className="mm-workshop-toolbar">
              <span className="mm-workshop-page"><WebUIText textKey="MainMenu.ModTabSubscribed" /></span>
              <GameButton
                variant="outline"
                className="mm-mod-action-btn"
                disabled={subscribedWorkshopQueryInProgress}
                onClick={() => {
                  void refreshSubscribedWorkshop();
                }}
              >
                <WebUIText textKey="MainMenu.WorkshopRefresh" />
              </GameButton>
            </div>
            {subscribedWorkshopError && <div className="mm-list-empty">{subscribedWorkshopError}</div>}
            {!subscribedWorkshopError && subscribedWorkshopItems.length === 0 && !subscribedWorkshopQueryInProgress && (
              <div className="mm-list-empty"><WebUIText textKey="MainMenu.WorkshopSubscribedNone" /></div>
            )}
            {subscribedWorkshopItems.map(item => renderWorkshopItem(item))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCredits = () => (
    <div className={`mm-credits-view${closing ? ' mm-credits-view--closing' : ''}`}>
      <button
        className="mm-credits-back-btn"
        onMouseDown={(event) => {
          event.preventDefault();
          goBack();
        }}
      >
        <span className="mm-back-arrow" aria-hidden="true" /><span><WebUIText textKey="Auto.PagesMainMenu.362.7" /></span>
      </button>
      <CreditsRoll />
    </div>
  );

  const renderEncyclopedia = () => (
    <div className={`mm-encyclopedia-overlay${closing ? ' mm-encyclopedia-overlay--closing' : ''}`}>
      <EncyclopediaScreen onClose={goBack} />
    </div>
  );

  const renderAchievements = () => (
    <div className={`mm-achievements-overlay${closing ? ' mm-achievements-overlay--closing' : ''}`}>
      <AchievementsScreen onClose={goBack} />
    </div>
  );

  const activeSelectedNewGameMap = selectedNewGameMap
    ? translatedNewGameMaps.find((map) => map.id === selectedNewGameMap.id) ?? selectedNewGameMap
    : null;

  const loadGameButton: MainMenuIllustratedButtonData = {
    id: 'load-game',
    variant: 'load-game',
    label: webUIText('Auto.Prop.PagesMainMenu.435.1'),
    img: LOAD_GAME_CARD_IMAGE,
    onClick: () => {
      setMenuError(null);
      setShowLoad(true);
    },
  };
  const scenarioButtons: MainMenuIllustratedButtonData[] = translatedNewGameMaps
    .slice()
    .sort(compareScenarioMaps)
    .map(map => ({
      id: map.id,
      variant: 'scenario',
      label: map.displayName,
      kicker: map.menuKicker,
      description: map.menuDescription,
      img: map.menuImageUrl,
      onClick: () => handleSelectScenarioMap(map),
    }));
  const scenarioStripWidth = `${
    latestSave
      ? MAIN_MENU_ROW_WIDTH_REM - MAIN_MENU_CONTINUE_CARD_WIDTH_REM - MAIN_MENU_LOAD_GAME_SLOT_WIDTH_REM
      : MAIN_MENU_ROW_WIDTH_REM - MAIN_MENU_LOAD_GAME_SLOT_WIDTH_REM
  }rem`;
  const menuSlots: MainMenuSlotData[] = [];
  if (latestSave) {
    menuSlots.push({ kind: 'continue', key: 'continue' });
  }
  menuSlots.push(
    {
      kind: 'button',
      key: 'load-game',
      slotClass: 'mm-menu-slot--load-game',
      button: loadGameButton,
    },
    { kind: 'scenarios', key: 'scenarios', buttons: scenarioButtons },
  );

  const textMenuItems = [
    { label: webUIText('Auto.Prop.PagesMainMenu.436.2'), onClick: () => openSubView('settings') },
    ...(steamAchievementsAvailable === false
      ? [{ label: webUIText('Achievements.Title'), onClick: () => openSubView('achievements') }]
      : []),
    { label: webUIText('Auto.Prop.PagesMainMenu.437.3'), onClick: () => openSubView('mods') },
    { label: webUIText('Auto.Prop.PagesMainMenu.438.4'), onClick: () => openSubView('encyclopedia') },
    { label: webUIText('Auto.Prop.PagesMainMenu.439.5'), onClick: () => openSubView('credits') },
    { label: webUIText('Auto.Prop.PagesMainMenu.440.6'), onClick: handleQuit },
  ];

  const renderIllustratedMenuButton = (
    btn: MainMenuIllustratedButtonData,
    key: string,
    slotClass: string,
  ) => {
    const showKicker = btn.kicker && btn.kicker.toLowerCase() !== btn.label.toLowerCase();
    const cardImage = btn.img;
    const scenarioButton = (
      <button
        className={`mm-illust-btn mm-illust-btn--${btn.variant}`}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          lastIllustratedPointerActivationAtRef.current = Date.now();
          event.preventDefault();
          btn.onClick();
        }}
        onClick={(event) => {
          if (event.detail !== 0 && Date.now() - lastIllustratedPointerActivationAtRef.current < 500) {
            return;
          }
          btn.onClick();
        }}
        style={cardImage ? { ['--mm-card-image' as string]: `url(${cardImage})` } : undefined}
      >
        {cardImage && <img src={cardImage} alt="" className="mm-illust-img" />}
        <div className="mm-illust-scrim" />
        <div className="mm-illust-copy">
          {showKicker && <span className="mm-illust-kicker">{btn.kicker}</span>}
          <span className="mm-illust-label">{btn.label}</span>
        </div>
      </button>
    );

    return (
      <Tooltip
        key={key}
        content={{ title: btn.label, body: btn.description, footer: showKicker ? btn.kicker : undefined }}
        position="top"
        delay={450}
        bubbleClassName="tt-bubble--main-menu-scenario"
        wrapperClassName={`mm-menu-slot ${slotClass}`}
      >
        {scenarioButton}
      </Tooltip>
    );
  };

  const renderMainMenu = () => (
    <>
      {/* Left-aligned menu column */}
      <div className="mm-left">
        <div className="mm-left-panel">
          {/* Game logo / title */}
          <div className="mm-logo">
            <LitLogo
              alt={webUIText('Auto.Attr.PagesMainMenu.451.7')}
              className="mm-logo-canvas"
              colorSrc="/assets/main-menu-logo.png"
              normalSrc="/assets/main-menu-logo-normals.png"
            />
          </div>

          {/* Hero Continue card + illustrated buttons */}
          <div className="mm-illustrated-btns">
            {menuSlots.map((slot) => {
              if (slot.kind === 'continue') {
                return latestSave
                  ? <ContinueHeroCard key={slot.key} save={latestSave} onResume={handleContinue} />
                  : null;
              }

              if (slot.kind === 'scenarios') {
                return (
                  <div
                    key={slot.key}
                    className="mm-scenario-strip"
                    style={{ ['--mm-scenario-strip-width' as string]: scenarioStripWidth }}
                  >
                    {slot.buttons.map((btn, index) => renderIllustratedMenuButton(
                      btn,
                      `scenario-${btn.id}`,
                      `mm-menu-slot--scenario${index > 0 ? ' mm-menu-slot--scenario-after-first' : ''}`,
                    ))}
                  </div>
                );
              }

              return renderIllustratedMenuButton(slot.button, slot.key, slot.slotClass);
            })}
          </div>
          {menuError && (
            <div className="mm-load-error">
              <span className="mm-load-error-title">{webUIText('MainMenu.LoadSaveFailed')}</span>
              <span className="mm-load-error-message">{menuError}</span>
            </div>
          )}

          {/* Gold divider */}
          <div className="mm-divider" />

          {/* Text-only menu items */}
          <div className="mm-text-items">
            {textMenuItems.map(item => (
              <button
                key={item.label}
                className="mm-text-btn"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Language selector - top right, above socials */}
      <div className="mm-lang-slot">
        <LanguageSelector />
      </div>

      {/* Social icons - top right, stacked vertically */}
      <div className="mm-socials">
        <button className="mm-social-btn" aria-label={webUIText('Auto.Attr.PagesMainMenu.504.8')} onClick={() => openExternalLink('discord')}>
          <img src="/assets/icons/Socials/I_DiscordIcon.png" alt="" />
        </button>
        <button className="mm-social-btn" aria-label={webUIText('Auto.Attr.PagesMainMenu.507.9')} onClick={() => openExternalLink('reddit')}>
          <img src="/assets/icons/Socials/I_RedditIcon.png" alt="" />
        </button>
        <button className="mm-social-btn" aria-label={webUIText('Auto.Attr.PagesMainMenu.510.10')} onClick={() => openExternalLink('website')}>
          <img src="/assets/icons/Socials/I_WebIcon.png" alt="" />
        </button>
        <button className="mm-social-btn" aria-label={webUIText('Auto.Attr.PagesMainMenu.513.11')} onClick={() => openExternalLink('feedback')}>
          <img src="/assets/icons/Socials/I_FeedbackIcon.png" alt="" />
        </button>
      </div>

      {/* Version - bottom right */}
      {version && <span className="mm-version"><WebUIText textKey="Auto.PagesMainMenu.519.11" />{version}</span>}
    </>
  );

  const rootClassName = [
    'mm-root',
    view !== 'menu' ? 'mm-root--subview' : '',
    view === 'credits' ? 'mm-root--credits' : '',
    view === 'menu' && skipMenuIntro ? 'mm-root--menu-return' : '',
    latestSave ? 'mm-root--has-continue' : 'mm-root--no-continue',
    'mm-root--mockup mm-root--mockup-2',
    import.meta.env.PROD ? 'mm-root--no-bg' : '',
  ].filter(Boolean).join(' ');
  const menuLayerClassName = [
    'mm-menu-layer',
    view !== 'menu' ? 'mm-menu-layer--background' : '',
  ].filter(Boolean).join(' ');

  return (
    <>

      <div className={rootClassName}>
        <div className={menuLayerClassName} aria-hidden={view !== 'menu'}>
          {renderMainMenu()}
        </div>
        {view === 'settings' && renderSettings()}
        {view === 'mods' && renderMods()}
        {view === 'credits' && renderCredits()}
      </div>
      {view === 'encyclopedia' && renderEncyclopedia()}
      {view === 'achievements' && renderAchievements()}
      <LoadGameModal visible={showLoad} onClosed={() => setShowLoad(false)} />
      {view === 'newgame' && activeSelectedNewGameMap && (
        <FactionSelection
          mapId={activeSelectedNewGameMap.id}
          initialData={factionSelectionCache[`${locale}:${activeSelectedNewGameMap.id}`] ?? null}
          loadFactionSelection={preloadFactionSelection}
          closing={closing}
          scenario={{
            displayName: activeSelectedNewGameMap.displayName,
          }}
          onClose={goBack}
          onConfirm={(faction) => { void handleStartScenarioMap(activeSelectedNewGameMap.id, faction.baseName); }}
        />
      )}
    </>
  );
};

export default MainMenu;
