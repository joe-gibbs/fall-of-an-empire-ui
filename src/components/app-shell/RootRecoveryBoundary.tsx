import { Component, Fragment, type ReactNode } from 'react'
import type { RootRecoveryController } from '../../utils/reactRootRecovery'
import UiRecoveryPanel from './UiRecoveryPanel'

type RecoveryPhase = 'live' | 'recovering' | 'exhausted'

type RootRecoveryBoundaryProps = {
  controller: RootRecoveryController
  fallback: 'panel' | 'empty'
  onReload: () => void
  children: ReactNode
}

type RootRecoveryBoundaryState = {
  generation: number
  phase: RecoveryPhase
}

export default class RootRecoveryBoundary extends Component<
  RootRecoveryBoundaryProps,
  RootRecoveryBoundaryState
> {
  private recoverFrame = 0
  private retryTimer = 0

  constructor(props: RootRecoveryBoundaryProps) {
    super(props)
    this.state = {
      generation: 0,
      phase: props.controller.isExhausted() ? 'exhausted' : 'live',
    }
  }

  static getDerivedStateFromError(): Pick<RootRecoveryBoundaryState, 'phase'> {
    return { phase: 'recovering' }
  }

  override componentDidMount(): void {
    this.props.controller.noteBoundaryMount()
    this.scheduleEmptyRetryIfNeeded()
  }

  override componentDidCatch(): void {
    const decision = this.props.controller.beginRecover()
    if (decision === 'exhausted') {
      this.setState({ phase: 'exhausted' })
      this.scheduleEmptyRetryIfNeeded()
      return
    }
    this.clearRecoverFrame()
    this.recoverFrame = requestAnimationFrame(() => {
      this.recoverFrame = 0
      this.setState(state => ({
        phase: 'live',
        generation: state.generation + 1,
      }))
    })
  }

  override componentDidUpdate(): void {
    this.scheduleEmptyRetryIfNeeded()
  }

  override componentWillUnmount(): void {
    this.clearRecoverFrame()
    this.clearRetryTimer()
    this.props.controller.noteBoundaryUnmount()
  }

  override render(): ReactNode {
    if (this.state.phase === 'exhausted' && this.props.fallback === 'panel') {
      return <UiRecoveryPanel onReload={this.props.onReload} />
    }
    if (this.state.phase !== 'live') {
      return null
    }
    return <Fragment key={this.state.generation}>{this.props.children}</Fragment>
  }

  private scheduleEmptyRetryIfNeeded(): void {
    if (this.state.phase !== 'exhausted' || this.props.fallback !== 'empty') return
    if (this.retryTimer !== 0) return
    const delay = Math.max(0, this.props.controller.retryDelayMs())
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = 0
      this.props.controller.reset()
      this.setState(state => ({
        phase: 'live',
        generation: state.generation + 1,
      }))
    }, delay)
  }

  private clearRecoverFrame(): void {
    if (this.recoverFrame === 0) return
    cancelAnimationFrame(this.recoverFrame)
    this.recoverFrame = 0
  }

  private clearRetryTimer(): void {
    if (this.retryTimer === 0) return
    window.clearTimeout(this.retryTimer)
    this.retryTimer = 0
  }
}
