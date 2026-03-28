# Design System Specification: The Executive Lens

## 1. Overview & Creative North Star
**Creative North Star: "The Architectural Editor"**

This design system is engineered for the high-stakes environment of senior leadership. It moves away from the cluttered, "dashboard-heavy" look of traditional project management tools and instead adopts the persona of a premium, data-driven editorial. 

The system prioritizes **Intellectual Flow** over grid density. By leveraging intentional asymmetry and high-contrast typography scales, we guide the executive eye to the most critical data points first. We break the "template" look by treating digital surfaces as physical layers of fine paper and frosted glass, creating a sense of depth that feels authoritative yet breathable.

---

## 2. Colors & Surface Philosophy
Our palette is anchored in deep, sophisticated tones that command respect without causing fatigue.

### The Palette
- **Core Tones:** `primary` (#000000) and `secondary` (#545e76) provide a professional, grounded foundation.
- **Data Accents:** We use `primary_fixed` (Emerald-adjacent) for positive momentum and `tertiary_fixed_dim` (Crimson-adjacent) for risk/negative impact.
- **Backgrounds:** `surface` (#f8f9fa) serves as our canvas, providing a crisp, gallery-like feel.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. 
Structure must be achieved through:
- **Background Color Shifts:** Use `surface_container_low` vs. `surface` to define regions.
- **Tonal Transitions:** A `surface_container_highest` header sitting on a `surface` body creates a natural terminal point without the visual noise of a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. 
1. **Base:** `surface` (The desk).
2. **Primary Work Area:** `surface_container_low` (The blotter).
3. **Active Cards:** `surface_container_lowest` (#ffffff) (The document).
4. **Modals/Popovers:** Use `surface_bright` with Glassmorphism (Backdrop-blur: 20px) to simulate floating glass layers.

### Signature Textures
Main CTAs should utilize a subtle linear gradient from `primary` to `on_primary_container` (#648d78) at a 135-degree angle. This adds a "silk-finish" depth that differentiates the system from flat, generic corporate tools.

---

## 3. Typography
The system uses a dual-font strategy to balance character with extreme readability.

- **The Voice (Display & Headlines):** **Manrope** is used for all `display` and `headline` levels. Its geometric yet warm construction feels modern and "designed." 
  - *Strategy:* Use `display-lg` (3.5rem) sparingly for high-level KPIs to create a "Hero Metric" effect.
- **The Engine (Body & Labels):** **Inter** is used for all `title`, `body`, and `label` roles. Its high x-height ensures that dense project data remains legible even at `body-sm` (0.75rem).
- **Identity via Scale:** By pairing a `display-sm` (2.25rem) header with a `label-md` (0.75rem) metadata tag, we create a sophisticated high-contrast tension that looks bespoke and intentional.

---

## 4. Elevation & Depth
We convey importance through **Tonal Layering** rather than structural geometry.

- **The Layering Principle:** To lift a "Status Report" card, place it (`surface_container_lowest`) onto a `surface_container_low` background. The slight shift in hex value provides a soft, natural lift.
- **Ambient Shadows:** For floating elements like dropdowns, use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(25, 28, 29, 0.06)`. This mimics soft, overhead office lighting.
- **The "Ghost Border" Fallback:** If containment is required for accessibility in data tables, use the `outline_variant` token at **15% opacity**. This provides a "hint" of a boundary without cluttering the view.
- **Glassmorphism:** Use `surface_variant` at 80% opacity with a `backdrop-filter: blur(12px)` for sidebar navigation. This allows the project colors to bleed through, making the tool feel integrated and fluid.

---

## 5. Components

### Buttons
- **Primary:** High-contrast `primary` (#000000) with `on_primary` text. Use `rounded-md` (0.375rem).
- **Secondary:** `surface_container_high` background with `on_surface` text. No border.
- **Tertiary:** Text-only using `primary_fixed_dim` to draw the eye to "soft" actions.

### Cards & Data Lists
- **Rule:** Absolute prohibition of divider lines. 
- **Execution:** Separate list items using the `spacing-4` (0.9rem) scale or by alternating backgrounds between `surface` and `surface_container_lowest`. 
- **Header:** Cards should use `title-lg` for titles with a `spacing-2` vertical margin to the content below.

### Status Chips
- **Positive:** `on_primary_container` text on a `primary_fixed` background.
- **Critical:** `on_tertiary_fixed_variant` text on a `tertiary_fixed` background.
- **Shape:** Always use `rounded-full` for chips to contrast against the `rounded-md` structure of the main containers.

### Input Fields
- **Default State:** Use `surface_container_high` as the fill. 
- **Active State:** Change fill to `surface_container_lowest` and apply a 1px "Ghost Border" using `surface_tint`.
- **Labels:** Always use `label-md` in `on_surface_variant` (#44474c), positioned 0.4rem above the field.

### Executive Timeline (Custom Component)
A custom component for senior leadership to track milestones. Use a 2px vertical track in `outline_variant` (10% opacity). Active milestones use the `primary` token with a subtle `surface_tint` outer glow.

---

## 6. Do's and Don'ts

### Do
- **Do** use `spacing-12` (2.75rem) and `spacing-16` (3.5rem) to separate major sections. Senior leaders appreciate the "breathing room."
- **Do** use `inverse_surface` for dark-mode-style tooltips to ensure they pop against the light `f8f9fa` background.
- **Do** prioritize `manrope` for any number-heavy data to give figures a "designed" feel.

### Don't
- **Don't** use standard 1px `#EEEEEE` dividers. Use whitespace or tonal shifts.
- **Don't** use bright, saturated blues. Stick to the `secondary` (#545e76) and `on_secondary_container` (#5a647c) for a more sophisticated, "executive" palette.
- **Don't** use `rounded-none`. Even the most "corporate" tool needs the approachability of our `DEFAULT` (0.25rem) or `md` (0.375rem) corner radius.