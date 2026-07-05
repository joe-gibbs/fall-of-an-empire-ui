import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Event, EventChoiceInputs, EventPersonNameInput, EventRegnalNameInput } from '../../data/types';
import { playSound } from '../../hooks/useSound';
import { toRootRem } from '../../utils/cssUnits';
import { renderEventTextChunk } from '../../utils/eventTextFlow';
import { renderRichText } from '../../utils/richText';
import Portrait from '../common/portraits/Portrait';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
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

function isDragBlocked(target: EventTarget | null, root: HTMLElement | null): boolean {
  if (!target || !root) return true;

  let element = target as HTMLElement | null;
  while (element && element !== root) {
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (
      tagName === 'button'
      || tagName === 'input'
      || tagName === 'select'
      || tagName === 'textarea'
    ) {
      return true;
    }

    const className = typeof element.className === 'string' ? element.className : '';
    if (
      className.indexOf('event-link') >= 0
      || className.indexOf('event-content-scroll') >= 0
      || className.indexOf('styled-scroll-area') >= 0
      || className.indexOf('event-options') >= 0
      || className.indexOf('event-option') >= 0
      || className.indexOf('tooltip-wrapper') >= 0
    ) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
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
  const popupRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [closing, setClosing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [regnalName, setRegnalName] = useState(event.regnalNameInput?.value || '');
  const [personName, setPersonName] = useState(event.personNameInput?.value || '');
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
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

  const beginDrag = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: offset.x,
      origY: offset.y,
    };
  }, [offset]);

  const handlePopupMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || closing) return;
    if (isDragBlocked(e.target, popupRef.current)) return;
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);
  }, [beginDrag, closing]);

  useEffect(() => {
    const moveTo = (clientX: number, clientY: number) => {
      if (!dragRef.current) return;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setOffset({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const endDrag = () => {
      dragRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => moveTo(e.clientX, e.clientY);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', endDrag);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', endDrag);
    };
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

  const paragraphs = splitEventParagraphs(event.body);
  const regnalNumberText = getRegnalNumberText(event.regnalNameInput, regnalName);
  const isImportant = event.presentationStyle === 'important';
  const overlayClassName = `modal-overlay event-overlay${isImportant ? ' event-overlay--important' : ''}${closing ? ' event-overlay--closing' : ''}`;
  const wipeClassName = `event-popup-wipe${isImportant ? ' event-popup-wipe--important' : ''}${closing ? ' event-popup-wipe--closing' : ''}`;
  const popupClassName = `modal event-popup${isImportant ? ' event-popup--important' : ''}${closing ? ' event-popup--closing' : ''}`;

  return (
    <div className={overlayClassName}>
      <div className={wipeClassName}>
        <div
          ref={popupRef}
          className={popupClassName}
          style={{
            transform: `translate(${toRootRem(offset.x)}, ${toRootRem(offset.y)})`,
          }}
          onMouseDown={handlePopupMouseDown}
        >
          {/* Drag handle bar */}
          <div className="event-toolbar" />

          {/* Hero image with vignette + title scrim (matches char-header) */}
          <div className="event-hero">
            {event.image ? (
              <img src={event.image} alt={event.title} className="event-hero-img" draggable={false} />
            ) : (
              <div className="event-hero-placeholder">
                <span className="event-hero-placeholder-text"><WebUIText textKey="Auto.ComponentsEventsEventPopup.292.1" /></span>
              </div>
            )}
            <div className="event-hero-scrim">
              <div className="event-hero-title">{event.title}</div>
            </div>
          </div>

          {event.sender && (
            <div className="event-sender">
              <Portrait
                personId={event.sender.personId}
                src={event.sender.portrait}
                layers={event.sender.portraitLayers}
                name={event.sender.name}
                size="sm"
                showBadge={false}
                className="event-sender-portrait"
              />
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
            {event.regnalNameInput && (
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

            {event.personNameInput && (
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPopup;
