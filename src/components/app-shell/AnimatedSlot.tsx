import { Component, type AnimationEvent, type ReactNode } from 'react';

/** Keeps children mounted and frozen during exit animation when requested. */
interface AnimatedSlotProps {
  active: boolean;
  className: string;
  children: ReactNode;
  keepMountedOnExit?: boolean;
}

interface AnimatedSlotState {
  mounted: boolean;
  frozenClassName: string;
  frozenChildren: ReactNode;
}

export default class AnimatedSlot extends Component<AnimatedSlotProps, AnimatedSlotState> {
  state: AnimatedSlotState = {
    mounted: this.props.active,
    frozenClassName: this.props.className,
    frozenChildren: this.props.active ? this.props.children : null,
  };

  private exitFallbackTimer: number | null = null;

  static getDerivedStateFromProps(props: AnimatedSlotProps, state: AnimatedSlotState): Partial<AnimatedSlotState> | null {
    if (!props.active) {
      if (props.keepMountedOnExit === false && state.mounted) {
        return {
          mounted: false,
          frozenChildren: null,
        };
      }
      return null;
    }
    if (
      state.mounted
      && state.frozenClassName === props.className
      && state.frozenChildren === props.children
    ) {
      return null;
    }
    return {
      mounted: true,
      frozenClassName: props.className,
      frozenChildren: props.children,
    };
  }

  componentDidUpdate(prevProps: AnimatedSlotProps) {
    const exiting = this.state.mounted && !this.props.active;
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
    const exiting = this.state.mounted && !this.props.active;
    if (!exiting) return;
    this.clearExitFallback();
    this.setState({ mounted: false, frozenChildren: null });
  };

  private handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as Node).parentNode !== e.currentTarget) return;
    const exiting = this.state.mounted && !this.props.active;
    if (exiting) this.finishExit();
  };

  render() {
    const exiting = this.state.mounted && !this.props.active;
    if (!this.state.mounted) return null;

    const className = exiting ? this.state.frozenClassName : this.props.className;
    return (
      <div
        className={`${className}${exiting ? ' slot--exiting' : ''}`}
        onAnimationEnd={this.handleAnimationEnd}
      >
        {exiting ? this.state.frozenChildren : this.props.children}
      </div>
    );
  }
}
