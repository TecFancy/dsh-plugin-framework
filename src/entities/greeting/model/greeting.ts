/**
 * Greeting entity: a tiny domain object owned by the plugin.
 *
 * Entities hold domain state and rules; they never know about cordis, slots,
 * or transport. Only properties that are meaningful domain behavior live here
 * (here: an empty string is not a greeting, so it is rejected).
 */
export class GreetingService {
  #greeting: string;

  constructor(initial: string) {
    this.#greeting = initial;
  }

  getGreeting(): string {
    return this.#greeting;
  }

  setGreeting(next: string): void {
    if (next.trim() === "") return;
    this.#greeting = next;
  }
}
