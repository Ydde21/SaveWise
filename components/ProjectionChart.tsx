import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
} from "react-native-svg";
import Colors from "@/constants/colors";
import { formatCurrency } from "@/lib/interest";

interface ProjectionChartProps {
  data: { month: number; balance: number }[];
  width: number;
  height: number;
  currencySymbol: string;
}

export function ProjectionChart({
  data,
  width,
  height,
  currencySymbol,
}: ProjectionChartProps) {
  if (data.length < 2)
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.emptyText}>Add data to see projections</Text>
      </View>
    );

  const padding = { top: 20, right: 16, bottom: 32, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minVal = Math.min(...data.map((d) => d.balance));
  const maxVal = Math.max(...data.map((d) => d.balance));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y:
      padding.top +
      chartHeight -
      ((d.balance - minVal) / range) * chartHeight,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prevPt = points[i - 1];
    const currPt = points[i];
    const cpx1 = prevPt.x + (currPt.x - prevPt.x) * 0.4;
    const cpx2 = prevPt.x + (currPt.x - prevPt.x) * 0.6;
    linePath += ` C ${cpx1} ${prevPt.y} ${cpx2} ${currPt.y} ${currPt.x} ${currPt.y}`;
  }

  const fillPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const yLabels = [minVal, minVal + range * 0.5, maxVal];
  const numXLabels = Math.min(data.length, 5);
  const xStep = Math.floor((data.length - 1) / (numXLabels - 1));

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.2" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {[0, 0.5, 1].map((pct, i) => (
          <Line
            key={i}
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - pct)}
            x2={width - padding.right}
            y2={padding.top + chartHeight * (1 - pct)}
            stroke={Colors.borderLight}
            strokeWidth={1}
          />
        ))}

        {yLabels.map((val, i) => (
          <SvgText
            key={`y-${i}`}
            x={padding.left - 8}
            y={padding.top + chartHeight * (1 - i * 0.5) + 4}
            fill={Colors.textTertiary}
            fontSize={10}
            textAnchor="end"
          >
            {formatCurrency(val, currencySymbol)}
          </SvgText>
        ))}

        {Array.from({ length: numXLabels }).map((_, i) => {
          const idx = i * xStep;
          const month = data[idx]?.month ?? 0;
          return (
            <SvgText
              key={`x-${i}`}
              x={points[idx]?.x ?? 0}
              y={height - 8}
              fill={Colors.textTertiary}
              fontSize={10}
              textAnchor="middle"
            >
              {month === 0 ? "Now" : `${month}mo`}
            </SvgText>
          );
        })}

        <Path d={fillPath} fill="url(#projGrad)" />
        <Path
          d={linePath}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={2.5}
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
  emptyText: {
    textAlign: "center",
    color: Colors.textTertiary,
    marginTop: 40,
    fontSize: 14,
  },
});
