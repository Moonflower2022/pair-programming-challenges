<script lang="ts">
    import Monaco, { LOADING } from "$lib/components/Monaco.svelte"
    import { onMount } from "svelte"

    let pyodide: any = $state();
    let code = $state("print(2 + 2)");
    let output = $state("");

    let monacoValue: string | typeof LOADING = $state(LOADING)

    onMount(() => {
        (async () => {
            const { loadPyodide } = await import("pyodide")
            pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
            });
        })();

        return () => {
            pyodide = null
        }
    })

    let result:
        | { ok: true; value: string }
        | { ok: false; value: string }
        | typeof LOADING = $derived.by(() => {
        if (!pyodide) return LOADING
        if (monacoValue === LOADING) return LOADING

        try {
            return { ok: true, value: pyodide.runPython(monacoValue) }
        } catch (e: any) {
            return { ok: false, value: e.message }
        }
    })
</script>

<Monaco bind:value={monacoValue} />

{#if result !== LOADING}
    {#if result.ok}
        <pre>Result: {result.value}</pre>
    {:else}
        <pre style="color: red;">Error: {result.value}</pre>
    {/if}
{:else}
    <p>Loading...</p>
{/if}
