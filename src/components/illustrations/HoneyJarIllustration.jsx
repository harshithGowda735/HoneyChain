import React from 'react';
import Svg, {
  Path,
  Rect,
  Circle,
  Ellipse,
  G,
  Line,
} from 'react-native-svg';

/**
 * HoneyJarIllustration - Glass Jar of Pure Raw Honey with Dipper and Drop
 * Outlines: #493D32, Honey: #F5AC19 / #D98B0B, Glass sheen: #FFF8E7, Fabric lid: #FFF1C5
 */
export function HoneyJarIllustration({ size = 80, style }) {
  const width = size;
  const height = size * 0.95;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 95" fill="none" style={style}>
      {/* Jar Body Shadow */}
      <Ellipse cx="50" cy="88" rx="28" ry="4" fill="#EFE3C9" />

      {/* Honey Jar Glass Body */}
      <Path
        d="M 28 36 C 24 45, 23 72, 28 82 C 30 85, 70 85, 72 82 C 77 72, 76 45, 72 36 Z"
        fill="#FFFEF8"
        stroke="#493D32"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Golden Raw Honey Level Fill */}
      <Path
        d="M 26 48 C 36 44, 64 44, 74 48 C 76 68, 74 79, 71 82 C 67 85, 33 85, 29 82 C 26 79, 24 68, 26 48 Z"
        fill="#F5AC19"
        fillOpacity={0.92}
      />

      {/* Honey Depth Gradient Band (Deep Amber) */}
      <Path
        d="M 27 64 C 40 60, 60 60, 73 64 C 74 75, 72 80, 70 82 C 67 84, 33 84, 30 82 C 28 80, 26 75, 27 64 Z"
        fill="#D98B0B"
        fillOpacity={0.7}
      />

      {/* Glass Light Reflection / Sheen */}
      <Path
        d="M 33 50 C 31 58, 31 72, 33 78"
        stroke="#FFFDF7"
        strokeWidth="3"
        strokeLinecap="round"
        opacity={0.85}
      />
      <Path
        d="M 38 52 C 37 56, 37 68, 38 72"
        stroke="#FFFDF7"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.65}
      />

      {/* Jar Label (Parchment Paper) */}
      <Rect
        x="36"
        y="54"
        width="28"
        height="18"
        rx="3"
        fill="#FFFDF7"
        stroke="#493D32"
        strokeWidth="1.4"
      />
      {/* Honeycomb badge on label */}
      <Path
        d="M 48 60 L 50 58.5 L 52 60 L 52 63 L 50 64.5 L 48 63 Z"
        fill="#F5AC19"
        stroke="#493D32"
        strokeWidth="1"
      />
      <Line x1="43" y1="68" x2="57" y2="68" stroke="#817565" strokeWidth="1.2" strokeLinecap="round" />

      {/* Fabric Lid Cover (tied with twine) */}
      <Path
        d="M 23 32 C 30 29, 70 29, 77 32 C 80 34, 76 38, 71 37 C 65 36, 35 36, 29 37 C 24 38, 20 34, 23 32 Z"
        fill="#FFF1C5"
        stroke="#493D32"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <Path
        d="M 30 30 C 35 22, 65 22, 70 30 Z"
        fill="#F9D76A"
        stroke="#493D32"
        strokeWidth="2"
      />

      {/* Twine Bow & String */}
      <Path
        d="M 26 36 Q 50 38 74 36"
        stroke="#493D32"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Ellipse cx="72" cy="38" rx="3" ry="2" fill="none" stroke="#493D32" strokeWidth="1.6" />
      <Path
        d="M 72 38 C 76 42, 78 46, 75 49"
        stroke="#493D32"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Honey Dipper Dripping (Right Side) */}
      <G transform="translate(68, 6) rotate(32)">
        {/* Dipper Handle */}
        <Line x1="8" y1="2" x2="8" y2="34" stroke="#D98B0B" strokeWidth="3" strokeLinecap="round" />
        <Line x1="8" y1="2" x2="8" y2="34" stroke="#493D32" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 1" />

        {/* Dipper Rings */}
        <Ellipse cx="8" cy="24" rx="6" ry="2.5" fill="#F5AC19" stroke="#493D32" strokeWidth="1.4" />
        <Ellipse cx="8" cy="28" rx="7.5" ry="3" fill="#F5AC19" stroke="#493D32" strokeWidth="1.4" />
        <Ellipse cx="8" cy="32" rx="6" ry="2.5" fill="#F5AC19" stroke="#493D32" strokeWidth="1.4" />
        <Circle cx="8" cy="35" r="4" fill="#D98B0B" stroke="#493D32" strokeWidth="1.4" />
      </G>

      {/* Dripping Golden Honey Droplet */}
      <Path
        d="M 85 45 C 83 48, 81 53, 85 57 C 89 53, 87 48, 85 45 Z"
        fill="#F5AC19"
        stroke="#493D32"
        strokeWidth="1.4"
      />
    </Svg>
  );
}

export default HoneyJarIllustration;
