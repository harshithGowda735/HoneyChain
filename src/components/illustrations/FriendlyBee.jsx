import React from 'react';
import Svg, {
  Path,
  Circle,
  Ellipse,
  G,
} from 'react-native-svg';

/**
 * FriendlyBee - Hand-drawn Sketch Honeybee
 * Warm brown outline (#493D32), honey-gold body (#F5AC19),
 * amber stripes (#D98B0B), and translucent delicate wings (#EAF4F4).
 */
export function FriendlyBee({
  size = 48,
  style,
  animated = false,
  showFlightPath = false,
}) {
  const width = size;
  const height = size * (showFlightPath ? 0.9 : 0.85);

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 85"
      fill="none"
      style={style}
    >
      {/* Optional dashed flight trail */}
      {showFlightPath && (
        <Path
          d="M 5 65 C 15 75, 25 55, 38 62"
          stroke="#D98B0B"
          strokeWidth="1.8"
          strokeDasharray="3 3"
          strokeLinecap="round"
          opacity={0.6}
        />
      )}

      {/* Back Wing */}
      <Ellipse
        cx="44"
        cy="26"
        rx="15"
        ry="23"
        transform="rotate(-22 44 26)"
        fill="#FFFFFF"
        fillOpacity={0.8}
        stroke="#493D32"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Back Wing Veins */}
      <Path
        d="M 44 38 C 42 30, 44 20, 46 12"
        stroke="#879779"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Fore Wing */}
      <Ellipse
        cx="57"
        cy="22"
        rx="16"
        ry="25"
        transform="rotate(18 57 22)"
        fill="#FFFDF7"
        fillOpacity={0.92}
        stroke="#493D32"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Fore Wing Veins */}
      <Path
        d="M 54 36 C 56 26, 58 18, 62 8"
        stroke="#879779"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity={0.7}
      />
      <Path
        d="M 56 26 C 62 23, 67 22, 70 20"
        stroke="#879779"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={0.5}
      />

      {/* Bee Body (Abdomen + Thorax) */}
      <G>
        {/* Stinger */}
        <Path
          d="M 27 57 L 20 60 L 29 63 Z"
          fill="#493D32"
          stroke="#493D32"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Abdomen Base */}
        <Ellipse
          cx="48"
          cy="57"
          rx="24"
          ry="19"
          transform="rotate(8 48 57)"
          fill="#F5AC19"
          stroke="#493D32"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Abdomen Stripes (Hand-drawn look) */}
        <Path
          d="M 41 39 C 39 49, 39 63, 44 75"
          stroke="#493D32"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M 51 39 C 50 49, 51 63, 56 75"
          stroke="#493D32"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M 61 41 C 61 48, 62 58, 66 71"
          stroke="#493D32"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Warm Honey Sheen Highlight */}
        <Path
          d="M 36 46 C 42 43, 52 44, 58 48"
          stroke="#FFF1C5"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={0.8}
        />

        {/* Head */}
        <Circle
          cx="76"
          cy="51"
          r="13"
          fill="#493D32"
          stroke="#493D32"
          strokeWidth="2"
        />

        {/* Friendly Eye */}
        <Circle cx="79" cy="49" r="3.2" fill="#FFFFFF" />
        <Circle cx="80" cy="48.5" r="1.6" fill="#493D32" />
        <Circle cx="80.6" cy="48" r="0.6" fill="#FFFFFF" />

        {/* Rosy Cheek */}
        <Circle cx="76" cy="56" r="2.8" fill="#F9D76A" opacity={0.8} />

        {/* Antenna 1 */}
        <Path
          d="M 80 40 C 83 34, 87 32, 90 34"
          stroke="#493D32"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="90" cy="34" r="1.6" fill="#493D32" />

        {/* Antenna 2 */}
        <Path
          d="M 84 43 C 89 39, 93 39, 95 42"
          stroke="#493D32"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="95" cy="42" r="1.6" fill="#493D32" />

        {/* Little pollen basket (corbicula) on leg */}
        <Ellipse
          cx="47"
          cy="73"
          rx="3.5"
          ry="5"
          transform="rotate(25 47 73)"
          fill="#F9D76A"
          stroke="#493D32"
          strokeWidth="1.4"
        />
      </G>
    </Svg>
  );
}

export default FriendlyBee;
