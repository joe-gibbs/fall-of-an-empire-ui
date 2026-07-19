import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  RandomiseCharacterCreatorResponse,
  RenderCharacterCreatorPreviewRequest,
} from '../../bridge-types.generated.ts';
import GameButton from '../../components/common/buttons/GameButton';
import DropdownSelect, { type DropdownSelectOption } from '../../components/common/forms/DropdownSelect';
import GameSlider from '../../components/common/forms/GameSlider';
import { webUIText } from '../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../utils/assets';
import './CharacterCreatorDebug.css';

type Framing = 'face' | 'body';
type CreatorTab = 'character' | 'backgrounds';

const PREVIEW_UPDATE_INTERVAL_MS = 80;

interface CreatorState {
  female: boolean;
  age: number;
  expression: string;
  environmentGroup: string;
  environmentRole: string;
  backgroundZoom: number;
  facialGenes: number[];
  african: number;
  european: number;
  asian: number;
  melanin: number;
  undertone: number;
  freckling: number;
  eyeMelanin: number;
  hairMelanin: number;
  hairRedness: number;
  hairCurl: number;
  bodyBuild: number;
  hairLoss: number;
  asymmetry: number;
  bodyCondition: number;
  fatigue: number;
  injurySeverity: number;
  dirt: number;
}

interface GeneDefinition {
  index: number;
  labelKey: string;
}

interface GeneGroup {
  labelKey: string;
  genes: GeneDefinition[];
}

