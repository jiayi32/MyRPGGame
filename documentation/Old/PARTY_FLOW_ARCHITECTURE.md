# Party Flow Architecture

## Overview

The Party Expense Flow is a role-based system that provides two distinct experiences:

1. **Owner Path**: Full control over all members' expense assignments and party closure
2. **Guest Path**: Simple item selection for self, status marking with "Ready Up"

This document details the architecture, data flow, and navigation patterns.

---

## Core Concepts

### Member Identity (Firebase UID)

Members are identified using their Firebase Authentication UID (`user.uid`). In PartyContext, `userIdRef.current` is set to `user.uid` from AuthContext:

```javascript
// PartyContext.js
userIdRef.current = user.uid; // Firebase UID from AuthContext
```

This ensures:

- ✅ Globally unique identity tied to Firebase Auth
- ✅ Stable keys for downstream component reconciliation
- ✅ Consistent identification across sessions

### Role Determination

User role is determined by comparing `userId` with `ownerId`:

```javascript
const isOwner = userId === ownerId;
const isGuest = userId !== ownerId;
```

This comparison is used at every decision point in the flow to:

- Route to different screens
- Show different UI elements
- Apply different validation rules
- Enable/disable different actions

---

## Group Session vs External Guest Session (Feb 2026 Update)

Party sessions launched from a Group now behave differently from standalone sessions:

### Group Sessions (`activeParty.groupId` is set)
- **Entry**: GroupDetailScreen FAB → `ExpenseFlow` wizard (party sessions are opt-in via "Start a Live Session →" on the What step)
- **QR code / party code**: Hidden by default in `PartySessionScreen`. Shown under a collapsible "Invite someone outside the group" accordion — only needed for guests outside the group.
- **Auto-join**: Group members join via `handleJoinGroupParty()` (by group membership — no code entry required). The GroupDetailScreen active-party banner triggers this automatically.
- **Notification**: When a session starts, `EXPENSE_SESSION_STARTED` push notifications are sent to all non-owner group members via `notificationService`.
- **Primary UI**: Member status list (who has joined, who is ready) is shown first.

### Non-Group Sessions (`activeParty.groupId` is null)
- **QR code / party code**: Shown prominently as primary UI (unchanged — strangers need the code).
- All other behaviour unchanged.

---

## Navigation Architecture

### Party Session Entry Point

**PartySessionScreen** is the central hub that routes based on role.

When "Split Items Collaboratively" is clicked:

```
userId === ownerId?
├─ YES (Owner)
│  └─ Navigate("ExpenseFlow", { screen: "FoodItemList", params: { ...allMembers..., startStep: 0 } })
└─ NO (Guest)
  └─ Navigate("ExpenseFlow", { screen: "Choose", params: { ...onlyCurrentUser..., startStep: 2 } })
```

### Owner Path (Full Flow)

```
PartySessionScreen
  ↓
ExpenseFlowWizard (owner path)
  Items → People → Assign → Review
  ↓
"Return/Close" back to PartySessionScreen (owner closes party after wizard finalize)
```

### Guest Path (Direct Selection)

```
PartySessionScreen
  ↓
ExpenseFlowWizard (guest path)
  Assign → Review (People/Items skipped; user management disabled)
  ↓
"Ready Up" in finalize → toggleReady(true)
  ↓
PartySessionScreen (status: Ready ✅)
```

---

## Parameter Propagation

Parameters are passed through the navigation stack to preserve context:

### Key Parameters

| Parameter    | Type    | Source                                                   | Purpose                                           |
| ------------ | ------- | -------------------------------------------------------- | ------------------------------------------------- |
| `userId`     | string  | PartyContext.userIdRef (= user.uid)                      | Current user's Firebase UID                       |
| `ownerId`    | string  | PartySessionScreen                                       | Party owner's Firebase UID                        |
| `fromParty`  | boolean | PartySessionScreen                                       | Flag indicating party flow (vs. regular expense)  |
| `partyCode`  | string  | PartySessionScreen                                       | 6-char party code for back navigation             |
| `items`      | Array   | PartySessionScreen                                       | All receipt items                                 |
| `users`      | Array   | PartySessionScreen (all)                                 | User list (guest path filters to self in wizard)  |
| `startStep`  | number  | PartySessionScreen (0 owner, 2 guest)                    | Deep link into wizard step (Items=0, People=1, Assign=2, Review=3) |

