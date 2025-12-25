<script module lang="ts">
    import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
    import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
    import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
    import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
    import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

    self.MonacoEnvironment = {
        getWorker: function (_moduleId: any, label: string) {
            if (label === "json") {
                return new jsonWorker();
            }
            if (label === "css" || label === "scss" || label === "less") {
                return new cssWorker();
            }
            if (
                label === "html" ||
                label === "handlebars" ||
                label === "razor"
            ) {
                return new htmlWorker();
            }
            if (label === "typescript" || label === "javascript") {
                return new tsWorker();
            }
            return new editorWorker();
        },
    };

    export const LOADING = Symbol("MonacoLoading");
</script>

<script lang="ts">
    import type * as monaco from "monaco-editor";
    import { onMount } from "svelte";

    let container: HTMLDivElement;

    type Props = {
        value?: string | typeof LOADING;
        editor: monaco.editor.IStandaloneCodeEditor | undefined;
    };

    let { value = $bindable(LOADING), editor = $bindable(undefined) }: Props =
        $props();

    $effect(() => {
        if (editor !== undefined && value !== LOADING) {
            if (editor.getValue() !== value) {
                editor.setValue(value);
            }
        }
    });

    onMount(() => {
        (async () => {
            const monaco = await import("monaco-editor");

            // Define terminal-matching theme
            monaco.editor.defineTheme("terminal", {
                base: "vs-dark",
                inherit: false,
                rules: [
                    { token: "", foreground: "cccccc", background: "0c0c0c" },
                    {
                        token: "comment",
                        foreground: "666666",
                        fontStyle: "italic",
                    },
                    { token: "keyword", foreground: "00ff41" },
                    { token: "keyword.control", foreground: "00ff41" },
                    { token: "string", foreground: "ffff00" },
                    { token: "number", foreground: "00ffff" },
                    { token: "operator", foreground: "cccccc" },
                    { token: "delimiter", foreground: "cccccc" },
                    { token: "type", foreground: "00ffff" },
                    { token: "function", foreground: "00ff41" },
                    { token: "variable", foreground: "cccccc" },
                    { token: "constant", foreground: "00ffff" },
                    { token: "class", foreground: "00ffff" },
                    { token: "interface", foreground: "00ffff" },
                    { token: "namespace", foreground: "00ffff" },
                    { token: "parameter", foreground: "cccccc" },
                    { token: "property", foreground: "cccccc" },
                    { token: "invalid", foreground: "ff3333" },
                ],
                colors: {
                    "editor.background": "#0c0c0c",
                    "editor.foreground": "#cccccc",
                    "editorCursor.foreground": "#00ff41",
                    "editor.lineHighlightBackground": "#1a1a1a",
                    "editorLineNumber.foreground": "#555555",
                    "editorLineNumber.activeForeground": "#00ff41",
                    "editor.selectionBackground": "#333333",
                    "editor.inactiveSelectionBackground": "#222222",
                    "editorIndentGuide.background": "#333333",
                    "editorIndentGuide.activeBackground": "#555555",
                    "editorBracketMatch.background": "#333333",
                    "editorBracketMatch.border": "#00ff41",
                    "scrollbarSlider.background": "#33333380",
                    "scrollbarSlider.hoverBackground": "#55555580",
                    "scrollbarSlider.activeBackground": "#666666",
                },
            });

            editor = monaco.editor.create(container, {
                value: "# Type your code here",
                language: "python",
                theme: "terminal",
                fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                fontSize: 14,
                lineHeight: 1.4,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: "line",
                cursorBlinking: "phase",
                cursorStyle: "line",
            });

            if (value !== LOADING) {
                editor.setValue(value);
            }

            editor.onDidChangeModelContent(() => {
                value = editor!.getValue();
            });
        })();

        return () => {
            editor?.dispose();
        };
    });
</script>

<div class="monaco-editor" bind:this={container}></div>

<style>
    .monaco-editor {
        width: 100%;
        height: 100%;
    }
</style>
