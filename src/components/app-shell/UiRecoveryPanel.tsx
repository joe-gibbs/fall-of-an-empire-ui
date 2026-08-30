import { useEffect, useRef } from 'react'
import GameButton from '../common/buttons/GameButton'
import { webUIText } from '../../localization/WebUITextContext'
import './UiRecoveryPanel.css'

export default function UiRecoveryPanel({ onReload }: { onReload: () => void }) {
  const reloadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const button = reloadRef.current?.querySelector('button')
    button?.focus()
  }, [])

  return (
    <div className="game-cursor-surface ui-recovery" data-webkiln-world-input>
      <div className="modal ui-recovery__panel">
        <h2 className="ui-recovery__message">{webUIText('UiRecovery.Message')}</h2>
        <div className="ui-recovery__actions" ref={reloadRef}>
          <GameButton variant="burgundy" onClick={onReload}>
            {webUIText('UiRecovery.Reload')}
          </GameButton>
        </div>
      </div>
    </div>
  )
}
