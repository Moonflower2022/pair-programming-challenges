import type { Engine, EngineResult } from ".";
import { loadPyodide, type PyodideAPI } from "pyodide";
import mitt, { type Emitter } from 'mitt';

export class PythonEngine implements Engine<PythonEngineResult> {
    constructor() { }

    async run(code: string): Promise<PythonEngineResult> {
        return await PythonEngineResult.run(code);
    }
}

type PythonEvents = {
    stdout: string;
    stderr: string;
    finished: { ok: true, value: any } | {
        ok: false, error: string
    };
};

export class PythonEngineResult implements EngineResult {
    private emitter: Emitter<PythonEvents> = mitt();

    static async run(code: string): Promise<PythonEngineResult> {
        const result = new PythonEngineResult();

        const pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
            stdout: (msg) => result.emitter.emit('stdout', msg),
            stderr: (msg) => result.emitter.emit('stderr', msg),
        });

        pyodide.runPythonAsync(code)
            .then((finalValue) => result.emitter.emit('finished', { ok: true, value: finalValue }))
            .catch((error) => result.emitter.emit('finished', { ok: false, error: error.message }));

        return result;
    }

    on<K extends keyof PythonEvents>(event: K, listener: (data: PythonEvents[K]) => void): this {
        this.emitter.on(event, listener);
        return this;
    }

    off<K extends keyof PythonEvents>(event: K, listener: (data: PythonEvents[K]) => void): this {
        this.emitter.off(event, listener);
        return this;
    }

    private constructor() { }
}