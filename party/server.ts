import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class Server implements Party.Server {
    // Timer state: when the timer started (server time), or null if not started
    timerStartedAt: number | null = null;

    constructor(readonly room: Party.Room) { }

    async onStart() {
        // Restore timer state from storage
        const stored = await this.room.storage.get<number>("timerStartedAt");
        if (stored !== undefined) {
            this.timerStartedAt = stored;
        }
    }

    onConnect(conn: Party.Connection) {
        return onConnect(conn, this.room);
    }

    async onMessage(message: string, sender: Party.Connection) {
        try {
            const data = JSON.parse(message);

            if (data.type === "getOrCreateTimer") {
                const clientTime = data.clientTime as number;
                const serverTime = Date.now();
                const isNewTimer = this.timerStartedAt === null;

                // Create timer if it doesn't exist
                if (isNewTimer) {
                    this.timerStartedAt = serverTime;
                    await this.room.storage.put("timerStartedAt", this.timerStartedAt);
                }

                // Broadcast to all clients with their individual offsets
                for (const conn of this.room.getConnections()) {
                    // For the sender, we know their offset
                    if (conn.id === sender.id) {
                        const offset = clientTime - serverTime;
                        conn.send(JSON.stringify({
                            type: "timerSync",
                            startedAt: this.timerStartedAt! + offset,
                        }));
                    } else if (isNewTimer) {
                        // For other clients, request their time to calculate offset
                        conn.send(JSON.stringify({
                            type: "timerStarted",
                            serverStartedAt: this.timerStartedAt,
                            serverTime: Date.now(),
                        }));
                    }
                }
            }

            if (data.type === "syncMyTimer") {
                // Client responding with their time for offset calculation
                if (this.timerStartedAt === null) return;

                const clientTime = data.clientTime as number;
                const serverTime = Date.now();
                const offset = clientTime - serverTime;

                sender.send(JSON.stringify({
                    type: "timerSync",
                    startedAt: this.timerStartedAt + offset,
                }));
            }

            if (data.type === "resetTimer") {
                this.timerStartedAt = null;
                await this.room.storage.delete("timerStartedAt");

                // Broadcast to all clients that timer was reset
                this.room.broadcast(JSON.stringify({
                    type: "timerReset",
                }));
            }
        } catch (e) {
            // Ignore non-JSON messages (likely y-partykit sync messages)
        }
    }
}
