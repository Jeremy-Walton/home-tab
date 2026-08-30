/**
 * Motion's DOM animation feature bundle, in its own module so `LazyMotion` can
 * pull it in as a separate async chunk rather than on the critical path.
 *
 * `domAnimation` covers animations, variants, exit and gestures — everything the
 * icons use. Widening this to `domMax` (layout animations, drag) would grow the
 * chunk for features no icon needs.
 */
import { domAnimation } from "motion/react";

export default domAnimation;
