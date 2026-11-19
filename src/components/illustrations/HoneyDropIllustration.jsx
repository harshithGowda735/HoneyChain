import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * HoneyDropIllustration - Glossy Rich Amber Honey Droplet
 */
export function HoneyDropIllustration({ size = 32, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={style}>
      <Defs>
        <LinearGradient id="honeyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F9D76A" />
          <Stop offset="0.6" stopColor="#F5AC19" />
          <Stop offset="1" stopColor="#D98B0B" />
        </LinearGradient>
      </Defs>

      {/* Main Droplet */}
      <Path
        d="M 20 4 C 18 10, 8 22, 8 28 C 8 34.6, 13.4 39, 20 39 C 26.6 39, 32 34.6, 32 28 C 32 22, 22 10, 20 4 Z"
        fill="url(#honeyGrad)"
        stroke="#493D32"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Gloss Highlight Curve */}
      <Path
        d="M 14 24 C 13 28, 14 33, 17 35"
        stroke="#FFFDF7"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={0.8}
      />
      <Circle cx="17" cy="19" r="1.5" fill="#FFFDF7" opacity={0.9} />
    </Svg>
  );
}

export default HoneyDropIllustration;
