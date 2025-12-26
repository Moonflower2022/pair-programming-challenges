export interface EngineResult {
    on(event: 'stdout', listener: (data: string) => void): this;
    on(event: 'stderr', listener: (data: string) => void): this;
    on(event: 'finished', listener: (data: { ok: true, value: any } | { ok: false, error: string }) => void): this;

    off(event: 'stdout', listener: (data: string) => void): this;
    off(event: 'stderr', listener: (data: string) => void): this;
    off(event: 'finished', listener: (data: { ok: true, value: any } | { ok: false, error: string }) => void): this;
}

export function* walkAst(node: AstNode): Generator<AstNode> {
    yield node;
    for (const child of node.children()) {
        yield* walkAst(child);
    }
}

export interface SourcePosition {
    line: number;
    column: number;
}

export interface SourceRange {
    start: SourcePosition;
    end?: SourcePosition;
}

export interface AstNode {
    type(): string;
    children(): AstNode[];
    position(): SourceRange | null;
}

export interface Engine<R extends EngineResult, A> {
    run(code: string): Promise<R>;
    parse(code: string): Promise<A>;
}