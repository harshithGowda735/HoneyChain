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
 * BeehiveIllustration - Hand-drawn Wooden Beehive with Honeycomb Pattern
 * Outlines: #493D32, Roof: #F5AC19, Hive Body: #FFF5D9 / #FFFEF8, Accents: #879779
 */
export function BeehiveIllustration({ size = 80, style }) {
  const width = size;
  const height = size * 0.95;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 95" fill="none" style={style}>
      {/* Hive Stand Legs */}
      <Path
        d="M 24 74 L 20 90 M 76 74 L 80 90"
        stroke="#493D32"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <Path
        d="M 18 76 L 82 76"
        stroke="#493D32"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Hive Body Box (Bottom Deep Super) */}
      <Rect
        x="24"
        y="50"
        width="52"
        height="24"
        rx="3"
        fill="#FFFEF8"
        stroke="#493D32"
        strokeWidth="2.5"
      />
      {/* Wood plank line */}
      <Line
        x1="26"
        y1="62"
        x2="74"
        y2="62"
        stroke="#EFE3C9"
        strokeWidth="1.8"
      />

      {/* Hive Body Box (Top Honey Super) */}
      <Rect
        x="22"
        y="28"
        width="56"
        height="22"
        rx="3"
        fill="#FFF5D9"
        stroke="#493D32"
        strokeWidth="2.5"
      />
      {/* Wood plank line */}
      <Line
        x1="24"
        y1="39"
        x2="76"
        y2="39"
        stroke="#EFE3C9"
        strokeWidth="1.8"
      />

      {/* Honeycomb pattern detail on top box */}
      <Path
        d="M 44 32 L 48 30 L 52 32 L 52 36 L 48 38 L 44 36 Z"
        fill="#F9D76A"
        stroke="#D98B0B"
        strokeWidth="1.2"
      />
      <Path
        d="M 52 32 L 56 30 L 60 32 L 60 36 L 56 38 L 52 36 Z"
        fill="#F9D76A"
        stroke="#D98B0B"
        strokeWidth="1.2"
      />
      <Path
        d="M 48 38 L 52 36 L 56 38 L 56 42 L 52 44 L 48 42 Z"
        fill="#F5AC19"
        stroke="#D98B0B"
        strokeWidth="1.2"
      />

      {/* Entrance Reducer Slot */}
      <Rect
        x="40"
        y="67"
        width="20"
        height="4.5"
        rx="2"
        fill="#493D32"
      />
      {/* Landing Board Slope */}
      <Path
        d="M 19 75 L 81 75 L 85 79 L 15 79 Z"
        fill="#F5AC19"
        stroke="#493D32"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Pitched Roof (Telescoping Outer Cover) */}
      <Path
        d="M 12 28 L 50 12 L 88 28 L 84 31 L 16 31 Z"
        fill="#F5AC19"
        stroke="#493D32"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Roof ridge highlight */}
      <Path
        d="M 18 27 L 50 14 L 82 27"
        stroke="#F9D76A"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Little flying worker bee on top right */}
      <G transform="translate(74, 14) scale(0.65)">
        <Ellipse cx="10" cy="10" rx="6" ry="4" fill="#F5AC19" stroke="#493D32" strokeWidth="1.2" />
        <Line x1="9" y1="6" x2="9" y2="14" stroke="#493D32" strokeWidth="1.5" />
        <Ellipse cx="7" cy="6" rx="4" ry="5" fill="#FFFFFF" opacity={0.8} stroke="#493D32" strokeWidth="1" />
      </G>

      {/* Small botanical clover on bottom left */}
      <Path
        d="M 12 88 C 14 83, 16 80, 20 82"
        stroke="#879779"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="83" r="2.5" fill="#879779" />
      <Circle cx="15" cy="81" r="2.5" fill="#879779" />
    </Svg>
  );
}

export default BeehiveIllustration;
