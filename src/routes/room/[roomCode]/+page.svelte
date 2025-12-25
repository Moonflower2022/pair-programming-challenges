<script lang="ts">
    import { page } from "$app/stores"
    import { get } from "svelte/store"
    import Monaco, { LOADING } from "$lib/components/Monaco.svelte"
    import Header from "$lib/components/Header.svelte"
    import Terminal, {
        CommandContext,
        type CommandSession,
    } from "$lib/components/Terminal.svelte"
    import { PythonEngine } from "$lib/engine/python"
    import { onMount } from "svelte"
    import { MonacoBinding } from "y-monaco"
    import { getYjsDoc, getYjsProvider } from "$lib/partyContext"
    import * as monaco from "monaco-editor"
    import type * as Y from "yjs"
    import ChallengeManager from "$lib/components/ChallengeManager.svelte"
    import {
        Challenge,
        CHALLENGES,
        type ChallengeContext,
    } from "$lib/challenges"

    let activeChallenge: Challenge | null = $state(null)
    let editorVisible = $state(true)

    function activateChallenge(challengeId: string, config?: any) {
        activeChallenge?.deactivate()

        if (!monacoEditor || !yDoc || !terminalAwareness) return

        const context: ChallengeContext = {
            editor: monacoEditor,
            yDoc: yDoc,
            awareness: terminalAwareness,
            onMessage: (type, message) => {
                if (!terminalYArray) return;
                terminalYArray.push([{
                    id: crypto.randomUUID(),
                    command: 'system',
                    timestamp: Date.now(),
                    logs: [{ text: message, type, timestamp: Date.now() }],
                    status: 'completed' as const,
                    ownerId: -1
                }]);
            },
        }

        if (challengeId === "blind-coding") {
            activeChallenge = new CHALLENGES[challengeId](
                context,
                (visible) => (editorVisible = visible),
                config
            )
        } else {
            activeChallenge = new CHALLENGES[challengeId](context, config)
        }

        activeChallenge.activate()

        // Sync to yjs
        yDoc.getMap("challenge").set("active", { id: challengeId, config })
    }

    function deactivateChallenge() {
        activeChallenge?.deactivate()
        activeChallenge = null
        yDoc.getMap("challenge").delete("active")
    }

    // Get room code synchronously
    const roomCode = get(page).params.roomCode

    // Get yjs doc and provider from layout context
    const yDoc = getYjsDoc()
    const provider = getYjsProvider()

    const ENGINE = new PythonEngine()

    let monacoValue: string | typeof LOADING | undefined = $state("")
    let monacoEditor: monaco.editor.IStandaloneCodeEditor | undefined =
        $state(undefined)

    let binding: MonacoBinding | undefined

    // yjs state for terminal
    const terminalYArray: Y.Array<CommandSession> =
        yDoc.getArray<CommandSession>("terminal-sessions")
    const terminalAwareness = provider.awareness

    // Resizable terminal state
    let terminalHeight = $state(200)
    let isResizing = $state(false)
    let containerRef: HTMLDivElement | undefined = $state()

    // Terminal component reference
    let terminalRef: ReturnType<typeof Terminal> | undefined

    function startResize(e: MouseEvent) {
        e.preventDefault()
        isResizing = true
        document.addEventListener("mousemove", onResize)
        document.addEventListener("mouseup", stopResize)
    }

    function onResize(e: MouseEvent) {
        if (!isResizing || !containerRef) return
        const containerRect = containerRef.getBoundingClientRect()
        const newHeight = containerRect.bottom - e.clientY
        // Clamp between 100px and 80% of container height
        const maxHeight = containerRect.height * 0.8
        const minHeight = 100
        terminalHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
    }

    function stopResize() {
        isResizing = false
        document.removeEventListener("mousemove", onResize)
        document.removeEventListener("mouseup", stopResize)
    }

    onMount(() => {
        const yText = yDoc.getText("shared")

        const waitForEditor = setInterval(() => {
            const model = monacoEditor?.getModel()

            if (monacoEditor !== undefined && model != null) {
                clearInterval(waitForEditor)
                binding = new MonacoBinding(
                    yText,
                    model,
                    new Set([monacoEditor]),
                    provider.awareness
                )
                model.setEOL(monaco.editor.EndOfLineSequence.LF)
            }
        }, 100)
    })

    async function handleCommand(command: string, context: CommandContext) {
        const cmd = command.toLowerCase().trim()

        switch (cmd) {
            case "run":
                await runCode(context)
                break

            case "clear":
                terminalRef?.clear()
                return

            case "help":
                showHelp(context)
                break

            default:
                context.error(`Unknown command: ${command}`)
                context.info("Type 'help' for available commands")
                context.fail()
                break
        }
    }

    async function runCode(context: CommandContext) {
        // Check if editor is ready
        if (monacoValue === LOADING) {
            context.error("Editor is still loading...")
            context.warning("Please wait for the editor to initialize")
            context.fail()
            return
        }

        // Check if there's code to run
        if (monacoValue === undefined || !monacoValue.trim()) {
            context.warning("No code to execute")
            context.info("Write some Python code in the editor first")
            context.fail()
            return
        }

        context.info("Executing Python code...")

        try {
            const result = await ENGINE.run(monacoValue)

            result.on("stdout", (data: string) => {
                context.info(data)
            })

            result.on("stderr", (data: string) => {
                context.error(data)
            })

            result.on(
                "finished",
                (outcome: { ok: boolean; value?: any; error?: string }) => {
                    if (outcome.ok) {
                        context.success(`Execution completed`)

                        if (outcome.value != undefined) {
                            context.info(`Result: ${outcome.value}`)
                        }

                        context.complete()
                    } else {
                        context.error(`Execution failed`)
                        if (outcome.error) {
                            context.error(outcome.error)
                        }
                        context.fail()
                    }
                }
            )
        } catch (error) {
            context.error("Failed to execute code")
            context.error(
                error instanceof Error ? error.message : String(error)
            )
            context.fail()
        }
    }

    function showHelp(context: CommandContext) {
        context.info("Available commands:")
        context.info("  run   - Execute the Python code in the editor")
        context.info("  help  - Show this help message")
        context.info("  clear - Clear the terminal")
        context.complete()
    }
