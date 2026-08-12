import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { COLORS, GRID_SIZE } from './Theme';

// Wraps any screen's content with the shared gradient + grid background.
// Usage: <ScreenBackground><YourScreenContent /></ScreenBackground>
export default function ScreenBackground({ children, style }) {
  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <MeanderTexture opacity={0.3} />
      {children}
    </LinearGradient>
  );
}

function MeanderTexture({ opacity = 0.03 }) {
  return (
    <Svg
      style={[
        StyleSheet.absoluteFillObject,
        { opacity },
      ]}
    >
      <Defs>
        <Pattern
          id="tex"
          patternUnits="userSpaceOnUse"
          width={48}
          height={12}
        >
        <Path
          d="M0 12V6H5V0H10V6H15V12H20V6H25V0H30V6H35V12H40V6H45V0H48"
          fill="none"
          stroke="#1C1D22"
          strokeWidth={.5}
        />
        </Pattern>
      </Defs>

      <Rect
        width="100%"
        height="100%"
        fill="url(#tex)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});