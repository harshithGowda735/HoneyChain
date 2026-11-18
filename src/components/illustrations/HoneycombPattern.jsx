import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

/**
 * HoneycombPattern - Subtle Geometric Honeycomb Mesh
 * For headers, card accents, and hero backgrounds.
 */
export function HoneycombPattern({
  width = 120,
  height = 80,
  color = '#EFE3C9',
  fillColor = '#FFF5D9',
  strokeWidth = 1.2,
  opacity = 0.65,
  style,
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 120 80"
      fill="none"
      style={style}
    >
      <G stroke={color} strokeWidth={strokeWidth} opacity={opacity}>
        {/* Row 1 */}
        <Path
          d="M 10 15 L 20 10 L 30 15 L 30 25 L 20 30 L 10 25 Z"
          fill={fillColor}
        />
        <Path
          d="M 30 15 L 40 10 L 50 15 L 50 25 L 40 30 L 30 25 Z"
          fill="none"
        />
        <Path
          d="M 50 15 L 60 10 L 70 15 L 70 25 L 60 30 L 50 25 Z"
          fill={fillColor}
        />
        <Path
          d="M 70 15 L 80 10 L 90 15 L 90 25 L 80 30 L 70 25 Z"
          fill="none"
        />
        <Path
          d="M 90 15 L 100 10 L 110 15 L 110 25 L 100 30 L 90 25 Z"
          fill={fillColor}
        />

        {/* Row 2 (Interlocking) */}
        <Path
          d="M 20 30 L 30 25 L 40 30 L 40 40 L 30 45 L 20 40 Z"
          fill="none"
        />
        <Path
          d="M 40 30 L 50 25 L 60 30 L 60 40 L 50 45 L 40 40 Z"
          fill={fillColor}
        />
        <Path
          d="M 60 30 L 70 25 L 80 30 L 80 40 L 70 45 L 60 40 Z"
          fill="none"
        />
        <Path
          d="M 80 30 L 90 25 L 100 30 L 100 40 L 90 45 L 80 40 Z"
          fill={fillColor}
        />

        {/* Row 3 */}
        <Path
          d="M 10 45 L 20 40 L 30 45 L 30 55 L 20 60 L 10 55 Z"
          fill="none"
        />
        <Path
          d="M 30 45 L 40 40 L 50 45 L 50 55 L 40 60 L 30 55 Z"
          fill={fillColor}
        />
        <Path
          d="M 50 45 L 60 40 L 70 45 L 70 55 L 60 60 L 50 55 Z"
          fill="none"
        />
        <Path
          d="M 70 45 L 80 40 L 90 45 L 90 55 L 80 60 L 70 55 Z"
          fill={fillColor}
        />
        <Path
          d="M 90 45 L 100 40 L 110 45 L 110 55 L 100 60 L 90 55 Z"
          fill="none"
        />
      </G>
    </Svg>
  );
}

export default HoneycombPattern;
