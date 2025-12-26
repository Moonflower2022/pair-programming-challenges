import type { Engine, EngineResult } from "..";
import { loadPyodide, type PyodideAPI } from "pyodide";
import mitt, { type Emitter } from 'mitt';
import { PythonAstNode } from "./ast";
import type { PyProxy } from "pyodide/ffi";

export class PythonEngine implements Engine<PythonEngineResult, any> {
    static async new(): Promise<PythonEngine> {
        const pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
        });

        pyodide.runPython(`
import ast
import json

def ast_to_dict(node):
    if isinstance(node, ast.AST):
        result = {
            "type": node.__class__.__name__,
            **{
                field: ast_to_dict(getattr(node, field))
                for field in node._fields
            }
        }

        # Source location info (if present)
        for attr in ("lineno", "col_offset", "end_lineno", "end_col_offset"):
            if hasattr(node, attr):
                result[attr] = getattr(node, attr)

        return result
    elif isinstance(node, list):
        return [ast_to_dict(item) for item in node]
    else:
        return node

def parse_to_json(code):
    tree = ast.parse(code)
    return json.dumps(ast_to_dict(tree))
`)

        return new PythonEngine(pyodide);
    }

    private constructor(private pyodide: PyodideAPI) {
        this.parsePython = this.pyodide.globals.get("parse_to_json");
    }

    private parsePython: (pyCode: string) => string;

    async run(code: string): Promise<PythonEngineResult> {
        return await PythonEngineResult.run(code);
    }

    async parse(code: string): Promise<any> {
        const result = this.parsePython(code);
        return PythonAstNode.fromJson(JSON.parse(result));
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

    static async run(code: string, options?: { globals?: (pyodide: PyodideAPI) => PyProxy; locals?: (pyodide: PyodideAPI) => PyProxy; filename?: string; }): Promise<PythonEngineResult> {
        const result = new PythonEngineResult();

        const pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
            stdout: (msg) => result.emitter.emit('stdout', msg),
            stderr: (msg) => result.emitter.emit('stderr', msg),
        });

        pyodide.runPythonAsync(code, {
            globals: options?.globals ? options.globals(pyodide) : undefined,
            locals: options?.locals ? options.locals(pyodide) : undefined,
            filename: options?.filename,
        })
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