/**
 * LootDropToast — floating notification when user receives a material drop.
 *
 * Mount once in Navigation wrapper alongside XPToast / GoldToast.
 * Reads pendingLootDrop from GamificationContext and auto-clears after animation.
 */

import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGamification } from "../contexts/GamificationContext";
import { haptics } from "../utils/haptics";

const RARITY_COLORS: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#8B5CF6",
  rare: "#F59E0B",
};

export default function LootDropToast() {
  const { pendingLootDrop, clearLootDrop, materialDefinitions } = useGamification() as any;

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pendingLootDrop) return;

    haptics.selection?.();

    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(2500),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => clearLootDrop());
  }, [pendingLootDrop]);

  if (!pendingLootDrop) return null;

  const matDef = materialDefinitions?.find((m: any) => m.id === pendingLootDrop.materialId);
  const rarity = matDef?.rarity || "common";
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const icon = matDef?.icon || "cube-outline";

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity, borderColor: rarityColor },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconCircle, { backgroundColor: `${rarityColor}15` }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={rarityColor} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>Loot Drop!</Text>
        <Text style={[styles.name, { color: rarityColor }]}>
          {pendingLootDrop.materialName}
        </Text>
      </View>
      <Text style={[styles.rarity, { color: rarityColor }]}>
        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
  },
  rarity: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
