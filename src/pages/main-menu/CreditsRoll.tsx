import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { webUIText, WebUIText } from '../../localization/WebUITextContext';

const CREDITS_ROLL_SPEED_PX_PER_SECOND = 55;

const credits: { roleKey: string; names: string[] }[] = [
  { roleKey: 'MainMenu.Credits.MusicComposer', names: ['Martin de Lima', 'Artem Yegorov'] },
  { roleKey: 'MainMenu.Credits.MusicDeptImplementation', names: ['Sander Tolner'] },
  { roleKey: 'MainMenu.Credits.UIDesigner', names: ['Maria Camila Ortega', 'Bagus Bayhaqi'] },
  { roleKey: 'MainMenu.Credits.Writing', names: ['Raben Macht'] },
  { roleKey: 'MainMenu.Credits.ArtisticDirectorEvents', names: ['Thomas Gibbs'] },
  { roleKey: 'MainMenu.Credits.CharacterArtist', names: ['Carlos Tellez'] },
  { roleKey: 'MainMenu.Credits.EnvironmentArtist', names: ['Aytunç Yılmaz', 'HiMasters'] },
  { roleKey: 'MainMenu.Credits.TechnicalArtist', names: ['Anna Moisieieva'] },
  { roleKey: 'MainMenu.Credits.CapsuleArt', names: ['Aytunç Yılmaz'] },
  { roleKey: 'MainMenu.Credits.Casting', names: ['Bridgette Roza'] },
  { roleKey: 'MainMenu.Credits.Testing', names: ['Bridgette Roza', 'Thomas Gibbs'] },
  { roleKey: 'MainMenu.Credits.Artists', names: ['Octavio Sebastian', 'Threy Cameron', 'Oksana Mykytiuk'] },
  { roleKey: 'MainMenu.Credits.LogoDesigner', names: ['Marel Frederiek van Buren'] },
  { roleKey: 'MainMenu.Credits.Concepts', names: ['Samuel Losada'] },
  { roleKey: 'MainMenu.Credits.EmperorTrailer', names: ['Will Melhuish'] },
  { roleKey: 'MainMenu.Credits.Marketing', names: ['Isabelle Bruce', 'Alexander Harding'] },
  { roleKey: 'MainMenu.Credits.TrailerRecordingEngineer', names: ['Aturax Audio'] },
  { roleKey: 'MainMenu.Credits.TrailerNarrator', names: ['Ghyll Cannell'] },
  { roleKey: 'MainMenu.Credits.SpecialThanks', names: ['G. Gerhards', 'Bridgette Roza', '@Gabrielkouda'] },
];

export default function CreditsRoll() {
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rollStyle, setRollStyle] = useState<CSSProperties>({
    animationDuration: '48s',
    paddingBottom: '40rem',
  });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;

    const syncRollMetrics = () => {
      const stageH = stage.clientHeight;
      const contentH = content.scrollHeight;
      if (stageH <= 0 || contentH <= 0) return;

      const durationMs = ((stageH + contentH) / CREDITS_ROLL_SPEED_PX_PER_SECOND) * 1000;
      setRollStyle({
        animationDuration: `${Math.round(durationMs)}ms`,
        paddingBottom: `${Math.round(stageH)}px`,
      });
    };

    syncRollMetrics();
    window.addEventListener('resize', syncRollMetrics);
    return () => {
      window.removeEventListener('resize', syncRollMetrics);
    };
  }, []);

  return (
    <div
      className="mm-credits-stage"
      ref={stageRef}
    >
      <div
        className="mm-credits-scroll"
        style={rollStyle}
      >
        <div className="mm-credits-content" ref={contentRef}>
          <div className="mm-credits-tagline">
            <span className="mm-credits-tagline-small"><WebUIText textKey="Auto.PagesMainMenu.172.2" /> </span>
            <span className="mm-credits-tagline-large"><WebUIText textKey="Auto.PagesMainMenu.173.3" /></span>
            <span className="mm-credits-tagline-small"> <WebUIText textKey="Auto.PagesMainMenu.174.4" /></span>
          </div>

          {credits.map(c => (
            <div key={c.roleKey} className="mm-credit-block">
              <div className="mm-credit-role">{webUIText(c.roleKey)}</div>
              {c.names.map(n => (
                <div key={n} className="mm-credit-name">{n}</div>
              ))}
            </div>
          ))}

          <div className="mm-credits-rule-wide" />

          <div className="mm-credits-footer">
            <p className="mm-credits-ue-notice">
              <WebUIText textKey="Auto.PagesMainMenu.190.5" />
            </p>
            <p className="mm-credits-copyright"><WebUIText textKey="Auto.PagesMainMenu.192.6" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}
