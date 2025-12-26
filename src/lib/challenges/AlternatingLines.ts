// lib/challenges/AlternatingLines.ts
import { Challenge, type ChallengeContext } from './base';
import * as monaco from 'monaco-editor';

export class AlternatingLines extends Challenge {
    private currentHostId: number | null = null;
    private currentLineNumber: number = 1;
    private players: number[] = [];
    private decorations: string[] = [];
    private previousContent: string = '';
    private isProcessingRelay: boolean = false;

    activate(): void {
        const myClientId = this.context.awareness.clientID;
        this.players = Array.from(this.context.awareness.getStates().keys());

        const model = this.context.editor.getModel();

        // Initialize: first player starts as host
        if (this.players.length > 0) {
            this.currentHostId = this.players[0];

            // Start at the last line if there's existing content, otherwise line 1
            if (model) {
                const lineCount = model.getLineCount();
                const lastLine = model.getLineContent(lineCount);
                // Position at the last line (where new content would be added)
                this.currentLineNumber = lineCount;
            } else {
                this.currentLineNumber = 1;
            }
        }

        this.previousContent = this.context.editor.getValue();
        this.updateEditorState();

        // Listen for content changes
        const contentDisposable = this.context.editor.onDidChangeModelContent((e) => {
            if (!this.isProcessingRelay) {
                this.handleContentChange(e);
            }
        });

        // Listen for cursor position changes
        const cursorDisposable = this.context.editor.onDidChangeCursorPosition((e) => {
            const myClientId = this.context.awareness.clientID;
            if (myClientId === this.currentHostId) {
                this.currentLineNumber = e.position.lineNumber;
                this.updateDecorations();
            }
        });

        this.disposables.push(contentDisposable, cursorDisposable);
        this.updateDecorations();
    }

    private updateEditorState(): void {
        const myClientId = this.context.awareness.clientID;
        const isHost = myClientId === this.currentHostId;

        // Set read-only state for non-hosts
        this.context.editor.updateOptions({ readOnly: !isHost });

        if (isHost) {
            // Position cursor at the end of current line
            const model = this.context.editor.getModel();
            if (model && this.currentLineNumber <= model.getLineCount()) {
                const lineLength = model.getLineMaxColumn(this.currentLineNumber);
                this.context.editor.setPosition({
                    lineNumber: this.currentLineNumber,
                    column: lineLength
                });
                this.context.editor.focus();
            }
        }

        this.updateDecorations();
    }

    private updateDecorations(): void {
        const model = this.context.editor.getModel();
        if (!model) return;

        const myClientId = this.context.awareness.clientID;
        const isHost = myClientId === this.currentHostId;
        const totalLines = model.getLineCount();
        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

        if (!isHost) {
            // Show all lines as locked for non-hosts
            if (totalLines > 0) {
                newDecorations.push({
                    range: new monaco.Range(1, 1, totalLines, model.getLineMaxColumn(totalLines)),
                    options: {
                        isWholeLine: true,
                        className: 'relay-locked-line',
                        glyphMarginClassName: 'relay-locked-glyph'
                    }
                });
            }
        } else {
            // For host: highlight editable line, show others as locked
            for (let i = 1; i <= totalLines; i++) {
                if (i === this.currentLineNumber) {
                    newDecorations.push({
                        range: new monaco.Range(i, 1, i, model.getLineMaxColumn(i)),
                        options: {
                            isWholeLine: true,
                            className: 'relay-active-line',
                            glyphMarginClassName: 'relay-active-glyph'
                        }
                    });
                } else {
                    newDecorations.push({
                        range: new monaco.Range(i, 1, i, model.getLineMaxColumn(i)),
                        options: {
                            isWholeLine: true,
                            className: 'relay-locked-line'
                        }
                    });
                }
            }
        }

        this.decorations = this.context.editor.deltaDecorations(
            this.decorations,
            newDecorations
        );
    }

    private handleContentChange(e: monaco.editor.IModelContentChangedEvent): void {
        const myClientId = this.context.awareness.clientID;

        // Only the host should process changes
        if (myClientId !== this.currentHostId) return;

        const model = this.context.editor.getModel();
        if (!model) return;

        for (const change of e.changes) {
            // Check if Enter was pressed (newline added)
            if (change.text.includes('\n')) {
                this.passRelayToNext();
                return;
            }

            // Check if line was deleted (backspace on empty line)
            // This occurs when the change range spans multiple lines with empty text
            const rangeSpansLines = change.range.startLineNumber < change.range.endLineNumber;
            if (rangeSpansLines && change.text === '') {
                this.passRelayToPrevious();
                return;
            }

            // Check if edit is outside the current line - revert it
            const editedCurrentLineOnly =
                change.range.startLineNumber === this.currentLineNumber &&
                change.range.endLineNumber === this.currentLineNumber;

            if (!editedCurrentLineOnly) {
                // Restore previous content to prevent editing other lines
                this.isProcessingRelay = true;
                model.setValue(this.previousContent);
                // Restore cursor position
                const lineLength = model.getLineMaxColumn(this.currentLineNumber);
                this.context.editor.setPosition({
                    lineNumber: this.currentLineNumber,
                    column: lineLength
                });
                setTimeout(() => {
                    this.isProcessingRelay = false;
                }, 50);
                return;
            }
        }

        // Store current content for potential revert
        this.previousContent = model.getValue();
        this.updateDecorations();
    }

    private passRelayToNext(): void {
        if (this.players.length === 0) return;

        this.isProcessingRelay = true;

        const currentIndex = this.players.indexOf(this.currentHostId!);
        const nextIndex = (currentIndex + 1) % this.players.length;
        this.currentHostId = this.players[nextIndex];

        const model = this.context.editor.getModel();
        if (model) {
            // New host gets the last line (the newly created one)
            this.currentLineNumber = model.getLineCount();
        }

        this.previousContent = this.context.editor.getValue();
        this.updateEditorState();

        setTimeout(() => {
            this.isProcessingRelay = false;
        }, 100);
    }

    private passRelayToPrevious(): void {
        if (this.players.length === 0) return;

        this.isProcessingRelay = true;

        const currentIndex = this.players.indexOf(this.currentHostId!);
        const prevIndex = (currentIndex - 1 + this.players.length) % this.players.length;
        this.currentHostId = this.players[prevIndex];

        const model = this.context.editor.getModel();
        if (model) {
            // Previous host gets the last line (or current line if at boundary)
            this.currentLineNumber = Math.max(1, model.getLineCount());
        }

        this.previousContent = this.context.editor.getValue();
        this.updateEditorState();

        setTimeout(() => {
            this.isProcessingRelay = false;
        }, 100);
    }

    getConfig() {
        return {
            currentHost: this.currentHostId,
            currentLine: this.currentLineNumber,
            players: this.players
        };
    }

    getName() {
        return 'Relay Race';
    }

    getDescription() {
        return 'Players alternate editing lines. Press Enter to pass relay forward, backspace on empty line to pass backward.';
    }
}