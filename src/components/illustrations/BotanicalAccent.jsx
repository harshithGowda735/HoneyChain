import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

/**
 * BotanicalAccent - Hand-drawn Wildflower & Sage Leaves
 * Colors: Outlines #493D32, Leaves #879779, Flower petals #FFF1C5 / #F5AC19
 */
export function BotanicalAccent({ size = 48, style }) {
  const width = size;
  const height = size * 0.9;

  return (
    <Svg width={width} height={height} viewBox="0 0 60 54" fill="none" style={style}>
      {/* Central Curved Stem */}
      <Path
        d="M 10 50 C 18 38, 28 28, 48 10"
        stroke="#493D32"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Leaf 1 (Left low) */}
      <Path
        d="M 18 42 C 14 36, 15 30, 22 34 C 23 37, 21 41, 18 42 Z"
        fill="#879779"
        stroke="#493D32"
        strokeWidth="1.2"
      />

      {/* Leaf 2 (Right mid) */}
      <Path
        d="M 30 31 C 36 28, 42 30, 37 36 C 33 37, 30 34, 30 31 Z"
        fill="#879779"
        stroke="#493D32"
        strokeWidth="1.2"
      />

      {/* Wild Mustard / Sunflower Blossom at tip */}
      <G transform="translate(46, 12)">
        {/* Petals */}
        <Circle cx="0" cy="-6" r="3.2" fill="#F9D76A" stroke="#493D32" strokeWidth="1" />
        <Circle cx="6" cy="-2" r="3.2" fill="#F5AC19" stroke="#493D32" strokeWidth="1" />
        <Circle cx="5" cy="5" r="3.2" fill="#F9D76A" stroke="#493D32" strokeWidth="1" />
        <Circle cx="-2" cy="6" r="3.2" fill="#F5AC19" stroke="#493D32" strokeWidth="1" />
        <Circle cx="-6" cy="0" r="3.2" fill="#F9D76A" stroke="#493D32" strokeWidth="1" />

        {/* Flower Center */}
        <Circle cx="0" cy="0" r="3.5" fill="#493D32" />
        <Circle cx="-0.8" cy="-0.8" r="1" fill="#F5AC19" />
      </G>

      {/* Little pollen sparkle */}
      <Circle cx="38" cy="14" r="1.5" fill="#F5AC19" />
      <Circle cx="54" cy="24" r="1.2" fill="#F9D76A" />
    </Svg>
  );
}

export default BotanicalAccent;
