// lib/challenges/base.ts
import type * as monaco from "monaco-editor";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { AstNode, Engine, EngineResult } from "$lib/engine";

export interface ChallengeContext {
    editor: monaco.editor.IStandaloneCodeEditor;
    yDoc: Y.Doc;
    awareness: Awareness;
    engine: Engine<EngineResult, AstNode>;
    onMessage: (type: 'info' | 'error' | 'warning', message: string) => void;
}

export abstract class Challenge {
    protected context: ChallengeContext;
    protected disposables: monaco.IDisposable[] = [];

    constructor(context: ChallengeContext) {
        this.context = context;
    }

    abstract activate(): void;

    deactivate(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    abstract getConfig(): Record<string, any>;
    abstract getName(): string;
    abstract getDescription(): string;
}