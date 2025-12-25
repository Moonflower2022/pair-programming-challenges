<script module lang="ts">
    if (!crypto.randomUUID) {
        crypto.randomUUID =
            function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
                // Use crypto.getRandomValues if available for better randomness
                if (crypto.getRandomValues) {
                    // Generate 16 random bytes
                    const bytes = new Uint8Array(16);
                    crypto.getRandomValues(bytes);

                    // Set version (4) and variant bits according to RFC4122
                    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
                    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

                    // Convert to UUID string format
                    const hex = Array.from(bytes, (byte) =>
                        byte.toString(16).padStart(2, "0"),
                    ).join("");
                    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
                }

                // Fallback to Math.random() (less secure)
                return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                    /[xy]/g,
                    function (c) {
                        const r = (Math.random() * 16) | 0;
                        const v = c === "x" ? r : (r & 0x3) | 0x8;
                        return v.toString(16);
                    },
                ) as any;
            };
    }

    export class CommandContext {
        private session: CommandSession;

        constructor(session: CommandSession) {
            this.session = session;
        }

        log(text: string, type: LogEntry["type"] = "info") {
            this.session.logs.push({ text, type, timestamp: new Date() });
        }

        info(text: string) {
            this.log(text, "info");
        }

        error(text: string) {
            this.log(text, "error");
        }

        success(text: string) {
            this.log(text, "success");
        }

        warning(text: string) {
            this.log(text, "warning");
        }

        complete() {
            this.session.status = "completed";
        }

        fail() {
            this.session.status = "error";
        }
    }
</script>

<script lang="ts">
    interface LogEntry {
        text: string;
        type: "info" | "error" | "success" | "warning";
        timestamp: Date;
    }

    interface CommandSession {
        id: string;
        command: string;
        timestamp: Date;
        logs: LogEntry[];
        status: "running" | "completed" | "error";
        collapsed: boolean;
    }

    interface Props {
        welcomeMessage?: string;
        onCommand?: (command: string, context: CommandContext) => void;
        maxHeight?: string;
    }

    let {
        welcomeMessage = "Terminal ready. Type a command to begin...",
        onCommand = () => {},
        maxHeight = "600px",
    }: Props = $props();

    let sessions = $state<CommandSession[]>([]);
    let inputValue = $state("");
    let terminalRef: HTMLDivElement | undefined = $state();
    let inputRef: HTMLInputElement | undefined = $state();
    let commandHistory = $state<string[]>([]);
    let historyIndex = $state(-1);

    // Show welcome message on mount
    $effect(() => {
        if (sessions.length === 0 && welcomeMessage) {
            const welcomeSession = $state({
                id: "welcome",
                command: "system",
                timestamp: new Date(),
                logs: [
                    {
                        text: welcomeMessage,
                        type: "info" as const,
                        timestamp: new Date(),
                    },
                ],
                status: "completed" as const,
                collapsed: false,
            });
            sessions.push(welcomeSession);
        }
    });

    // Auto-scroll effect
    $effect(() => {
        sessions.length;
        if (terminalRef) {
            requestAnimationFrame(() => {
                terminalRef!.scrollTop = terminalRef!.scrollHeight;
            });
        }
    });

    function handleSubmit(e: Event) {
        e.preventDefault();
        const command = inputValue.trim();
        if (!command) return;

        // Add to history
        commandHistory.push(command);
        historyIndex = -1;

        // Create new session with reactive properties
        const session = $state({
            id: crypto.randomUUID(),
            command,
            timestamp: new Date(),
            logs: [] as LogEntry[],
            status: "running" as "running" | "completed" | "error",
            collapsed: false,
        });

        sessions.push(session);

        // Create context without updateFn
        const context = new CommandContext(session);

        // Clear input immediately
        inputValue = "";

        // Execute command asynchronously
        onCommand(command, context);
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            if (historyIndex === -1) {
                historyIndex = commandHistory.length - 1;
            } else if (historyIndex > 0) {
                historyIndex--;
            }
            inputValue = commandHistory[historyIndex] || "";
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIndex === -1) return;
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                inputValue = commandHistory[historyIndex] || "";
            } else {
                historyIndex = -1;
                inputValue = "";
            }
        }
    }

    function toggleCollapse(sessionId: string) {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
            session.collapsed = !session.collapsed;
        }
    }

    function focusInput() {
        inputRef?.focus();
    }

    function formatTime(date: Date): string {
        return date.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }
</script>

<div
    class="terminal-container"
    style="max-height: {maxHeight}"
    bind:this={terminalRef}
    onclick={focusInput}
