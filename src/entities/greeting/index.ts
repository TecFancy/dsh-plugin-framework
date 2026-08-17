/**
 * Greeting entity slice. The barrel is the only legal import surface for other
 * slices: nothing else may reach into model/ directly.
 */
export { GreetingService } from "./model/greeting.js";
