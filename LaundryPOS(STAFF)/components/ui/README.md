# UI Components Library

This directory contains enhanced UI components for the Staff App with modern animations, interactions, and improved UX.

## Components

### Animations (`animations.tsx`)
Reusable animation hooks:
- `usePressAnimation` - Button press animations
- `usePulseAnimation` - Pulsing effects
- `useFadeIn` - Fade in animations
- `useSlideIn` - Slide in animations
- `useShimmer` - Shimmer loading effects
- `useSuccessAnimation` - Success checkmark animations
- `useBounce` - Bounce animations

### ShimmerLoader (`ShimmerLoader.tsx`)
Enhanced loading skeletons:
- `ShimmerLoader` - Basic shimmer loader
- `ShimmerCard` - Card skeleton
- `ShimmerTableRow` - Table row skeleton
- `ShimmerStatsCard` - Stats card skeleton

### FloatingActionButton (`FloatingActionButton.tsx`)
FAB component with expandable actions:
```tsx
<FloatingActionButton
  mainIcon="add"
  mainAction={() => createOrder()}
  actions={[
    { icon: 'add', label: 'New Order', onPress: () => {}, color: '#2563EB' },
    { icon: 'person-add', label: 'Add Customer', onPress: () => {}, color: '#10B981' }
  ]}
/>
```

### EnhancedEmptyState (`EnhancedEmptyState.tsx`)
Improved empty states with illustrations and tips:
```tsx
<EnhancedEmptyOrders onCreateOrder={() => {}} />
<EnhancedEmptyCustomers onAddCustomer={() => {}} />
<EnhancedEmptyExpenses onSubmitRequest={() => {}} />
```

### SwipeableRow (`SwipeableRow.tsx`)
Swipe actions for table rows:
```tsx
<SwipeableRow
  leftActions={[
    { icon: 'checkmark', label: 'Paid', color: '#10B981', onPress: () => {} }
  ]}
  rightActions={[
    { icon: 'create', label: 'Edit', color: '#2563EB', onPress: () => {} }
  ]}
>
  {/* Row content */}
</SwipeableRow>
```

### TodaySummary (`TodaySummary.tsx`)
Today's summary dashboard:
```tsx
<TodaySummary
  stats={[
    { label: 'Total Orders', value: 25, icon: 'receipt', color: '#2563EB', trend: { value: 12, isPositive: true } }
  ]}
/>
```

### CommandPalette (`CommandPalette.tsx`)
Keyboard shortcut command palette (Cmd/Ctrl+K):
```tsx
<CommandPalette
  isVisible={showPalette}
  onClose={() => setShowPalette(false)}
  commands={[
    { id: '1', label: 'New Order', icon: 'add', category: 'Orders', keywords: ['order', 'new'], onPress: () => {} }
  ]}
/>
```

### EnhancedToast (`EnhancedToast.tsx`)
Toast notifications with undo:
```tsx
<EnhancedToast
  toast={currentToast}
  onDismiss={(id) => removeToast(id)}
/>
```

### ProgressIndicator (`ProgressIndicator.tsx`)
Progress bars and mini charts:
```tsx
<ProgressIndicator current={15} total={25} label="Orders Completed" />
<MiniChart data={[10, 20, 15, 25, 30]} />
```

## Integration Examples

See the updated screens for integration examples:
- `app/home/orderList.tsx` - Order management with FAB, TodaySummary, CommandPalette
- `app/home/customer.tsx` - Customer management with enhanced empty states
- `app/home/orderListComponents/orderTable.tsx` - Table with swipe actions

