/**
 * ShopScreen — Browse and purchase companion cosmetic items with gold.
 *
 * Layout:
 * 1. GoldDisplay header (current balance)
 * 2. AnimatedSegmentedControl category tabs (Hats | Capes | Weapons | Effects)
 * 3. Item list for selected category
 * 4. BlurModal purchase confirmation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGamification } from '../../contexts/GamificationContext';
import { SHOP_ITEMS } from '../../services/gamification/ExpeditionService';
import { BlurModal } from '../../components/BlurModal';
import GoldDisplay from '../../components/GoldDisplay';
import AnimatedSegmentedControl from '../../components/AnimatedSegmentedControl';
import { Colors, BorderRadius, Spacing } from '../../styles/theme';
import { getBottomContentPadding } from '../../constants/navigation';
import { haptics } from '../../utils/haptics';
import type { ShopCategory, ShopItemDefinition } from '../../services/gamification/ExpeditionTypes';

const CATEGORY_OPTIONS = [
  { label: 'Hats', value: 'hats' },
  { label: 'Capes', value: 'capes' },
  { label: 'Weapons', value: 'weapons' },
  { label: 'Effects', value: 'effects' },
  { label: 'Items', value: 'consumables' },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const {
    gold,
    level,
    ownedShopItems,
    purchaseShopItem,
    streakFreezes,
    purchaseStreakFreeze,
  } = useGamification() as any;

  const [category, setCategory] = useState<ShopCategory>('hats');
  const [confirmItem, setConfirmItem] = useState<ShopItemDefinition | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const filteredItems = useMemo(
    () => SHOP_ITEMS.filter((item) => item.category === category),
    [category],
  );

  const owned: string[] = ownedShopItems || [];

  const handleBuy = useCallback(async () => {
    if (!confirmItem) return;
    setPurchasing(true);
    try {
      if (confirmItem.category === 'consumables' && confirmItem.id === 'streak_shield') {
        const result = await purchaseStreakFreeze();
        if (result?.success) {
          haptics.success?.() || haptics.selection();
          setConfirmItem(null);
        } else if (result?.error === 'max_reached') {
          Alert.alert('Max Reached', 'You can hold at most 2 Streak Shields.');
          setConfirmItem(null);
        } else if (result?.error === 'insufficient_gold') {
          Alert.alert('Not Enough Gold', 'You need more gold to purchase this item.');
        }
      } else {
        const result = await purchaseShopItem(confirmItem.id);
        if (result?.success) {
          haptics.success?.() || haptics.selection();
          setConfirmItem(null);
        } else if (result?.error === 'insufficient_gold') {
          Alert.alert('Not Enough Gold', 'You need more gold to purchase this item.');
        } else if (result?.error === 'already_owned') {
          Alert.alert('Already Owned', 'You already own this item.');
          setConfirmItem(null);
        } else if (result?.error === 'level_too_low') {
          Alert.alert('Level Too Low', `You need Level ${confirmItem.levelRequired} to buy this.`);
        }
      }
    } finally {
      setPurchasing(false);
    }
  }, [confirmItem, purchaseShopItem, purchaseStreakFreeze]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getBottomContentPadding(insets.bottom) },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Shop</Text>
        <GoldDisplay gold={gold || 0} />
      </View>
      <Text style={styles.subtitle}>Equip your companion with gear and effects</Text>

      {/* Category tabs */}
      <AnimatedSegmentedControl
        options={CATEGORY_OPTIONS}
        selected={category}
        onSelect={(val: string) => setCategory(val as ShopCategory)}
        style={styles.tabs}
      />

      {/* Item list */}
      {filteredItems.map((item) => {
        const isConsumable = item.category === 'consumables';
        const isOwned = !isConsumable && owned.includes(item.id);
        const locked = (level || 1) < item.levelRequired;
        const isMaxed = isConsumable && item.id === 'streak_shield' && (streakFreezes || 0) >= 2;
        const canBuy = !isOwned && !locked && !isMaxed && (gold || 0) >= item.price;

        return (
          <View
            key={item.id}
            style={[styles.itemCard, (locked || isOwned || isMaxed) && styles.itemCardDimmed]}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconCircle, isOwned && styles.iconCircleOwned]}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={isOwned ? '#10B981' : locked ? (Colors.textSecondary || '#9CA3AF') : (Colors.primary || '#4200FF')}
                />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, locked && styles.textLocked]}>
                  {item.name}
                  {isConsumable && item.id === 'streak_shield' ? ` (${streakFreezes || 0}/2)` : ''}
                </Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <View style={styles.priceRow}>
                  <MaterialCommunityIcons name="circle-multiple" size={12} color="#F59E0B" />
                  <Text style={styles.priceText}>{item.price}</Text>
                  {item.levelRequired > 1 && (
                    <>
                      <MaterialCommunityIcons name="shield-star" size={12} color={Colors.textSecondary || '#6B7280'} />
                      <Text style={styles.priceText}>Lv{item.levelRequired}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {isOwned ? (
              <View style={styles.ownedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={styles.ownedText}>Owned</Text>
              </View>
            ) : isMaxed ? (
              <View style={styles.ownedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={styles.ownedText}>Max</Text>
              </View>
            ) : locked ? (
              <View style={styles.lockBadge}>
                <MaterialCommunityIcons name="lock" size={14} color="#fff" />
                <Text style={styles.lockText}>Lv{item.levelRequired}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.buyButton, !canBuy && styles.buyButtonDisabled]}
                onPress={() => setConfirmItem(item)}
                disabled={!canBuy}
                activeOpacity={0.7}
              >
                <Text style={[styles.buyButtonText, !canBuy && styles.buyButtonTextDisabled]}>Buy</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Purchase confirmation modal */}
      <BlurModal visible={!!confirmItem} onClose={() => setConfirmItem(null)}>
        {confirmItem && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <MaterialCommunityIcons
                name={confirmItem.icon as any}
                size={36}
                color={Colors.primary || '#4200FF'}
              />
            </View>
            <Text style={styles.confirmName}>{confirmItem.name}</Text>
            <Text style={styles.confirmDesc}>{confirmItem.description}</Text>
            <View style={styles.confirmPriceRow}>
              <MaterialCommunityIcons name="circle-multiple" size={18} color="#F59E0B" />
              <Text style={styles.confirmPrice}>{confirmItem.price} Gold</Text>
            </View>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmItem(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBuyButton}
                onPress={handleBuy}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBuyText}>
                  {purchasing ? 'Buying...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BlurModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background || '#F9FAFB' },
  content: { paddingHorizontal: Spacing.md || 16, paddingTop: Spacing.lg || 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  header: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary || '#1F2937' },
  subtitle: { fontSize: 13, color: Colors.textSecondary || '#6B7280', marginBottom: 16 },
  tabs: { marginBottom: 16 },

  // Item cards
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BorderRadius.md || 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardDimmed: { opacity: 0.55 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(66, 0, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOwned: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary || '#1F2937' },
  itemDesc: { fontSize: 12, color: Colors.textSecondary || '#6B7280', marginTop: 2 },
  textLocked: { color: Colors.textSecondary || '#6B7280' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  priceText: { fontSize: 11, color: Colors.textSecondary || '#6B7280', marginRight: 6 },

  buyButton: {
    backgroundColor: Colors.primary || '#4200FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buyButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  buyButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  buyButtonTextDisabled: { color: Colors.textSecondary || '#9CA3AF' },

  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ownedText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  lockText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Confirm modal
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg || 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(66, 0, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary || '#1F2937', marginBottom: 4 },
  confirmDesc: { fontSize: 13, color: Colors.textSecondary || '#6B7280', textAlign: 'center', marginBottom: 12 },
  confirmPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  confirmPrice: { fontSize: 18, fontWeight: '700', color: '#D97706' },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary || '#6B7280' },
  confirmBuyButton: {
    backgroundColor: Colors.primary || '#4200FF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  confirmBuyText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
