import { Component } from 'react';
import EventPopup from '../events/EventPopup';
import type { Event as GameEvent, EventChoiceInputs } from '../../data/types';

interface EventPopupSlotProps {
  event: GameEvent | null;
  onOptionSelect: (index: number, inputs?: EventChoiceInputs) => void;
  onLinkClick?: (type: string, id: string) => void;
}

interface EventPopupSlotState {
  presentedEvent: GameEvent | null;
}

export default class EventPopupSlot extends Component<EventPopupSlotProps, EventPopupSlotState> {
  state: EventPopupSlotState = {
    presentedEvent: this.props.event,
  };

  static getDerivedStateFromProps(props: EventPopupSlotProps, state: EventPopupSlotState): Partial<EventPopupSlotState> | null {
    if (!props.event || props.event === state.presentedEvent) return null;
    return { presentedEvent: props.event };
  }

  private handleClosed = (eventId: string) => {
    this.setState(state => (
      state.presentedEvent?.id === eventId
        ? { presentedEvent: null }
        : null
    ));
  };

  render() {
    const event = this.state.presentedEvent;
    if (!event) return null;

    return (
      <EventPopup
        key={event.id}
        event={event}
        visible={!!this.props.event && this.props.event.id === event.id}
        onClose={() => this.handleClosed(event.id)}
        onOptionSelect={this.props.onOptionSelect}
        onLinkClick={this.props.onLinkClick}
      />
    );
  }
}