const GENE_GROUPS: GeneGroup[] = [
  {
    labelKey: 'CharacterCreator.Group.Skull',
    genes: [
      ['HeadWidth', 0], ['FaceLength', 1], ['CranialHeight', 2], ['ForeheadHeight', 3],
      ['ForeheadSlope', 4], ['TempleWidth', 5],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
  {
    labelKey: 'CharacterCreator.Group.JawChin',
    genes: [
      ['JawWidth', 6], ['JawAngle', 7], ['ChinWidth', 8], ['ChinHeight', 9],
      ['ChinProjection', 10], ['LowerFaceDepth', 11],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
  {
    labelKey: 'CharacterCreator.Group.Cheeks',
    genes: [
      ['CheekboneHeight', 12], ['CheekboneWidth', 13], ['CheekFullness', 14],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
  {
    labelKey: 'CharacterCreator.Group.Nose',
    genes: [
      ['NoseBridgeHeight', 15], ['NoseBridgeWidth', 16], ['NoseLength', 17], ['NoseProjection', 18],
      ['NoseWidth', 19], ['NostrilFlare', 20], ['NoseTipWidth', 21], ['NoseTipUpturn', 22],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
  {
    labelKey: 'CharacterCreator.Group.EyesBrows',
    genes: [
      ['EyeSize', 23], ['EyeSpacing', 24], ['EyeDepth', 25], ['EyeTilt', 26],
      ['UpperLidExposure', 27], ['BrowHeight', 28], ['BrowShape', 29], ['BrowProminence', 30],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
  {
    labelKey: 'CharacterCreator.Group.MouthLips',
    genes: [
      ['MouthWidth', 31], ['MouthProjection', 32], ['PhiltrumLength', 33],
      ['UpperLipFullness', 34], ['LowerLipFullness', 35], ['RestingMouthCorner', 36],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
  {
    labelKey: 'CharacterCreator.Group.EarsNeck',
    genes: [
      ['EarSize', 37], ['EarOutset', 38], ['EarHeight', 39], ['NeckThickness', 40],
    ].map(([name, index]) => ({ index: Number(index), labelKey: `CharacterCreator.Gene.${name}` })),
  },
];

const DEFAULT_STATE: CreatorState = {
  female: false,
  age: 32,
  expression: 'neutral',
  environmentGroup: 'Rephsian',
  environmentRole: 'Court',
  backgroundZoom: 1,
  facialGenes: Array.from({ length: 41 }, () => 0),
  african: 1 / 3,
  european: 1 / 3,
  asian: 1 / 3,
  melanin: 0.45,
  undertone: 0,
  freckling: 0.15,
  eyeMelanin: 0.5,
  hairMelanin: 0.55,
  hairRedness: 0,
  hairCurl: 0,
  bodyBuild: 0,
  hairLoss: 0,
  asymmetry: 0,
  bodyCondition: 0,
  fatigue: 0,
  injurySeverity: 0,
  dirt: 0,
};

const GENDER_OPTIONS: DropdownSelectOption[] = [
  { value: 'male', label: webUIText('CharacterCreator.Male') },
  { value: 'female', label: webUIText('CharacterCreator.Female') },
];

const EXPRESSION_OPTIONS: DropdownSelectOption[] = [
  'neutral', 'smile', 'frown', 'anger', 'fear', 'concern', 'stern',
].map(value => ({
  value,
  label: webUIText(`CharacterCreator.Expression.${value}`),
}));

const ENVIRONMENT_GROUPS = ['Rephsian', 'Neutarnic', 'Svaranic', 'Tarhanic', 'Desert'] as const;

const ENVIRONMENT_ROLES = [
  { value: 'Court', image: 'Home' },
  { value: 'FactionLeader', image: 'Ruling' },
  { value: 'Imprisoned', image: 'Imprisoned' },
  { value: 'Army', image: 'Army' },
  { value: 'Navy', image: 'Navy' },
] as const;

function formatValue(value: number, step: number): string {
  return step >= 1 ? String(Math.round(value)) : value.toFixed(2);
}

interface CharacterCreatorDebugProps {
  closing: boolean;
  onBack: () => void;
}

interface CameraRotation {
  yaw: number;
  pitch: number;
}

interface CameraDrag {
  framing: Framing;
  pointerId: number;
  startX: number;
  startY: number;
  startRotation: CameraRotation;
}

function CharacterCreatorDebug({ closing, onBack }: CharacterCreatorDebugProps) {
  const [creator, setCreator] = useState<CreatorState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<CreatorTab>('character');
  const [draggingCamera, setDraggingCamera] = useState<Framing | null>(null);
  const lastPreviewRequestTimeRef = useRef(Number.NEGATIVE_INFINITY);
  const cameraRotationsRef = useRef<Record<Framing, CameraRotation>>({
    face: { yaw: 0, pitch: 0 },
    body: { yaw: 0, pitch: 0 },
  });
  const cameraDragRef = useRef<CameraDrag | null>(null);
  const pendingCameraUpdateRef = useRef<{ framing: Framing; rotation: CameraRotation } | null>(null);
  const cameraUpdateFrameRef = useRef(0);

  useEffect(() => {
    const elapsed = performance.now() - lastPreviewRequestTimeRef.current;
    const delay = Math.max(0, PREVIEW_UPDATE_INTERVAL_MS - elapsed);
    const timer = window.setTimeout(() => {
      lastPreviewRequestTimeRef.current = performance.now();
      const request: RenderCharacterCreatorPreviewRequest = {
        ...creator,
      };
      void bridgeCall('game.render_character_creator_preview', request)
        .catch(error => console.error('[CharacterCreator] previews failed', error));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [creator]);

  useEffect(() => () => window.cancelAnimationFrame(cameraUpdateFrameRef.current), []);

  const setScalar = (key: keyof CreatorState, value: number | string | boolean) => {
    setCreator(current => ({ ...current, [key]: value }));
  };

  const setGene = (index: number, value: number) => {
    setCreator(current => {
      const facialGenes = current.facialGenes.slice();
      facialGenes[index] = value;
      return { ...current, facialGenes };
    });
  };

  const setAncestry = (key: 'african' | 'european' | 'asian', value: number) => {
    setCreator(current => {
      const otherKeys = (['african', 'european', 'asian'] as const).filter(candidate => candidate !== key);
      const otherTotal = current[otherKeys[0]] + current[otherKeys[1]];
      const remaining = 1 - value;
      const firstShare = otherTotal > 0 ? current[otherKeys[0]] / otherTotal : 0.5;
      return {
        ...current,
        [key]: value,
        [otherKeys[0]]: remaining * firstShare,
        [otherKeys[1]]: remaining * (1 - firstShare),
      };
    });
  };

  const randomise = async () => {
    try {
      const randomised: RandomiseCharacterCreatorResponse = await bridgeCall(
        'game.randomise_character_creator',
        {
          female: creator.female,
          age: creator.age,
          seed: Math.floor(Math.random() * 0x7fffffff),
        },
      );
      setCreator(current => ({ ...current, ...randomised }));
    } catch (error) {
      console.error('[CharacterCreator] randomisation failed', error);
    }
  };

  const queueCameraRotation = (framing: Framing, rotation: CameraRotation) => {
    pendingCameraUpdateRef.current = { framing, rotation };
    if (cameraUpdateFrameRef.current !== 0) return;
    cameraUpdateFrameRef.current = window.requestAnimationFrame(() => {
      cameraUpdateFrameRef.current = 0;
      const update = pendingCameraUpdateRef.current;
      pendingCameraUpdateRef.current = null;
      if (!update) return;
      void bridgeCall('game.set_character_creator_camera_rotation', {
        framing: update.framing,
        yaw: update.rotation.yaw,
        pitch: update.rotation.pitch,
      }).catch(error => console.error('[CharacterCreator] camera rotation failed', error));
    });
  };

  const beginCameraDrag = (framing: Framing, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cameraDragRef.current = {
      framing,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: cameraRotationsRef.current[framing],
    };
    setDraggingCamera(framing);
  };

  const moveCameraDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = cameraDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rotation = {
      yaw: drag.startRotation.yaw - (event.clientX - drag.startX) * 0.35,
      pitch: Math.max(-25, Math.min(25, drag.startRotation.pitch + (event.clientY - drag.startY) * 0.25)),
    };
    cameraRotationsRef.current[drag.framing] = rotation;
    queueCameraRotation(drag.framing, rotation);
  };

  const endCameraDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = cameraDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cameraDragRef.current = null;
    setDraggingCamera(null);
  };

  const renderSlider = (
    labelKey: string,
    value: number,
    onChange: (next: number) => void,
    minimum = -1,
    maximum = 1,
    step = 0.01,
  ) => (
    <label className="character-creator__slider" key={labelKey}>
      <span className="character-creator__slider-copy">
        <span>{webUIText(labelKey)}</span>
        <span className="character-creator__slider-value">{formatValue(value, step)}</span>
      </span>
      <GameSlider
        ariaLabel={webUIText(labelKey)}
        value={value}
        minimum={minimum}
        maximum={maximum}
        step={step}
        onChange={onChange}
      />
    </label>
  );

  return (
    <div className={`mm-sub-view mm-sub-view--character-creator${closing ? ' mm-sub-view--closing' : ''}`}>
      <div className="mm-sub-header character-creator__header">
        <button
          className="mm-back-btn"
          onMouseDown={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          <span className="mm-back-arrow" aria-hidden="true" />
          <span>{webUIText('Auto.PagesMainMenu.362.7')}</span>
        </button>
        <h2 className="mm-sub-title">{webUIText('CharacterCreator.Title')}</h2>
        <div className="character-creator__actions">
          <GameButton variant="outline" onClick={() => setCreator({ ...DEFAULT_STATE, facialGenes: [...DEFAULT_STATE.facialGenes] })}>
            {webUIText('CharacterCreator.Reset')}
          </GameButton>
          <GameButton variant="burgundy" onClick={() => void randomise()}>
            {webUIText('CharacterCreator.Randomise')}
          </GameButton>
        </div>
      </div>

      <div className="character-creator__layout">
        <aside className="character-creator__controls">
          <nav className="character-creator__tabs" aria-label={webUIText('CharacterCreator.Tabs')}>
            <button
              type="button"
              className={`character-creator__tab${activeTab === 'character' ? ' character-creator__tab--active' : ''}`}
              onPointerDown={(event) => {
                event.preventDefault();
                setActiveTab('character');
              }}
            >
              {webUIText('CharacterCreator.Tab.Character')}
            </button>
            <button
              type="button"
              className={`character-creator__tab${activeTab === 'backgrounds' ? ' character-creator__tab--active' : ''}`}
              onPointerDown={(event) => {
                event.preventDefault();
                setActiveTab('backgrounds');
              }}
            >
              {webUIText('CharacterCreator.Tab.Backgrounds')}
            </button>
          </nav>

          {activeTab === 'character' ? (
            <>
          <section className="character-creator__control-group">
            <h3>{webUIText('CharacterCreator.Group.Character')}</h3>
            <DropdownSelect
              id="character-creator-gender"
              label={webUIText('CharacterCreator.Gender')}
              value={creator.female ? 'female' : 'male'}
              options={GENDER_OPTIONS}
              escapeId="character-creator.gender"
              className="character-creator__dropdown"
              onChange={value => setScalar('female', value === 'female')}
            />
            <DropdownSelect
              id="character-creator-expression"
              label={webUIText('CharacterCreator.Expression')}
              value={creator.expression}
              options={EXPRESSION_OPTIONS}
              escapeId="character-creator.expression"
              className="character-creator__dropdown"
              onChange={value => setScalar('expression', value)}
            />
            {renderSlider('CharacterCreator.Age', creator.age, value => setScalar('age', value), 18, 90, 1)}
          </section>

          <section className="character-creator__control-group">
            <h3>{webUIText('CharacterCreator.Group.Ancestry')}</h3>
            {renderSlider('CharacterCreator.African', creator.african, value => setAncestry('african', value), 0, 1)}
            {renderSlider('CharacterCreator.European', creator.european, value => setAncestry('european', value), 0, 1)}
            {renderSlider('CharacterCreator.Asian', creator.asian, value => setAncestry('asian', value), 0, 1)}
          </section>

          <section className="character-creator__control-group">
            <h3>{webUIText('CharacterCreator.Group.Pigment')}</h3>
            {renderSlider('CharacterCreator.Melanin', creator.melanin, value => setScalar('melanin', value), 0, 1)}
            {renderSlider('CharacterCreator.Undertone', creator.undertone, value => setScalar('undertone', value))}
            {renderSlider('CharacterCreator.Freckling', creator.freckling, value => setScalar('freckling', value), 0, 1)}
            {renderSlider('CharacterCreator.EyeMelanin', creator.eyeMelanin, value => setScalar('eyeMelanin', value), 0, 1)}
          </section>

          <section className="character-creator__control-group">
            <h3>{webUIText('CharacterCreator.Group.BodyCondition')}</h3>
            {renderSlider('CharacterCreator.BodyBuild', creator.bodyBuild, value => setScalar('bodyBuild', value))}
            {renderSlider('CharacterCreator.BodyCondition', creator.bodyCondition, value => setScalar('bodyCondition', value))}
            {renderSlider('CharacterCreator.Asymmetry', creator.asymmetry, value => setScalar('asymmetry', value))}
            {renderSlider('CharacterCreator.Fatigue', creator.fatigue, value => setScalar('fatigue', value), 0, 1)}
            {renderSlider('CharacterCreator.InjurySeverity', creator.injurySeverity, value => setScalar('injurySeverity', value), 0, 1)}
            {renderSlider('CharacterCreator.Dirt', creator.dirt, value => setScalar('dirt', value), 0, 1)}
          </section>

          {GENE_GROUPS.map(group => (
            <section className="character-creator__control-group" key={group.labelKey}>
              <h3>{webUIText(group.labelKey)}</h3>
              {group.genes.map(gene => renderSlider(
                gene.labelKey,
                creator.facialGenes[gene.index],
                value => setGene(gene.index, value),
              ))}
            </section>
          ))}
            </>
          ) : (
            <div className="character-creator__background-browser">
              <section className="character-creator__control-group character-creator__background-zoom">
                <h3>{webUIText('CharacterCreator.BackgroundView')}</h3>
                {renderSlider(
                  'CharacterCreator.BackgroundZoom',
                  creator.backgroundZoom,
                  value => setScalar('backgroundZoom', value),
                  0.6,
                  1.4,
                  0.05,
                )}
              </section>
              {ENVIRONMENT_GROUPS.map(group => (
                <section className="character-creator__background-group" key={group}>
                  <h3>{webUIText(`CharacterCreator.EnvironmentGroup.${group}`)}</h3>
                  <div className="character-creator__background-grid">
                    {ENVIRONMENT_ROLES.map(role => {
                      const selected = creator.environmentGroup === group && creator.environmentRole === role.value;
                      return (
                        <button
                          type="button"
                          className={`character-creator__background-card${selected ? ' character-creator__background-card--selected' : ''}`}
                          key={role.value}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            setCreator(current => ({
                              ...current,
                              environmentGroup: group,
                              environmentRole: role.value,
                            }));
                          }}
                        >
                          <img
                            src={WebkilnAssetPath(`/assets/character-creator/backgrounds/${group}/${role.image}.png`)}
                            alt=""
                            draggable={false}
                          />
                          <span>{webUIText(`CharacterCreator.EnvironmentRole.${role.value}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </aside>

        <main className="character-creator__previews">
          <section className="character-creator__preview character-creator__preview--composite">
            <h3>{webUIText('CharacterCreator.FullBodyPreview')}</h3>
            <div className="character-creator__preview-canvas">
              <webkiln-texture
                source="character_creator_body"
                alt={webUIText('CharacterCreator.FullBodyPreview')}
                className={`character-creator__preview-stage character-creator__preview-stage--body${draggingCamera === 'body' ? ' is-dragging' : ''}`}
                onPointerDown={event => beginCameraDrag('body', event)}
                onPointerMove={moveCameraDrag}
                onPointerUp={endCameraDrag}
                onPointerCancel={endCameraDrag}
              />
              <webkiln-texture
                source="character_creator_face"
                alt={webUIText('CharacterCreator.FacePreview')}
                className={`character-creator__preview-stage character-creator__preview-stage--face${draggingCamera === 'face' ? ' is-dragging' : ''}`}
                onPointerDown={event => beginCameraDrag('face', event)}
                onPointerMove={moveCameraDrag}
                onPointerUp={endCameraDrag}
                onPointerCancel={endCameraDrag}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default CharacterCreatorDebug;