### Flow Path (Owner - Wizard)

```
PartySessionScreen
  ↓ {items, users, userId, ownerId, fromParty, partyCode, startStep: 0}
ExpenseFlowWizard
  Items → People → Assign → Review
  (Finalize: addTransaction + closePartySession)
```

### Flow Path (Guest - Wizard)

```
PartySessionScreen
  ↓ {items, users: [guest], userId, ownerId, fromParty, partyCode, startStep: 2}
ExpenseFlowWizard
  Assign → Review (user management disabled; only self)
  (Finalize: toggleReady(true))
```

---

## Screen Behavior By Role

### FriendsListScreen

> **Note:** `020_FriendsListScreen/` has been deleted. This functionality is now handled by Step 1 (People) of ExpenseFlowWizard. The legacy `Friends` route maps to `ExpenseFlowWizard` with `startStep: 1` via ExpenseFlowNavigator.

### Wizard Behavior By Role

- **Owner**: Full 4 steps; can add/edit users and items; assigns any items to anyone; finalize creates pending transaction and closes party.
- **Guest**: Starts at Assign; People/Items read-only/hidden; only self available; finalize marks ready via `toggleReady(true)`.

```javascript
if (fromParty) {
  if (userId === ownerId) {
    // Owner: Return to Party Session
    <TouchableOpacity onPress={() => navigate("PartySession")}>
      <Text>Return to Party Session</Text>
    </TouchableOpacity>;
  } else {
    // Guest: Ready Up
    <TouchableOpacity
      onPress={async () => {
        await toggleReady(true);
        navigate("PartySession");
      }}
    >
      <Text>Ready Up</Text>
    </TouchableOpacity>;
  }
}
```

---

## Validation Rules

### ExpenseFlowWizard Validation (Review Step)

> **Note:** This validation was originally in `040_FoodFinalScreen` (now deleted). It is now part of ExpenseFlowWizard's Review step.

#### Guest Validation (Party Flow, Non-Owner)

```javascript
if (fromParty && userId !== ownerId) {
  const currentUser = users.find((u) => u.key === userId);
  // Guest must select at least 1 item for themselves
  return items.some((item) => item.party.includes(currentUser.name));
}
```

**Errors**:

- "You must select at least one item"

#### Owner/Regular Flow Validation

```javascript
// All users must have items
const allUsersHaveItems = users.every((user) =>
  items.some((item) => item.party.includes(user.name))
);

// All items must be selected
const allItemsSelected = items.every((item) => item.party.length > 0);

return allUsersHaveItems && allItemsSelected;
```

**Errors**:

- "All users must select at least one item"
- "All items must be selected by at least one user"

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PartySessionScreen                                              │
│  • Shows all members with ready status badges                   │
│  • Owner can scan receipts and add items                        │
│  • "Split Items Collaboratively" button routes by role          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
        ┌───────▼────────┐   ┌────▼──────────┐
        │ OWNER PATH     │   │ GUEST PATH    │
        │                │   │               │
        │ ExpenseFlow    │   │ ExpenseFlow   │
        │ Wizard         │   │ Wizard        │
        │ (startStep: 0) │   │ (startStep: 2)│
        │                │   │               │
        │ Step 0: Items  │   │ Step 2: Assign│
        │ Step 1: People │   │ (self only)   │
        │ Step 2: Assign │   │               │
        │ Step 3: Review │   │ Step 3: Review│
        └───────┬────────┘   └────┬──────────┘
                │                 │
                └─────────┬───────┘
                          │
                ┌─────────┴─────────┐
                │                   │
        ┌───────▼──────┐    ┌───────▼─────┐
        │ Return to    │    │ Ready Up →  │
        │ PartySession │    │ toggleReady │
        │              │    │ Return to   │
        │              │    │ PartySession│
        └──────────────┘    └─────────────┘
