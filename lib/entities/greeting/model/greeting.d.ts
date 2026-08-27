/**
 * Greeting entity: a tiny domain object owned by the plugin.
 *
 * Entities hold domain state and rules; they never know about cordis, slots,
 * or transport. Only properties that are meaningful domain behavior live here
 * (here: an empty string is not a greeting, so it is rejected).
 */
export declare class GreetingService {
    #private;
    constructor(initial: string);
    getGreeting(): string;
    setGreeting(next: string): void;
}
//# sourceMappingURL=greeting.d.ts.map