/**
 * ExpeditionLootModal — full-screen celebration overlay when companion returns with loot.
 *
 * Mount once inside the Navigation wrapper (alongside XPToast, GoldToast, LevelUpModal).
 * Reads pendingExpeditionLoot from GamificationContext and auto-clears on dismiss.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGamification } from "../contexts/GamificationContext";
import { Colors, BorderRadius } from "../styles/theme";
import { haptics } from "../utils/haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PARTICLE_COUNT = 16;
const PARTICLE_COLORS = ["#FFD700", "#FFA500", "#F59E0B", "#FBBF24", "#D97706", "#10B981"];

export default function ExpeditionLootModal() {
  const { pendingExpeditionLoot, clearExpeditionLoot } = useGamification();

  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const chestScale = useRef(new Animated.Value(0.3)).current;
  const lootOpacity = useRef(new Animated.Value(0)).current;

  // Coin burst particles
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!pendingExpeditionLoot) return;

    haptics.heavy?.();

    // Reset
    cardScale.setValue(0.5);
    cardOpacity.setValue(0);
    chestScale.setValue(0.3);
    lootOpacity.setValue(0);

    // Card entrance
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Chest bounce (delayed)
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(chestScale, { toValue: 1, useNativeDriver: true, bounciness: 16, speed: 8 }),
    ]).start();

    // Loot text fade in (after chest)
    Animated.sequence([
      Animated.delay(450),
      Animated.timing(lootOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Coin burst
    const burstAnimations = particles.map((p, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const radius = 50 + Math.random() * 70;
      const targetX = Math.cos(angle) * radius;
      const targetY = Math.sin(angle) * radius;

      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);

      return Animated.sequence([
        Animated.delay(300 + i * 20),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: targetX, duration: 500, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: targetY, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]);
    });

    Animated.stagger(12, burstAnimations).start();
  }, [pendingExpeditionLoot]);

  if (!pendingExpeditionLoot) return null;

  const { gold } = pendingExpeditionLoot;

  return (
    <Modal transparent animationType="fade" visible={!!pendingExpeditionLoot}>
      <View style={styles.backdrop}>
        {/* Coin burst particles */}
        <View style={styles.particleOrigin} pointerEvents="none">
          {particles.map((p, i) => {
            const size = 5 + Math.floor(Math.random() * 4);
            const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
            return (
              <Animated.View
                key={i}
                style={{
                  position: "absolute",
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { scale: p.scale },
                  ],
                }}
              />
            );
          })}
        </View>

        {/* Loot card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          {/* Treasure chest icon */}
          <View style={styles.chestCircle}>
            <Animated.View style={{ transform: [{ scale: chestScale }] }}>
              <MaterialCommunityIcons name="treasure-chest" size={48} color="#F59E0B" />
            </Animated.View>
          </View>

          <Text style={styles.label}>EXPEDITION COMPLETE</Text>
          <Text style={styles.title}>Your companion returned!</Text>

          {/* Loot breakdown */}
          <Animated.View style={[styles.lootSection, { opacity: lootOpacity }]}>
            <View style={styles.lootRow}>
              <MaterialCommunityIcons name="circle-multiple" size={22} color="#F59E0B" />
              <Text style={styles.lootAmount}>+{gold}</Text>
              <Text style={styles.lootLabel}>Gold</Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.button}
            onPress={clearExpeditionLoot}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Collect!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  particleOrigin: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.35,
    left: SCREEN_WIDTH / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius?.xl || 20,
    padding: 32,
    width: SCREEN_WIDTH * 0.82,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  chestCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary || "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  lootSection: {
    marginTop: 12,
    marginBottom: 20,
    gap: 10,
  },
  lootRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lootAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary || "#1F2937",
  },
  lootLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary || "#6B7280",
  },
  button: {
    backgroundColor: "#F59E0B",
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 13,
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
