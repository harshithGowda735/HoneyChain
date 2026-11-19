import React from 'react';
import Svg, {
  Path,
  Ellipse,
  G,
  Line,
} from 'react-native-svg';

/**
 * EmptyNotificationIllustration - Honeycomb Bell with a Peaceful Sleeping Bee
 * Hand-drawn warm sketch for notification inbox when all hives are healthy.
 */
export function EmptyNotificationIllustration({ size = 120, style }) {
  const width = size;
  const height = size * 0.95;

  return (
    <Svg width={width} height={height} viewBox="0 0 140 130" fill="none" style={style}>
      {/* Soft Honeycomb Halo Background */}
      <Path
        d="M 60 12 L 75 4 L 90 12 L 90 28 L 75 36 L 60 28 Z"
        fill="#FFF5D9"
        stroke="#EFE3C9"
        strokeWidth="1.2"
        opacity={0.6}
      />
      <Path
        d="M 40 40 L 55 32 L 70 40 L 70 56 L 55 64 L 40 56 Z"
        fill="#FFF5D9"
        stroke="#EFE3C9"
        strokeWidth="1.2"
        opacity={0.5}
      />

      {/* Bell Loop / Hook */}
      <Path
        d="M 64 28 C 64 20, 76 20, 76 28"
        stroke="#493D32"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Bell Body (Honey Gold Silhouette) */}
      <Path
        d="M 44 80 C 44 48, 56 30, 70 30 C 84 30, 96 48, 96 80 C 104 84, 106 90, 104 94 C 102 96, 38 96, 36 94 C 34 90, 36 84, 44 80 Z"
        fill="#FFFDF7"
        stroke="#493D32"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Honey Warm Fill in Bell */}
      <Path
        d="M 48 80 C 50 62, 58 52, 70 52 C 82 52, 90 62, 92 80 C 97 83, 98 88, 96 90 C 93 92, 47 92, 44 90 C 42 88, 43 83, 48 80 Z"
        fill="#F9D76A"
        fillOpacity={0.65}
      />

      {/* Honeycomb lattice on bell */}
      <Path
        d="M 66 62 L 70 60 L 74 62 L 74 66 L 70 68 L 66 66 Z"
        fill="#F5AC19"
        stroke="#D98B0B"
        strokeWidth="1.2"
      />
      <Path
        d="M 62 69 L 66 67 L 70 69 L 70 73 L 66 75 L 62 73 Z"
        fill="#F5AC19"
        stroke="#D98B0B"
        strokeWidth="1.2"
      />

      {/* Bell Clapper (Honey Droplet Clapper) */}
      <Path
        d="M 70 94 L 70 102"
        stroke="#493D32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M 70 102 C 67 106, 65 110, 70 115 C 75 110, 73 106, 70 102 Z"
        fill="#F5AC19"
        stroke="#493D32"
        strokeWidth="1.8"
      />

      {/* Sleeping Bee Resting atop the Bell */}
      <G transform="translate(74, 22) rotate(16)">
        <Ellipse cx="14" cy="10" rx="9" ry="6.5" fill="#F5AC19" stroke="#493D32" strokeWidth="1.8" />
        <Line x1="12" y1="4.5" x2="12" y2="15.5" stroke="#493D32" strokeWidth="2.2" />
        <Line x1="17" y1="4.5" x2="17" y2="15.5" stroke="#493D32" strokeWidth="2.2" />
        {/* Sleeping eye: gentle arc */}
        <Path d="M 20 10 Q 22 12 24 10" stroke="#493D32" strokeWidth="1.4" strokeLinecap="round" />
        {/* Folded wing */}
        <Ellipse cx="10" cy="5" rx="5" ry="3" fill="#FFFFFF" opacity={0.9} stroke="#493D32" strokeWidth="1.2" />
      </G>

      {/* Gentle Zzz sleepy marks */}
      <Path
        d="M 104 20 L 110 20 L 104 26 L 110 26"
        stroke="#D98B0B"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      <Path
        d="M 112 12 L 116 12 L 112 16 L 116 16"
        stroke="#D98B0B"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </Svg>
  );
}

export default EmptyNotificationIllustration;
