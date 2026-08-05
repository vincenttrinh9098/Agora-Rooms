import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';



export function SvgDiamond({
  size = 40,
  color = "#e74c3c",
}) {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points="50,0 100,50 50,100 0,50"
          fill={color}
        />
      </Svg>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});