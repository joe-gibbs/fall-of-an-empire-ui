import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Event, EventChoiceInputs, EventPersonNameInput, EventRegnalNameInput } from '../../data/types';
import { playSound } from '../../hooks/useSound';
import { useDraggableOffset } from '../../hooks/useDraggableOffset';
import { renderEventTextChunk } from '../../utils/eventTextFlow';
import { renderRichText } from '../../utils/richText';
import Portrait from '../common/portraits/Portrait';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import PersonTooltip from '../common/tooltips/PersonTooltip';
import Tooltip from '../common/tooltips/Tooltip';
import { EventEffectList } from './EventEffects';
import './EventPopup.css';

import { webUIText, WebUIText } from '../../localization/WebUITextContext';
interface EventPopupProps {
  event: Event;
  visible?: boolean;
  onClose: () => void;
  onOptionSelect: (index: number, inputs?: EventChoiceInputs) => void;
  onLinkClick?: (type: string, id: string) => void;
}

const NAME_DIE_ICON = '/assets/icons/I_RegnalDie.png';
const OPTION_SELECT_FLASH_MS = 100;
const EVENT_POPUP_EXIT_MS = 400;

type EventNameInput = EventRegnalNameInput | EventPersonNameInput;

function normaliseEventName(value: string): string {
  return value.trim();
}

function getNameOptions(input?: EventNameInput): string[] {
  const names: string[] = [];
  const options = input?.randomOptions || [];

  for (const option of options) {
    const name = normaliseEventName(option);
    if (!name || names.indexOf(name) >= 0) continue;
    names.push(name);
  }

  return names;
}

