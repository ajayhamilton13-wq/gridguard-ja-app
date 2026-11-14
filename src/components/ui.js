import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { T } from "../theme/type";

// Frosted pill that floats over the scene
export function Frosted({ style, children, dark = false }) {
  return (
    <BlurView
      intensity={30}
      tint={dark ? "dark" : "light"}
      style={[
        { overflow: "hidden", backgroundColor: dark ? "rgba(62,42,27,0.72)" : "rgba(251,248,243,0.82)" },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

const VARIANTS = {
  brown: { bg: C.brownMid, fg: C.cream, border: "transparent" },
  dark: { bg: C.brown, fg: C.cream, border: "transparent" },
  cream: { bg: C.cream, fg: C.ink, border: "transparent" },
  outline: { bg: "transparent", fg: C.ink, border: C.line },
  outlineLight: { bg: "transparent", fg: C.cream, border: C.tan },
  danger: { bg: "transparent", fg: C.danger, border: C.line },
};

export function Button({ label, onPress, variant = "brown", icon, iconRight, loading, disabled, height = 52, style }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height,
          borderRadius: height / 2,
          backgroundColor: v.bg,
          borderWidth: 1,
          borderColor: v.border,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <T w="b" size={15} color={v.fg}>
            {label}
          </T>
          {iconRight && <Ionicons name={iconRight} size={18} color={v.fg} />}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, frosted = true, size = 44, color = C.ink, style }) {
  const inner = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
  if (!frosted) return <View style={[{ borderRadius: size / 2, backgroundColor: C.card }, style]}>{inner}</View>;
  return <Frosted style={[{ borderRadius: size / 2 }, style]}>{inner}</Frosted>;
}

// Bottom sheet used for details, forms and pickers
export function Sheet({ visible, onClose, title, children, scroll = true }) {
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {!!title && (
            <View style={styles.sheetHeader}>
              <T w="b" size={20} style={{ flex: 1 }}>
                {title}
              </T>
              <IconButton icon="close" label="Close" onPress={onClose} frosted={false} style={{ backgroundColor: C.sand }} />
            </View>
          )}
          <Body
            {...(scroll ? { contentContainerStyle: { paddingBottom: 28 }, keyboardShouldPersistTaps: "handled" } : {})}
            style={!scroll ? { paddingBottom: 28 } : undefined}
          >
            {children}
          </Body>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Chip({ label, selected, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: selected ? C.brownMid : C.card,
        borderWidth: 1,
        borderColor: selected ? C.brownMid : C.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? C.cream : C.brown} />}
      <T w={selected ? "b" : "s"} size={13} color={selected ? C.cream : C.ink}>
        {label}
      </T>
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
      <T w="b" size={16}>
        {title}
      </T>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <T w="s" size={13} color={C.brown}>
            {action}
          </T>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(46,32,22,0.45)" },
  sheet: {
    maxHeight: "90%",
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.tan, alignSelf: "center", marginBottom: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
});