```

---

## Context Integration

### PartyContext

The `PartyContext` provides:

**State**:

- `activeParty`: Current party object with members, receipts, items
- `userId`: Derived value from `userIdRef.current` — current user's Firebase UID (exposed in context value for convenience)
- `userIdRef`: `useRef` holding the Firebase UID — used directly in async callbacks to avoid stale closure issues

**Methods**:

- `createPartySession({ ownerName, partyName, baseCurrency, groupId, initialMembers })`: Owner creates party
- `joinPartySession({ code, memberName })`: Guest joins party
- `toggleReady(isReady)`: Member updates their ready status
- `closePartySession()`: Owner closes party
- `switchActiveParty(code)`: Switch between multiple joined parties

**Key Feature**: `toggleReady()` uses `userIdRef.current` (stable ID) to update the correct member:

```javascript
const toggleReady = async (isReady) => {
  if (!activeParty?.id) return;
  // userIdRef.current is the Firebase UID
  await setMemberReady(activeParty.id, userIdRef.current, isReady);
};
```

This ensures that when a guest clicks "Ready Up", their status updates correctly.

---

## Firebase Data Structure

### Party Document

```javascript
{
  id: "auto-generated",
  code: "ABC123",                    // 6-char unique code
  name: "Team Lunch",
  ownerId: "firebase-uid-abc123",       // Firebase UID of owner
  status: "pending" | "completed",
  createdAt: timestamp,
  updatedAt: timestamp,

  members: {
    alice: {
      displayName: "Alice",
      ready: true,
      joinedAt: timestamp
    },
    bob_smith: {
      displayName: "Bob Smith",
      ready: false,
      joinedAt: timestamp
    },
    carol: {
      displayName: "Carol",
      ready: true,
      joinedAt: timestamp
    }
  },

  receipts: {
    mcdonalds: {
      name: "McDonald's",
      items: {
        burger: { name: "Big Mac", price: 12.50 },
        fries: { name: "Large Fries", price: 5.00 }
      }
    }
  }
}
```

---

## Error Handling

### Common Issues & Solutions

#### Issue: Guest sees all members instead of just themselves

- **Cause**: Incorrect filtering in FriendsListScreen
- **Check**: Verify `fromParty && userId !== ownerId` condition
- **Fix**: Ensure `FriendsListScreen` uses filtering logic

#### Issue: "Ready Up" button doesn't update status

- **Cause**: `toggleReady()` not called or using wrong user ID
- **Check**: Verify `userIdRef.current` is set correctly in PartyContext
- **Fix**: Ensure `createPartySession` and `joinPartySession` both set `userIdRef.current = user.uid`

#### Issue: Infinite loop / Maximum update depth exceeded

- **Cause**: Circular useEffect dependencies causing setState loops
- **Fix**: Remove conflicting useEffects, consolidate into single initialization

#### Issue: Guest navigates to FoodItemList instead of Choose

- **Cause**: Missing role check in PartySessionScreen
- **Check**: Verify `userId !== ownerId` comparison
- **Fix**: Add role-based navigation routing in "Split Items Collaboratively" handler

---

## Testing Checklist

- [ ] Owner creates party and sees all members
- [ ] Guest joins party via code with unique name
- [ ] Guest selects items (sees only themselves)
- [ ] Owner selects items for all members
- [ ] Guest clicks "Ready Up" and status changes to green dot
- [ ] Owner sees all members' ready status in PartySessionScreen
- [ ] Owner can close party only when all members are ready
- [ ] Transactions created with "pending" status
- [ ] Multiple parties can be joined simultaneously
- [ ] No infinite loops or maximum update depth errors
- [ ] Navigation flows work correctly (back buttons, screen transitions)

---

*Phase release notes (Phase 1.6, Jan 17, 2026; Phase 1.6.4, Jan 18, 2026) are archived in [`documentation/redundant/records/PARTY_FLOW_PHASE_UPDATES.md`](../redundant/records/PARTY_FLOW_PHASE_UPDATES.md).*
