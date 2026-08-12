import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect,Polygon } from 'react-native-svg';



export function SvgDiamond({
  size = 40,
  color = "#e74c3c",
  children,
}) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points="50,0 100,50 50,100 0,50" fill={color} />
      </Svg>
 
      {children && (
        <View style={styles.overlay}>
          {children}
        </View>
      )}
    </View>
  );
}


export function MeanderDivider({ width = 340, height = 9, color = '#1C1D22' }) {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern
            id="meander"
            patternUnits="userSpaceOnUse"
            width={36}
            height={9}
          >
            <Path
              d="M0 9V3H4V0H8V3H12V6H16V0H20V3H24V0H28V3H32V6H36V9"
              fill="none"
              stroke={color}
              strokeWidth={1.4}
            />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#meander)" />
      </Svg>
    </View>
  );
}




 
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});