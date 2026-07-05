import React from 'react';
import './MapPlaceholder.css';

import { webUIText, WebUIText } from '../../localization/WebUITextContext';
interface SettlementMarker {
  name: string;
  x: number;
  y: number;
}

interface MapPlaceholderProps {
  settlements?: SettlementMarker[];
}

const defaultSettlements: SettlementMarker[] = [
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.16.1"); }, x: 35, y: 28 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.17.1"); }, x: 55, y: 42 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.18.1"); }, x: 72, y: 35 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.19.1"); }, x: 25, y: 55 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.20.1"); }, x: 48, y: 65 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.21.1"); }, x: 68, y: 58 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.22.1"); }, x: 82, y: 48 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.23.1"); }, x: 40, y: 78 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.24.1"); }, x: 60, y: 22 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.25.1"); }, x: 18, y: 40 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.26.1"); }, x: 88, y: 68 },
  { get name() { return webUIText("Auto.Prop.componentsmapMapPlaceholder.27.1"); }, x: 30, y: 70 },
];

const regions = [
  { x: '20%', y: '25%', w: '30%', h: '35%', colour: '#8b2020' },
  { x: '52%', y: '22%', w: '25%', h: '30%', colour: '#204878' },
  { x: '30%', y: '50%', w: '28%', h: '28%', colour: '#2a6830' },
  { x: '62%', y: '45%', w: '22%', h: '30%', colour: '#5a2878' },
  { x: '8%', y: '55%', w: '22%', h: '28%', colour: '#887020' },
];

const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ settlements }) => {
  const markers = settlements ?? defaultSettlements;

  return (
    <div className="map-placeholder">
      <div className="map-bg" />

      <div className="map-regions">
        {regions.map((r, i) => (
          <div
            key={i}
            className="map-region"
            style={{
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              backgroundColor: r.colour,
            }}
          />
        ))}
      </div>

      <div className="map-grid" />

      {/* Large faction labels like the game */}
      <div className="map-faction-label" style={{ left: '22%', top: '32%', transform: 'rotate(-5deg)' }}>
        <WebUIText textKey="Auto.ComponentsMapMapPlaceholder.64.1" />
      </div>
      <div className="map-faction-label" style={{ left: '55%', top: '28%', fontSize: '1.6364rem', letterSpacing: '0.7273rem', transform: 'rotate(3deg)' }}>
        <WebUIText textKey="Auto.ComponentsMapMapPlaceholder.67.2" />
      </div>
      <div className="map-faction-label" style={{ left: '62%', top: '55%', fontSize: '1.4545rem', letterSpacing: '0.5455rem', transform: 'rotate(-2deg)' }}>
        <WebUIText textKey="Auto.ComponentsMapMapPlaceholder.70.3" />
      </div>

      {markers.map((s, i) => (
        <div
          key={i}
          className="map-settlement"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <div className="map-settlement-dot" />
          <span className="map-settlement-name">{s.name}</span>
        </div>
      ))}
    </div>
  );
};

export default MapPlaceholder;
