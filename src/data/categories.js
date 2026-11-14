import { C } from "../theme/colors";

export const RESOURCE_CATEGORIES = [
  { key: "Generator", icon: "flash", color: C.brownMid, tint: C.glow },
  { key: "Water", icon: "water", color: C.slate, tint: C.waterBg },
  { key: "Food", icon: "fast-food", color: C.sage, tint: "#EEF1E8" },
  { key: "Medical", icon: "medkit", color: "#8C3B3B", tint: "#F6DCDC" },
  { key: "Shelter", icon: "home", color: C.brownDark, tint: C.sand },
  { key: "Transport", icon: "car", color: "#5B5470", tint: "#E7E4F0" },
];

// Picks the icon and colours for a resource from the words in its text
export function categoryFor(text = "") {
  const lower = text.toLowerCase();
  return (
    RESOURCE_CATEGORIES.find((c) => lower.includes(c.key.toLowerCase())) || {
      key: "Other",
      icon: "cube",
      color: C.brown,
      tint: C.sand,
    }
  );
}
