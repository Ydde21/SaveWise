import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface MiniChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  fillColor?: string;
}

export function MiniChart({
  data,
  width,
  height,
  color,
  fillColor,
}: MiniChartProps) {
  if (data.length < 2) return <View style={{ width, height }} />;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((val - minVal) / range) * chartHeight,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prevPt = points[i - 1];
    const currPt = points[i];
    const cpx1 = prevPt.x + (currPt.x - prevPt.x) * 0.4;
    const cpx2 = prevPt.x + (currPt.x - prevPt.x) * 0.6;
    linePath += ` C ${cpx1} ${prevPt.y} ${cpx2} ${currPt.y} ${currPt.x} ${currPt.y}`;
  }

  const fillPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillColor || color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={fillColor || color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#chartGrad)" />
        <Path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
