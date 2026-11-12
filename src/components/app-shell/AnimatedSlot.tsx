import { Component, type AnimationEvent, type ReactNode } from 'react';

// Exit animations that `.slot--exiting` applies to the slot's direct children (App.css, Sidebar.css).
// Any other animation ending inside the slot must not unmount it early.
const SLOT_EXIT_ANIMATIONS = new Set([
  'sidebar-flyout-left',
  'sidebar-flyout-right',
  'screen-panel-close',
  'screen-panel-close-bottom',
]);

/** Keeps children mounted and frozen during exit animation when requested. */
interface AnimatedSlotProps {
  active: boolean;
  className: string;
  children: ReactNode;
  keepMountedOnExit?: boolean;
  passesWorldInput?: boolean;
}

interface AnimatedSlotState {
  phase: 'active' | 'exiting' | 'unmounted';
  frozenClassName: string;
  frozenChildren: ReactNode;
}

export default class AnimatedSlot extends Component<AnimatedSlotProps, AnimatedSlotState> {
  state: AnimatedSlotState = {
    phase: this.props.active ? 'active' : 'unmounted',
    frozenClassName: this.props.className,
    frozenChildren: this.props.active ? this.props.children : null,
  };

  private exitFallbackTimer: number | null = null;

  static getDerivedStateFromProps(props: AnimatedSlotProps, state: AnimatedSlotState): Partial<AnimatedSlotState> | null {
    if (!props.active) {
      if (props.keepMountedOnExit === false && state.phase !== 'unmounted') {
        return {
          phase: 'unmounted',
          frozenChildren: null,
        };
      }
      return state.phase === 'active' ? { phase: 'exiting' } : null;
    }
    if (
      state.phase === 'active'
      && state.frozenClassName === props.className
      && state.frozenChildren === props.children
    ) {
      return null;
    }
    return {
      phase: 'active',
      frozenClassName: props.className,
      frozenChildren: props.children,
    };
  }

  componentDidUpdate(prevProps: AnimatedSlotProps) {
    const exiting = this.state.phase === 'exiting';
    if (exiting && (prevProps.active || this.exitFallbackTimer === null)) {
      this.clearExitFallback();
      this.exitFallbackTimer = window.setTimeout(this.finishExit, 360);
    }
    if ((this.props.active && !prevProps.active) || (!this.props.active && this.props.keepMountedOnExit === false)) {
      this.clearExitFallback();
    }
  }

  componentWillUnmount() {
    this.clearExitFallback();
  }

  private clearExitFallback = () => {
    if (this.exitFallbackTimer === null) return;
    window.clearTimeout(this.exitFallbackTimer);
    this.exitFallbackTimer = null;
  };

  private finishExit = () => {
    const exiting = this.state.phase === 'exiting';
    if (!exiting) return;
    this.clearExitFallback();
    this.setState({ phase: 'unmounted', frozenChildren: null });
  };

  private handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if ((e.target as Node).parentNode !== e.currentTarget || !SLOT_EXIT_ANIMATIONS.has(e.animationName)) return;
    const exiting = this.state.phase === 'exiting';
    if (exiting) this.finishExit();
  };

  render() {
    const exiting = this.state.phase === 'exiting';
    if (this.state.phase === 'unmounted') return null;

    const className = exiting ? this.state.frozenClassName : this.props.className;
    return (
      <div
        className={`${className}${exiting ? ' slot--exiting' : ''}`}
        data-webkiln-world-input={this.props.passesWorldInput ? '' : undefined}
        onAnimationEnd={this.handleAnimationEnd}
      >
        {exiting ? this.state.frozenChildren : this.props.children}
      </div>
    );
  }
}
