<script module lang="ts">
    (globalThis as any).MonacoEnvironment = {
        getWorker: function (workerId: unknown, label: string) {
            if (!("window" in globalThis)) {
                // SSR
                throw new Error("Monaco editor does not support SSR.");
            }

            const getWorkerModule = (moduleUrl: unknown, label: string) => {
                return new Worker(
                    (self as any).MonacoEnvironment.getWorkerUrl(moduleUrl),
                    {
                        name: label,
                        type: "module",
                    },
                );
            };

            switch (label) {
                case "json":
                    return getWorkerModule(
                        "/monaco-editor/esm/vs/language/json/json.worker?worker",
                        label,
                    );
                case "css":
                case "scss":
                case "less":
                    return getWorkerModule(
                        "/monaco-editor/esm/vs/language/css/css.worker?worker",
                        label,
                    );
                case "html":
                case "handlebars":
                case "razor":
                    return getWorkerModule(
                        "/monaco-editor/esm/vs/language/html/html.worker?worker",
                        label,
                    );
                case "typescript":
                case "javascript":
                    return getWorkerModule(
                        "/monaco-editor/esm/vs/language/typescript/ts.worker?worker",
                        label,
                    );
                default:
                    return getWorkerModule(
                        "/monaco-editor/esm/vs/editor/editor.worker?worker",
                        label,
                    );
            }
        },
    };

    export const LOADING = Symbol("MonacoLoading");
</script>

<script lang="ts">
    import type * as monaco from "monaco-editor";
    import { onMount } from "svelte";

    let container: HTMLDivElement;
    let editor = $state<monaco.editor.IStandaloneCodeEditor | undefined>(
        undefined,
    );

    type Props = {
        value: string | typeof LOADING;
    };

    let { value = $bindable(LOADING) }: Props = $props();

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

            editor = monaco.editor.create(container, {
                value: "# Type your code here",
                language: "python",
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
        height: 200px;
    }
</style>
