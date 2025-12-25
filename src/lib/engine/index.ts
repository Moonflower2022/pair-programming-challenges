export interface EngineResult {
    on(event: 'stdout', listener: (data: string) => void): this;
    on(event: 'stderr', listener: (data: string) => void): this;
    on(event: 'finished', listener: (data: { ok: true, value: any } | { ok: false, error: string }) => void): this;

    off(event: 'stdout', listener: (data: string) => void): this;
    off(event: 'stderr', listener: (data: string) => void): this;
    off(event: 'finished', listener: (data: { ok: true, value: any } | { ok: false, error: string }) => void): this;
}

export interface Engine<R extends EngineResult> {
    run(code: string): Promise<R>;
}