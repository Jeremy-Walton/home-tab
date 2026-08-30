import { useEffect, useRef } from "react";
import type { AnimatedIconHandle, AnimatedIconProps, IconComponent } from "./animated-icon";

/** Whichever of these sits nearest the icon drives its animation. */
const INTERACTIVE_ANCESTOR = 'button, a, [role="menuitem"]';

export type HoverIconProps = Omit<AnimatedIconProps, "trigger"> & { icon: IconComponent };

/**
 * An animated icon driven by its enclosing control rather than by itself.
 *
 * The library's own `trigger="hover"` listens on the `<svg>`, which is inert
 * under the `[&_svg]:pointer-events-none` that `ui/button.tsx` and the menu item
 * classes set — and even without that, a control's padding and enlarged hit area
 * are not the glyph. Binding to the ancestor animates on the whole hit area, and
 * on keyboard focus too.
 */
export function HoverIcon({ icon: Icon, ...props }: HoverIconProps) {
  const handle = useRef<AnimatedIconHandle>(null);
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const control = anchor.current?.closest(INTERACTIVE_ANCESTOR);
    if (!control) return;

    // Pointer and focus are tracked separately, and the icon plays on the rising edge
    // of "either holds the control". Toggling `active` per event instead would let a
    // pointerleave cut short an animation the control still has focus for, and would
    // latch `active` on after a menu closes onto its own trigger — leaving a later
    // hover a silent no-op, since play() only animates on a state change.
    const held = { pointer: false, focus: false };
    const setHeld = (source: keyof typeof held, value: boolean) => () => {
      const was = held.pointer || held.focus;
      held[source] = value;
      const now = held.pointer || held.focus;
      if (now === was) return;
      if (now) handle.current?.play();
      else handle.current?.stop();
    };

    const bindings = [
      ["pointerenter", setHeld("pointer", true)],
      ["pointerleave", setHeld("pointer", false)],
      ["focus", setHeld("focus", true)],
      ["blur", setHeld("focus", false)],
    ] as const;

    for (const [type, listener] of bindings) control.addEventListener(type, listener);
    return () => {
      for (const [type, listener] of bindings) control.removeEventListener(type, listener);
    };
  }, []);

  // `contents` keeps the anchor out of layout, so the svg stays the control's own child.
  return (
    <span ref={anchor} className="contents">
      <Icon ref={handle} trigger="none" {...props} />
    </span>
  );
}
