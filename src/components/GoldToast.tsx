/**
 * GoldToast — floating "+N Gold — message" notification overlay.
 *
 * Mount once inside the Navigation wrapper alongside XPToast.
 * Reads pendingGoldToast from GamificationContext and auto-clears after animation.
 */

import React, { useEffect, useRef, useMemo } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGamification } from "../contexts/GamificationContext";

const GOLD_MESSAGES: Record<string, string[]> = {
  expedition_loot: ["Loot secured!", "Adventure pays!", "Treasure found!", "Victory spoils!"],
  daily_quest_bonus: ["Quest master!", "Bonus earned!", "All quests done!"],
  streak_milestone: ["Streak rewards!", "Dedication pays!", "Keep it up!"],
  shop_purchase: ["New gear!", "Well spent!", "Nice choice!"],
};

const GENERIC_GOLD = ["Cha-ching!", "Gold earned!", "Nice haul!"];

function getRandomMessage(reason: string): string {
  const pool = GOLD_MESSAGES[reason] || GENERIC_GOLD;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function GoldToast() {
  const { pendingGoldToast, clearGoldToast } = useGamification();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  const message = useMemo(() => {
    if (!pendingGoldToast) return "";
    return getRandomMessage(pendingGoldToast.reason);
  }, [pendingGoldToast]);

  useEffect(() => {
    if (!pendingGoldToast) return;

    opacity.setValue(0);
    translateY.setValue(24);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      clearGoldToast();
    });
  }, [pendingGoldToast]);

  if (!pendingGoldToast) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <MaterialCommunityIcons name="circle-multiple" size={16} color="#fff" />
      <Text style={styles.text}>
        +{pendingGoldToast.goldDelta} Gold{message ? ` — ${message}` : ""}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 160,
    alignSelf: "center",
    backgroundColor: "rgba(245, 158, 11, 0.92)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  text: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
