<!-- lib/components/ChallengeManager.svelte -->
<script lang="ts">
    import { CHALLENGES, type Challenge } from "$lib/challenges";

    interface Props {
        onActivate: (challengeId: string, config?: any) => void;
        onDeactivate: () => void;
        activeChallenge: Challenge | null;
        activeChallengeId: string | null;
    }

    let { onActivate, onDeactivate, activeChallenge, activeChallengeId }: Props = $props();

    let isOpen = $state(false);
    let selectedChallenge = $state<string | null>(null);

    // Sync selectedChallenge with active challenge
    $effect(() => {
        selectedChallenge = activeChallengeId;
    });

    // Challenge-specific configs
    let activityTimerSeconds = $state(5);
    let blindShowInterval = $state(10);
    let blindShowDuration = $state(1);

    function handleActivate() {
        if (!selectedChallenge) return;

        let config;
        switch (selectedChallenge) {
            case "activity-timer":
                config = { seconds: activityTimerSeconds };
                break;
            case "blind-coding":
                config = {
                    showInterval: blindShowInterval,
                    showDuration: blindShowDuration,
                };
                break;
        }

        onActivate(selectedChallenge, config);
        isOpen = false;
    }

    function handleDeactivate() {
        onDeactivate();
        selectedChallenge = null;
    }
</script>

<div class="challenge-manager">
    <button class="toggle-btn" onclick={() => (isOpen = !isOpen)}>
        {#if activeChallenge}
            🎯 {activeChallenge.getName()}
        {:else}
            🎮 Select Challenge
        {/if}
    </button>

    {#if isOpen}
        <div class="panel">
            <div class="header">
                <h3>Challenges</h3>
                <button onclick={() => (isOpen = false)}>✕</button>
            </div>

            <div class="challenge-list">
                <label>
                    <input
                        type="radio"
                        bind:group={selectedChallenge}
                        value={null}
                    />
                    None
                </label>

                <label>
                    <input
                        type="radio"
                        bind:group={selectedChallenge}
                        value="no-for-loops"
                    />
                    No For Loops
                </label>

                <label>
                    <input
                        type="radio"
                        bind:group={selectedChallenge}
                        value="activity-timer"
                    />
                    Activity Timer
                </label>
                {#if selectedChallenge === "activity-timer"}
                    <div class="config">
                        <label>
                            Seconds: <input
                                type="number"
                                bind:value={activityTimerSeconds}
                                min="1"
                                max="30"
                            />
                        </label>
                    </div>
                {/if}

                <label>
                    <input
                        type="radio"
                        bind:group={selectedChallenge}
                        value="alternating-lines"
                    />
                    Alternating Lines
                </label>

                <label>
                    <input
                        type="radio"
                        bind:group={selectedChallenge}
                        value="blind-coding"
                    />
                    Blind Coding
                </label>
                {#if selectedChallenge === "blind-coding"}
                    <div class="config">
                        <label>
                            Show every (s): <input
                                type="number"
                                bind:value={blindShowInterval}
                                min="5"
                                max="60"
                            />
                        </label>
                        <label>
                            Show for (s): <input
                                type="number"
                                bind:value={blindShowDuration}
                                min="1"
                                max="10"
                            />
                        </label>
                    </div>
                {/if}
            </div>

            <div class="actions">
                {#if activeChallenge}
                    <button class="deactivate-btn" onclick={handleDeactivate}>
                        Deactivate
                    </button>
                {/if}
                <button
                    class="activate-btn"
                    onclick={handleActivate}
                    disabled={!selectedChallenge}
                >
                    Activate
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .challenge-manager {
        position: relative;
    }

    .toggle-btn {
        padding: 8px 16px;
        background: #2c2c2c;
        border: 1px solid #444;
        color: #fff;
        cursor: pointer;
        border-radius: 4px;
    }

    .toggle-btn:hover {
        background: #333;
    }

    .panel {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 8px;
        background: #1e1e1e;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 16px;
        min-width: 300px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .header h3 {
        margin: 0;
        color: #fff;
    }

    .header button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 20px;
    }

    .challenge-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
    }

    .challenge-list label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ccc;
        cursor: pointer;
    }

    .config {
        margin-left: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        background: #252525;
        border-radius: 4px;
    }

    .config label {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .config input {
        width: 60px;
        padding: 4px;
        background: #1e1e1e;
        border: 1px solid #444;
        color: #fff;
    }

    .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .activate-btn,
    .deactivate-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .activate-btn {
        background: #0e639c;
        color: #fff;
    }

    .activate-btn:disabled {
        background: #444;
        cursor: not-allowed;
    }

    .deactivate-btn {
        background: #d9534f;
        color: #fff;
    }
</style>
