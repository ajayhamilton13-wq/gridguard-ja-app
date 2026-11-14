import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { C } from "../theme/colors";

// Drawn Jamaican dusk: rooftops with water tanks and a light pole.
// lights="mixed" shows some windows lit (power on) and some dark (power out).
export default function Scene({ height = 250, lights = "mixed", style }) {
  const lit = lights !== "off";
  return (
    <Svg width="100%" height={height} viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice" style={style}>
      <Rect width="390" height="300" fill={C.brownDark} />
      <Rect y="90" width="390" height="210" fill="#7E5236" />
      <Rect y="160" width="390" height="140" fill="#B97B4E" />
      <Circle cx="295" cy="180" r="32" fill={C.glow} />
      <Path d="M0 218 Q90 182 180 214 T390 205 V300 H0Z" fill={C.brown} />
      <Path d="M150 300V160M138 172h24M44 186 Q150 202 252 180M252 180V300" stroke={C.night} strokeWidth="3" fill="none" />
      <G fill={C.night}>
        <Rect x="10" y="232" width="84" height="68" />
        <Rect x="108" y="244" width="60" height="56" />
        <Rect x="206" y="226" width="84" height="74" />
        <Rect x="300" y="240" width="90" height="60" />
        <Rect x="28" y="214" width="20" height="18" rx="3" />
        <Rect x="226" y="208" width="20" height="18" rx="3" />
        <Rect x="322" y="224" width="18" height="16" rx="3" />
      </G>
      <G fill={lit ? C.glow : C.brownDark}>
        <Rect x="24" y="248" width="16" height="16" rx="2" />
        <Rect x="58" y="248" width="16" height="16" rx="2" />
        <Rect x="24" y="274" width="16" height="16" rx="2" />
      </G>
      <G fill={lights === "on" ? C.glow : C.brownDark}>
        <Rect x="222" y="244" width="16" height="16" rx="2" />
        <Rect x="256" y="244" width="16" height="16" rx="2" />
        <Rect x="124" y="260" width="14" height="14" rx="2" />
      </G>
    </Svg>
  );
}
