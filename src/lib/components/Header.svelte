<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { getPartySocket } from "$lib/partyContext";
    import Hamburger from "./Hamburger.svelte";

    const socket = getPartySocket();

    let elapsed = $state(0);
    let timerStartedAt: number | null = $state(null);
    let interval: number | undefined = undefined;
    let open = $state(false);

    function updateElapsed() {
        if (timerStartedAt !== null) {
            elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
        }
    }

    function startTimer() {
        if (!socket) return;
        socket.send(
            JSON.stringify({
                type: "getOrCreateTimer",
                clientTime: Date.now(),
            }),
        );
    }

    function resetTimer() {
        if (!socket) return;
        socket.send(
            JSON.stringify({
                type: "resetTimer",
            }),
        );
    }

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    onMount(() => {
        socket.addEventListener("message", (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "timerSync") {
                    timerStartedAt = data.startedAt;
                    updateElapsed();

                    // Start interval if not already running
                    if (!interval) {
                        interval = setInterval(updateElapsed, 1000);
                    }
                }

                if (data.type === "timerStarted") {
                    // Another client started the timer, request our sync
                    socket.send(
                        JSON.stringify({
                            type: "syncMyTimer",
                            clientTime: Date.now(),
                        }),
                    );
                }

                if (data.type === "timerReset") {
                    timerStartedAt = null;
                    elapsed = 0;
                    if (interval) {
                        clearInterval(interval);
                        interval = undefined;
                    }
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        });

        // Request timer state on connect
        socket.addEventListener("open", () => {
            socket!.send(
                JSON.stringify({
                    type: "getOrCreateTimer",
                    clientTime: Date.now(),
                }),
            );
        });
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
        socket?.close();
    });
</script>

<header>
    <h2>Pair Programming Challenge</h2>
    <div class="timer-section">
        <span class="timer">{formatTime(elapsed)}</span>
        {#if timerStartedAt === null}
            <button onclick={startTimer}>Start</button>
        {:else}
            <button onclick={resetTimer}>Reset</button>
        {/if}
    </div>
    <Hamburger
        open={false}
        duoLine={false}
        on:click={() => {
            open = !open;
            console.log(open);
        }}
    />
</header>

<style>
    header {
        height: 40px;
        display: flex;
        align-items: center;
        font-family: var(--term-font);
        padding: 10px 20px;
        background: var(--term-bg);
        border-bottom: 2px solid var(--term-border);
        gap: 20px;
    }

    h2 {
        flex-grow: 1;
        font-weight: normal;
        margin: 0;
        font-size: 1rem;
        color: var(--term-text);
    }

    .timer-section {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .timer {
        font-size: 1.2rem;
        font-weight: bold;
        color: var(--term-green);
        min-width: 60px;
    }

    button {
        background: transparent;
        border: 1px solid var(--term-border);
        color: var(--term-text);
        font-family: var(--term-font);
        padding: 4px 12px;
        cursor: pointer;
        font-size: 0.85rem;
    }

    button:hover {
        background: var(--term-border);
        color: #fff;
    }
</style>
