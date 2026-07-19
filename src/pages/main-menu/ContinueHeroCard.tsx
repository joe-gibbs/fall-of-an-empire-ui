import FactionRoundel from '../../components/common/entities/FactionRoundel';
import type { SaveEntry } from '../../bridge/app/useSavesBridge';
import { webUIText } from '../../localization/WebUITextContext';

interface ContinueHeroCardProps {
  save: SaveEntry;
  onResume: () => void;
}

function cleanName(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  if (value === 'None') return undefined;
  return value;
}

function displayNameFor(save: SaveEntry): string {
  if (save.displayName) return save.displayName;
  if (save.isAutosave) return webUIText('MainMenu.Autosave');
  if (save.playerCharacterName && save.playerFactionName) {
    return webUIText('MainMenu.SaveNameOf', { Character: save.playerCharacterName, Faction: save.playerFactionName });
  }
  return save.slotName;
}

export default function ContinueHeroCard({ save, onResume }: ContinueHeroCardProps) {
  const emblem = cleanName(save.factionEmblem);
  const cultureGroup = cleanName(save.cultureGroup);
  const hasHeraldry = Boolean(emblem || cultureGroup);
  const primary = hasHeraldry && save.factionColour ? save.factionColour : '#4a1530';
  const secondary = hasHeraldry && save.factionSecondaryColour ? save.factionSecondaryColour : '#c9a84c';
  const realm = save.playerFactionName || '';
  const character = save.playerCharacterName || displayNameFor(save);
  const date = save.gameDateString;

  return (
    <button
      className="mm-continue-hero"
      onClick={onResume}
      style={{
        ['--continue-primary' as string]: primary,
        ['--continue-secondary' as string]: secondary,
      }}
    >
      <div className="mm-continue-hero-plate" />
      <div className="mm-continue-hero-accent" />
      <div className="mm-continue-hero-body">
        <div className="mm-continue-hero-badge">
          <FactionRoundel
            colour={primary}
            secondaryColour={secondary}
            emblem={emblem}
            cultureGroup={cultureGroup}
            name={realm}
            size="xl"
            showRing
          />
        </div>
        <div className="mm-continue-hero-copy">
          <span className="mm-continue-hero-name">{character}</span>
          {realm && <span className="mm-continue-hero-realm">{realm}</span>}
          {date && <span className="mm-continue-hero-date">{date}</span>}
        </div>
      </div>
    </button>
  );
}
