# UI Style Guide

## Interactive Labels

- **Prefer × over text labels** for removal actions in compact spaces (e.g., list rows, inline tag management). Use text labels (`Remove`, `Delete`) only when space is ample or × would be ambiguous.
- Use "Add" for creation, not "Create" or "New".
- Use "Edit" for inline editing, not "Modify" or "Change".
- Use "Save" to confirm edits, "Cancel" to discard.

## Buttons

- Primary actions: filled dark (`background: #111; color: #fff; border: 2px solid #111`)
- Secondary/outline actions: white with dark border (`background: #fff; color: #111; border: 2px solid #111`)
- Destructive actions: red border/text (`color: #dc2626; border: 1px solid #dc2626`)
- All tappable elements: `min-height: 44px` for iOS tap targets; `-webkit-tap-highlight-color: transparent`

## Tags & Chips

- User-defined tags use pill shape (`border-radius: 12px`) with color from the 11-color palette in `frontend/src/constants/tags.js`
- Inactive (unselected) chips: outlined in `#ddd`, text `#999`
- Active (selected) chips: filled with tag color
- System controls styled as pills (e.g., 5-day week): use dark fill (`#1e293b`) when active to distinguish from user tags
- Display-only badges use `border-radius: 3px` (square corners) to differentiate from interactive pills

## Colors

Tag palette is defined in `frontend/src/constants/tags.js` — 11 colors cycling from amber through rose. New tags auto-assign the next color in the cycle.

## Spacing

- Section separation: `margin-bottom: 1.5rem` between major blocks
- Button groups: `gap: 0.6rem` within a flex column container
- Inline action rows: `gap: 0.4rem`

## iOS Considerations

- Font size on inputs/selects/textareas must be `≥ 16px` (enforced globally via `!important` in App.css) to prevent Safari zoom on focus
- All interactive elements should have `-webkit-tap-highlight-color: transparent`