>
    <div class="terminal-content">
        {#each sessions as session (session.id)}
            <div class="command-session" class:collapsed={session.collapsed}>
                {#if session.command !== "system"}
                    <div
                        class="command-header"
                        onclick={() => toggleCollapse(session.id)}
                    >
                        <div class="command-info">
                            <span
                                class="status-icon"
                                class:running={session.status === "running"}
                                class:error={session.status === "error"}
                                class:completed={session.status === "completed"}
                            >
                                {#if session.status === "running"}
                                    <span class="spinner"></span>
                                {:else if session.status === "error"}
                                    ✕
                                {:else}
                                    ✓
                                {/if}
                            </span>
                            <span class="command-text">$ {session.command}</span
                            >
                            <span class="timestamp"
                                >{formatTime(session.timestamp)}</span
                            >
                        </div>
                        <span class="collapse-icon">
                            {session.collapsed ? "▶" : "▼"}
                        </span>
                    </div>
                {/if}

                {#if !session.collapsed}
                    <div class="logs-container">
                        {#each session.logs as log}
                            <div class="log-line {log.type}">
                                <span class="log-text">{log.text}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>

    <form onsubmit={handleSubmit} class="input-area">
        <span class="prompt">$</span>
        <input
            bind:this={inputRef}
            bind:value={inputValue}
            onkeydown={handleKeyDown}
            type="text"
            autocomplete="off"
            spellcheck="false"
            class="terminal-input"
            aria-label="Terminal Input"
            placeholder="Enter command..."
        />
    </form>
</div>

<style>
    .terminal-container {
        background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
        color: #e4e4e7;
        font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        cursor: text;
        position: relative;
    }

    .terminal-container::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 32px;
        background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05) 0%,
            transparent 100%
        );
        pointer-events: none;
    }

    .terminal-content {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
        padding-bottom: 0.5rem;
        scrollbar-width: thin;
        scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
    }

    .terminal-content::-webkit-scrollbar {
        width: 8px;
    }

    .terminal-content::-webkit-scrollbar-track {
        background: transparent;
    }

    .terminal-content::-webkit-scrollbar-thumb {
        background: rgba(139, 92, 246, 0.3);
        border-radius: 4px;
    }

    .terminal-content::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 92, 246, 0.5);
    }

    .command-session {
        margin-bottom: 1.5rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        overflow: hidden;
        transition: all 0.2s ease;
    }

    .command-session:hover {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(139, 92, 246, 0.2);
    }

    .command-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: rgba(0, 0, 0, 0.2);
        cursor: pointer;
        user-select: none;
        transition: background 0.2s ease;
    }

    .command-header:hover {
        background: rgba(0, 0, 0, 0.3);
    }

    .command-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    .status-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
    }

    .status-icon.running {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
    }

    .status-icon.completed {
        background: rgba(34, 197, 94, 0.2);
        color: #4ade80;
    }

    .status-icon.error {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
    }

    .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(96, 165, 250, 0.3);
        border-top-color: #60a5fa;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .command-text {
        color: #a78bfa;
        font-weight: 500;
        flex: 1;
    }

    .timestamp {
        color: #71717a;
        font-size: 0.875rem;
    }

    .collapse-icon {
        color: #71717a;
        font-size: 0.75rem;
        transition: transform 0.2s ease;
    }

    .collapsed .collapse-icon {
        transform: rotate(0deg);
    }

    .logs-container {
        padding: 1rem;
        padding-top: 0.5rem;
    }

    .log-line {
        margin-bottom: 0.5rem;
        line-height: 1.6;
        padding-left: 1.5rem;
        position: relative;
        word-break: break-word;
    }

    .log-line::before {
        content: "•";
        position: absolute;
        left: 0.5rem;
        opacity: 0.5;
    }

    .log-line.info {
        color: #93c5fd;
    }

    .log-line.info::before {
        color: #60a5fa;
    }

    .log-line.success {
        color: #86efac;
    }

    .log-line.success::before {
        color: #4ade80;
    }

    .log-line.error {
        color: #fca5a5;
    }

    .log-line.error::before {
        color: #f87171;
    }

    .log-line.warning {
        color: #fcd34d;
    }

    .log-line.warning::before {
        color: #fbbf24;
    }

    .input-area {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        background: rgba(0, 0, 0, 0.3);
        border-top: 1px solid rgba(139, 92, 246, 0.2);
    }

    .prompt {
        color: #8b5cf6;
        font-weight: bold;
        font-size: 1.125rem;
        user-select: none;
    }

    .terminal-input {
        flex: 1;
        background: transparent;
        border: none;
        color: #e4e4e7;
        font-family: inherit;
        font-size: 0.9375rem;
        outline: none;
        padding: 0;
        margin: 0;
    }

    .terminal-input::placeholder {
        color: #52525b;
        opacity: 1;
    }

    .terminal-input:focus::placeholder {
        opacity: 0.5;
    }
</style>