</script>

<div
    class="page-container"
    bind:this={containerRef}
    class:resizing={isResizing}
>
    <Header />

    <div class="controls">
        <ChallengeManager
            {activeChallenge}
            onActivate={activateChallenge}
            onDeactivate={deactivateChallenge}
        />
    </div>

    <div class="editor-section">
        <Monaco bind:value={monacoValue} bind:editor={monacoEditor} />
    </div>

    <div
        class="resize-handle"
        onmousedown={startResize}
        role="separator"
        aria-orientation="horizontal"
        tabindex="0"
    ></div>

    <div class="terminal-section" style="height: {terminalHeight}px">
        <Terminal
            bind:this={terminalRef}
            onCommand={handleCommand}
            welcomeMessage="Welcome to room '{roomCode}'!

Type 'run' to execute your Python code, 'help' for available commands, or 'clear' to clear the terminal."
            maxHeight="100%"
            yArray={terminalYArray}
            awareness={terminalAwareness}
        />
    </div>
</div>

<style>
    .page-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
    }

    .page-container.resizing {
        cursor: ns-resize;
        user-select: none;
    }

    .editor-section {
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .resize-handle {
        height: 6px;
        background: #333;
        cursor: ns-resize;
        flex-shrink: 0;
        position: relative;
    }

    .resize-handle::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 2px;
        background: #666;
    }

    .resize-handle:hover {
        background: #444;
    }

    .resize-handle:hover::before {
        background: #888;
    }

    .terminal-section {
        flex-shrink: 0;
    }
</style>
