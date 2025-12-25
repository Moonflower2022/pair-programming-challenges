<script lang="ts">
    import Monaco, { LOADING } from "$lib/components/Monaco.svelte";
    import Terminal, { CommandContext } from "$lib/components/Terminal.svelte";
    import { PythonEngine } from "$lib/engine/python";
    import { onMount } from "svelte";
    import YPartyKitProvider from "y-partykit/provider";

    const ENGINE = new PythonEngine();

    let monacoValue: string | typeof LOADING | undefined = $state(undefined);
    let textSyncer: ((v: string) => void) | undefined = undefined;

    $effect(() => {
        if (
            monacoValue !== undefined &&
            monacoValue !== LOADING &&
            textSyncer !== undefined
        ) {
            textSyncer(monacoValue);
        }
    });

    onMount(async () => {
        const Y = await import("yjs");

        const doc = new Y.Doc();
        new YPartyKitProvider(
            `${document.location.hostname}:1999`,
            "pair-challenge",
            doc,
            {
                protocol: "ws",
            },
        );

        const yText = doc.getText("shared");

        yText.observe(() => {
            monacoValue = yText.toString();
        });

        monacoValue = yText.toString();

        textSyncer = (v: string) => {
            if (v === yText.toString()) {
                return;
            }

            yText.delete(0, yText.length);
            yText.insert(0, v);
        };
    });

    async function handleCommand(command: string, context: CommandContext) {
        const cmd = command.toLowerCase().trim();

        switch (cmd) {
            case "run":
                await runCode(context);
                break;

            case "clear":
                context.info("Use Ctrl+L or refresh to clear terminal");
                context.complete();
                break;

            case "help":
                showHelp(context);
                break;

            default:
                context.error(`Unknown command: ${command}`);
                context.info("Type 'help' for available commands");
                context.fail();
                break;
        }
    }

    async function runCode(context: CommandContext) {
        // Check if editor is ready
        if (monacoValue === LOADING) {
            context.error("Editor is still loading...");
            context.warning("Please wait for the editor to initialize");
            context.fail();
            return;
        }

        if (monacoValue === undefined) {
            context.error("Editor is not initialized");
            context.fail();
            return;
        }

        // Check if there's code to run
        if (!monacoValue.trim()) {
            context.warning("No code to execute");
            context.info("Write some Python code in the editor first");
            context.fail();
            return;
        }

        context.info("Executing Python code...");

        try {
            const result = await ENGINE.run(monacoValue);

            result.on("stdout", (data: string) => {
                context.info(data);
            });

            result.on("stderr", (data: string) => {
                context.error(data);
            });

            result.on(
                "finished",
                (outcome: { ok: boolean; value?: any; error?: string }) => {
                    if (outcome.ok) {
                        context.success(`✓ Execution completed`);

                        if (outcome.value != undefined) {
                            context.info(`Result: ${outcome.value}`);
                        }

                        context.complete();
                    } else {
                        context.error(`✗ Execution failed`);
                        if (outcome.error) {
                            context.error(outcome.error);
                        }
                        context.fail();
                    }
                },
            );
        } catch (error) {
            context.error("Failed to execute code");
            context.error(
                error instanceof Error ? error.message : String(error),
            );
            context.fail();
        }
    }

    function showHelp(context: CommandContext) {
        context.info("Available commands:");
        context.info("  run   - Execute the Python code in the editor");
        context.info("  help  - Show this help message");
        context.info("  clear - Instructions to clear terminal");
        context.complete();
    }
</script>

{#if monacoValue !== undefined}
    <Monaco bind:value={monacoValue} />
{/if}

<Terminal
    onCommand={handleCommand}
    welcomeMessage="🚀 Welcome to the code challenge terminal!

Type 'run' to execute your Python code or 'help' for available commands."
/>