function toRomanNumeral(value: number): string {
  if (value <= 0) return '';

  const numerals = [
    { value: 1000, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.45.1') },
    { value: 900, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.46.2') },
    { value: 500, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.47.3') },
    { value: 400, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.48.4') },
    { value: 100, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.49.5') },
    { value: 90, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.50.6') },
    { value: 50, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.51.7') },
    { value: 40, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.52.8') },
    { value: 10, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.53.9') },
    { value: 9, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.54.10') },
    { value: 5, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.55.11') },
    { value: 4, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.56.12') },
    { value: 1, text: webUIText('Auto.Prop.ComponentsEventsEventPopup.57.13') },
  ];

  let remaining = value;
  let result = '';
  for (const numeral of numerals) {
    while (remaining >= numeral.value) {
      result += numeral.text;
      remaining -= numeral.value;
    }
  }
  return result;
}

function getRegnalNumberText(input: EventRegnalNameInput | undefined, value: string): string {
  const name = normaliseEventName(value);
  if (!input || !name) return '';

  const previous = input.previousNameCounts.find(entry => entry.name === name);
  return toRomanNumeral((previous?.count || 0) + 1);
}

function splitEventParagraphs(body: string): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const normalized = body.split('\r\n').join('\n').split('\r').join('\n');

  for (const line of normalized.split('\n')) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        paragraphs.push(current.join('\n').trim());
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    paragraphs.push(current.join('\n').trim());
  }

  return paragraphs;
}

const EventPopup: React.FC<EventPopupProps> = ({
  event,
  visible = true,
  onClose,
  onOptionSelect,
  onLinkClick,
}) => {
  const [closing, setClosing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [regnalName, setRegnalName] = useState(event.regnalNameInput?.value || '');
  const [personName, setPersonName] = useState(event.personNameInput?.value || '');
  const [chainIndex, setChainIndex] = useState(event.previousEvents.length);
  const {
    offsetStyle,
    rootRef: popupRef,
    onSurfaceMouseDown,
  } = useDraggableOffset({
    disabled: closing,
    blockClassNames: [
      'event-link',
      'event-content-scroll',
      'styled-scroll-area',
      'event-options',
      'event-option',
      'tooltip-wrapper',
    ],
  });
  const regnalNameCycleIndexRef = useRef(0);
  const personNameCycleIndexRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previousVisibleRef = useRef(false);
  const openedSoundEventIdRef = useRef<string | undefined>(undefined);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback((afterClose?: () => void, shouldPlayCloseSound = true) => {
    if (closeTimerRef.current) return;
    if (shouldPlayCloseSound) playSound('eventClose');
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = undefined;
      afterClose?.();
      onCloseRef.current();
    }, EVENT_POPUP_EXIT_MS);
  }, []);

  useEffect(() => {
    if (!visible) {
      previousVisibleRef.current = false;
      return;
    }

    if (previousVisibleRef.current && openedSoundEventIdRef.current === event.id) {
      return;
    }

    previousVisibleRef.current = true;
    openedSoundEventIdRef.current = event.id;
    playSound('eventOpen', event.presentationStyle === 'important' ? 0.85 : undefined);
  }, [event.id, event.presentationStyle, visible]);

  useEffect(() => {
    const visibilityTimer = setTimeout(() => {
      if (!visible) {
        requestClose(undefined, openedSoundEventIdRef.current !== undefined);
        return;
      }

      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
      setClosing(false);
    }, 0);

    return () => clearTimeout(visibilityTimer);
  }, [visible, requestClose]);

  useEffect(() => () => {
    clearTimeout(flashTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  const handleRandomRegnalName = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    if (mouseEvent.button !== 0) return;
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    const options = getNameOptions(event.regnalNameInput);
    if (options.length === 0 || closing) return;

    let nextIndex = regnalNameCycleIndexRef.current % options.length;
    const currentName = normaliseEventName(regnalName);
    if (options.length > 1 && options[nextIndex] === currentName) {
      nextIndex = (nextIndex + 1) % options.length;
    }

    regnalNameCycleIndexRef.current = (nextIndex + 1) % options.length;
    setRegnalName(options[nextIndex]);
    playSound('confirm');
  }, [closing, event.regnalNameInput, regnalName]);

  const handleRandomPersonName = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    if (mouseEvent.button !== 0) return;
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    const options = getNameOptions(event.personNameInput);
    if (options.length === 0 || closing) return;

    let nextIndex = personNameCycleIndexRef.current % options.length;
    const currentName = normaliseEventName(personName);
    if (options.length > 1 && options[nextIndex] === currentName) {
      nextIndex = (nextIndex + 1) % options.length;
    }

    personNameCycleIndexRef.current = (nextIndex + 1) % options.length;
    setPersonName(options[nextIndex]);
    playSound('confirm');
  }, [closing, event.personNameInput, personName]);

  const handleOptionMouseDown = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (mouseEvent.button !== 0) return;
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    if (selectedIndex !== null || closing) return;
    const submittedRegnalName = regnalName.trim();
    const submittedPersonName = personName.trim();
    if (event.regnalNameInput && submittedRegnalName.length === 0) return;
    if (event.personNameInput && submittedPersonName.length === 0) return;
    playSound('confirm');
    setSelectedIndex(index);
    // Flash the selected option, then play close animation, then fire callback
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = undefined;
      requestClose(() => {
        onOptionSelect(index, {
          regnalName: event.regnalNameInput ? submittedRegnalName : undefined,
          personName: event.personNameInput ? submittedPersonName : undefined,
        });
      });
    }, OPTION_SELECT_FLASH_MS);
  }, [selectedIndex, closing, regnalName, personName, event.regnalNameInput, event.personNameInput, onOptionSelect, requestClose]);

  const renderBodyParagraph = useCallback((text: string, paragraphIndex: number) => {
    return renderRichText(text, {
      onLinkClick,
      linkClassPrefix: 'event-link',
      transformText: (chunk, key) => renderEventTextChunk(chunk, `event-body-${String(paragraphIndex)}-${key}`),
    });
  }, [onLinkClick]);

  const isCurrentEvent = chainIndex === event.previousEvents.length;
  const historyEntry = isCurrentEvent ? null : event.previousEvents[chainIndex];
  const displayedEvent = historyEntry || event;
  const paragraphs = splitEventParagraphs(displayedEvent.body);
  const regnalNumberText = getRegnalNumberText(event.regnalNameInput, regnalName);
  const isImportant = displayedEvent.presentationStyle === 'important';
  const hasChainHistory = event.previousEvents.length > 0;
  const overlayClassName = `modal-overlay event-overlay${isImportant ? ' event-overlay--important' : ''}${closing ? ' event-overlay--closing' : ''}`;
  const wipeClassName = `event-popup-wipe${isImportant ? ' event-popup-wipe--important' : ''}${closing ? ' event-popup-wipe--closing' : ''}`;
  const popupClassName = `modal event-popup${isImportant ? ' event-popup--important' : ''}${closing ? ' event-popup--closing' : ''}`;

  return (
    <div className={overlayClassName}>
      <div className={wipeClassName}>
        <div
          ref={popupRef}
          className={popupClassName}
          style={offsetStyle}
          onMouseDown={onSurfaceMouseDown}
        >
          <div className={`event-toolbar${hasChainHistory ? ' event-toolbar--navigation' : ''}`}>
            {hasChainHistory && (
              <>
                <Tooltip content={webUIText('MainMenu.WorkshopPrevious')} position="bottom" inline>
                  <button
                    type="button"
                    className="event-chain-nav"
                    disabled={chainIndex === 0}
                    aria-label={webUIText('MainMenu.WorkshopPrevious')}
                    onMouseDown={(mouseEvent) => {
                      if (mouseEvent.button !== 0 || chainIndex === 0) return;
                      mouseEvent.preventDefault();
                      mouseEvent.stopPropagation();
                      playSound('click');
                      setChainIndex(index => index - 1);
                    }}
                  >
                    <img src="/assets/icons/I_NavPrevious.png" alt="" draggable={false} />
                  </button>
                </Tooltip>
                <span className="event-chain-position">
                  {String(chainIndex + 1)} / {String(event.previousEvents.length + 1)}
                </span>
                <Tooltip content={webUIText('MainMenu.WorkshopNext')} position="bottom" inline>
                  <button
                    type="button"
                    className="event-chain-nav"
                    disabled={isCurrentEvent}
                    aria-label={webUIText('MainMenu.WorkshopNext')}
                    onMouseDown={(mouseEvent) => {
                      if (mouseEvent.button !== 0 || isCurrentEvent) return;
                      mouseEvent.preventDefault();
                      mouseEvent.stopPropagation();
                      playSound('click');
                      setChainIndex(index => index + 1);
                    }}
                  >
                    <img src="/assets/icons/I_NavNext.png" alt="" draggable={false} />
                  </button>
                </Tooltip>
              </>
            )}
          </div>

          {/* Hero image with vignette + title scrim (matches char-header) */}
          <div className="event-hero">
            {displayedEvent.image ? (
              <img src={displayedEvent.image} alt={displayedEvent.title} className="event-hero-img" draggable={false} />
            ) : (
              <div className="event-hero-placeholder">
                <span className="event-hero-placeholder-text"><WebUIText textKey="Auto.ComponentsEventsEventPopup.292.1" /></span>
              </div>
            )}
            <div className="event-hero-scrim">
              <div className="event-hero-title">{displayedEvent.title}</div>
            </div>
          </div>

          {isCurrentEvent && event.sender && (
            <div className="event-sender">
              <PersonTooltip characterId={event.sender.personId} position="right" delay={200}>
                <Portrait
                  personId={event.sender.personId}
                  src={event.sender.portrait}
                  layers={event.sender.portraitLayers}
                  name={event.sender.name}
                  size="sm"
                  showBadge={false}
                  className="event-sender-portrait"
                />
              </PersonTooltip>
              <div className="event-sender-copy">
                {event.sender.title && (
                  <span className="event-sender-title">{event.sender.title}</span>
                )}
                <span className="event-sender-name">{event.sender.name}</span>
              </div>
            </div>
          )}

          <StyledScrollArea className="event-content-scroll" viewportClassName="event-content-scroll__viewport" variant="inline">
            <div className="event-body">
              {paragraphs.map((p, i) => (
                <div key={i} className="event-paragraph">
                  {renderBodyParagraph(p, i)}
                </div>
              ))}
            </div>
          </StyledScrollArea>

          <div className="event-interaction-panel">
            {isCurrentEvent && event.regnalNameInput && (
              <div className="event-name-input">
                <label className="event-name-input-label">
                  <span className="event-name-input-label-text">{event.regnalNameInput.label}</span>
                  <div className="event-name-input-row">
                    <input
                      type="text"
                      className="event-name-input-field"
                      value={regnalName}
                      maxLength={64}
                      onChange={(inputEvent) => setRegnalName(inputEvent.currentTarget.value)}
                    />
                    <span className="event-name-input-number" aria-hidden="true">{regnalNumberText}</span>
                  </div>
                </label>
                <Tooltip content={event.regnalNameInput.randomButtonText} position="top" inline>
                  <button
                    type="button"
                    className="event-name-input-random"
                    onMouseDown={handleRandomRegnalName}
                    disabled={event.regnalNameInput.randomOptions.length === 0}
                    aria-label={event.regnalNameInput.randomButtonText}
                  >
                    <img src={NAME_DIE_ICON} alt="" className="event-name-input-random-icon" draggable={false} />
                  </button>
                </Tooltip>
              </div>
            )}

            {isCurrentEvent && event.personNameInput && (
              <div className="event-name-input">
                <label className="event-name-input-label">
                  <span className="event-name-input-label-text">{event.personNameInput.label}</span>
                  <div className="event-name-input-row">
                    <input
                      type="text"
                      className="event-name-input-field"
                      value={personName}
                      maxLength={64}
                      onChange={(inputEvent) => setPersonName(inputEvent.currentTarget.value)}
                    />
                  </div>
                </label>
                <Tooltip content={event.personNameInput.randomButtonText} position="top" inline>
                  <button
                    type="button"
                    className="event-name-input-random"
                    onMouseDown={handleRandomPersonName}
                    disabled={event.personNameInput.randomOptions.length === 0}
                    aria-label={event.personNameInput.randomButtonText}
                  >
                    <img src={NAME_DIE_ICON} alt="" className="event-name-input-random-icon" draggable={false} />
                  </button>
                </Tooltip>
              </div>
            )}

            {isCurrentEvent ? (
            <div className="event-options">
              <div className="event-options-heading">
                <span className="event-options-heading-label"><WebUIText textKey="Auto.ComponentsEventsEventPopup.341.2" /></span>
                <div className="event-options-heading-rule" />
              </div>
              {event.options.map((option, i) => {
                const classes = ['event-option'];
                if (selectedIndex === i) classes.push('event-option--selected');
                if (selectedIndex !== null && selectedIndex !== i) classes.push('event-option--dimmed');
                if (option.isLocked) classes.push('event-option--locked');
                const isEventNameMissing = Boolean(
                  (event.regnalNameInput && regnalName.trim().length === 0)
                  || (event.personNameInput && personName.trim().length === 0),
                );

                const tooltipContent = (
                  <div className="event-option-tooltip">
                    <div className="event-option-tooltip-title">{option.text}</div>
                    {option.tooltip && <div className="event-option-tooltip-body">{option.tooltip}</div>}
                    {option.effects && option.effects.length > 0 && <EventEffectList effects={option.effects} />}
                  </div>
                );

                return (
                  <Tooltip
                    key={i}
                    content={tooltipContent}
                    position="right"
                    delay={150}
                  >
                    <button
                      type="button"
                      className={classes.join(' ')}
                      onMouseDown={(event) => {
                        if (!option.isLocked && !isEventNameMissing) handleOptionMouseDown(event, i);
                      }}
                      disabled={option.isLocked || isEventNameMissing}
                    >
                      <div className="event-option-number">
                        <span className="event-option-number-text">{String.fromCharCode(65 + i)}</span>
                      </div>
                      <div className="event-option-body">
                        <span className="event-option-text">{option.text}</span>
                        {option.objective && (
                          <span className="event-option-objective">{option.objective}</span>
                        )}
                      </div>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            ) : historyEntry?.chosenOptionText ? (
              <div className="event-options event-options--history">
                <div className="event-options-heading">
                  <span className="event-options-heading-label"><WebUIText textKey="Auto.ComponentsEventsEventPopup.341.2" /></span>
                  <div className="event-options-heading-rule" />
                </div>
                <button
                  type="button"
                  className="event-option event-option--history-choice"
                  disabled
                >
                  <div className="event-option-body">
                    <div className="event-option-text">{historyEntry?.chosenOptionText}</div>
                  </div>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPopup;
