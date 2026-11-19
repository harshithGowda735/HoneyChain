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
 * EmptyApiaryIllustration - Peaceful Apiary Bench with Wildflowers and Bee
 * Hand-drawn sketch look for empty apiary or empty lists.
 */
export function EmptyApiaryIllustration({ size = 140, style }) {
  const width = size;
  const height = size * 0.85;

  return (
    <Svg width={width} height={height} viewBox="0 0 160 135" fill="none" style={style}>
      {/* Gentle Earth Mound */}
      <Path
        d="M 10 120 Q 80 105 150 120"
        stroke="#EFE3C9"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Wooden Hive Bench Stand */}
      <Path
        d="M 35 90 L 30 115 M 125 90 L 130 115 M 48 90 L 45 115 M 112 90 L 115 115"
        stroke="#493D32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Rect
        x="24"
        y="84"
        width="112"
        height="8"
        rx="2"
        fill="#FFF1C5"
        stroke="#493D32"
        strokeWidth="2"
      />

      {/* Single Ready Hive Box waiting on stand */}
      <Rect
        x="52"
        y="46"
        width="56"
        height="38"
        rx="3"
        fill="#FFFEF8"
        stroke="#493D32"
        strokeWidth="2.2"
      />
      {/* Planks */}
      <Line x1="54" y1="58" x2="106" y2="58" stroke="#EFE3C9" strokeWidth="1.6" />
      <Line x1="54" y1="70" x2="106" y2="70" stroke="#EFE3C9" strokeWidth="1.6" />

      {/* Pitched Roof */}
      <Path
        d="M 44 46 L 80 28 L 116 46 Z"
        fill="#F5AC19"
        stroke="#493D32"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Honeycomb icon on front of hive */}
      <Path
        d="M 77 62 L 80 60 L 83 62 L 83 66 L 80 68 L 77 66 Z"
        fill="#F9D76A"
        stroke="#D98B0B"
        strokeWidth="1.2"
      />

      {/* Wildflowers sprouting beside the stand */}
      <G transform="translate(18, 92)">
        <Path d="M 6 22 Q 4 10 10 0" stroke="#879779" strokeWidth="1.6" strokeLinecap="round" />
        <Circle cx="10" cy="0" r="3.5" fill="#F5AC19" stroke="#493D32" strokeWidth="1" />
        <Circle cx="10" cy="0" r="1.5" fill="#493D32" />
        <Path d="M 5 12 C 0 10 0 5 4 8 Z" fill="#879779" />
      </G>

      <G transform="translate(132, 94)">
        <Path d="M 2 20 Q 8 10 4 0" stroke="#879779" strokeWidth="1.6" strokeLinecap="round" />
        <Circle cx="4" cy="0" r="3" fill="#F9D76A" stroke="#493D32" strokeWidth="1" />
        <Path d="M 4 10 C 9 8 9 4 5 7 Z" fill="#879779" />
      </G>

      {/* Inquisitive Bee hovering above */}
      <G transform="translate(98, 18) rotate(-12) scale(0.7)">
        <Ellipse cx="20" cy="15" rx="10" ry="7" fill="#F5AC19" stroke="#493D32" strokeWidth="1.8" />
        <Line x1="17" y1="9" x2="17" y2="21" stroke="#493D32" strokeWidth="2.2" />
        <Line x1="22" y1="9" x2="22" y2="21" stroke="#493D32" strokeWidth="2.2" />
        <Circle cx="29" cy="14" r="5" fill="#493D32" />
        <Ellipse cx="16" cy="6" rx="5" ry="7" fill="#FFFFFF" opacity={0.85} stroke="#493D32" strokeWidth="1.2" />
      </G>

      {/* Flight dash */}
      <Path
        d="M 125 32 Q 112 40 108 30"
        stroke="#D98B0B"
        strokeWidth="1.4"
        strokeDasharray="2 2"
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}

export default EmptyApiaryIllustration;
