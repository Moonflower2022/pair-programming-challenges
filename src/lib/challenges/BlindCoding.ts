// lib/challenges/BlindCoding.ts
import { Challenge, type ChallengeContext } from './base';

interface BlindCodingConfig {
    showInterval: number;  // seconds
    showDuration: number;  // seconds
}

export class BlindCoding extends Challenge {
    private config: BlindCodingConfig;
    private interval?: number;
    private onVisibilityChange: (visible: boolean) => void;

    constructor(
        context: ChallengeContext,
        onVisibilityChange: (visible: boolean) => void,
        config: BlindCodingConfig = { showInterval: 10, showDuration: 1 }
    ) {
        super(context);
        this.config = config;
        this.onVisibilityChange = onVisibilityChange;
    }

    activate(): void {
        this.onVisibilityChange(false); // Start hidden

        this.interval = setInterval(() => {
            this.onVisibilityChange(true);
            setTimeout(() => {
                this.onVisibilityChange(false);
            }, this.config.showDuration * 1000);
        }, this.config.showInterval * 1000);
    }

    deactivate(): void {
        clearInterval(this.interval);
        this.onVisibilityChange(true); // Show when disabled
        super.deactivate();
    }

    getConfig() { return this.config; }
    getName() { return 'Blind Coding'; }
    getDescription() { return `Editor visible ${this.config.showDuration}s every ${this.config.showInterval}s`; }
}