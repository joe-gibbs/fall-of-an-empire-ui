# Making the UI Feel Like a Game, Not a Webpage

## High Impact

### 1. Sound Effects
The single biggest thing. Every game UI has audio feedback. Click sounds, whooshes on sidebar/screen transitions, subtle hover ticks, notification chimes, confirmation thumps. Without sound, even perfect visuals feel like a styled website. A small `useSound` hook with 5-6 short WAV/MP3 clips would transform the entire experience.

### 2. Click Feedback - Scale Punch
Web buttons change color on hover. Game buttons *physically react*. A quick `scale(0.97)` on `:active` that snaps back creates a tactile "press" feeling. Right now buttons just shift brightness -- that's CSS demo energy, not game energy.

### 3. Animated Value Changes
When stats, gold, fame, bar widths, or counts change, they should *interpolate* to the new value over ~300ms, not snap instantly. Numbers should tick up/down. Bars should ease to their new width with a slight overshoot. This is what makes Paradox/CA UIs feel alive -- every number is in motion.

### 4. Staggered Entrance Animations
Right now screens and sidebars enter as a single block. Game UIs reveal content in sequence: header slides in, then cards cascade in one by one (30-50ms stagger), then footer elements fade up. Already done for event options -- apply it everywhere.

## Medium Impact

### 5. Hover States That Feel Physical, Not CSS
Instead of `filter: brightness(1.1)`, game hover states change the element's texture/border treatment. A hovered card could shift its border from dim gold to bright gold, show a subtle inner highlight gradient along the top edge, or shift its background texture. The hover should feel like the card is *selected by the cursor*, not like a CSS pseudo-class fired.

### 6. Idle Ambient Motion
The star shimmer on role XP is a good start. More of this: subtle floating motion on decorative elements, a very slow drift on background textures, periodic subtle "breathe" on the active sidebar's border, the gold meander pattern slowly scrolling. Static UIs feel dead. Game UIs have gentle life even when idle.

### 7. Tooltip Entrance
Web tooltips appear instantly or fade in. Game tooltips should scale from ~0.95 with a fast snap ease (0.12s), anchored from the trigger point. Small thing, big feel difference.

### 8. Transition Between Data States
When switching sidebar tabs or swapping which character is shown, the content should crossfade or have a brief exit/enter cycle rather than instant-swapping the DOM. Instant content swaps are the most "webpage" thing a UI can do.

## Lower Impact but Polishing

### 9. Button Press Anticipation
On mousedown (not click), the button should react. On mouseup, fire the action. This 50-100ms gap between "I pressed" and "something happened" creates a feeling of physical input that web click handlers completely lack.

### 10. Animated Decorative Borders
The gold frame on interaction cards is static. A slow shimmer traveling along the border (animated `background-position` on the `border-image` or a pseudo-element) would make premium elements feel enchanted rather than printed.

### 11. Context Cursor Changes
Custom cursors exist but they're binary (default/pointer). Games use distinct cursors for different contexts: a sword cursor over attack buttons, a scroll cursor over diplomacy, a coin cursor over economy. Even 2-3 variants add subconscious "this is a game" signals.

## What NOT to Do

Per design rules: no box-shadow, no backdrop-filter, no glow/bloom effects, no border-radius. All of the above respect those constraints. The key insight is that game feel comes from **motion, sound, and timing** -- not from adding more visual effects.
