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
        console.log('[AlternatingLines] ===== ACTIVATE =====');
        const myClientId = this.context.awareness.clientID;
        console.log('[AlternatingLines] My client ID:', myClientId);

        this.players = Array.from(this.context.awareness.getStates().keys());
        console.log('[AlternatingLines] Players:', this.players);

        const model = this.context.editor.getModel();
        console.log('[AlternatingLines] Model exists:', !!model);

        // Initialize: first player starts as host
        if (this.players.length > 0) {
            this.currentHostId = this.players[0];
            console.log('[AlternatingLines] Initial host set to:', this.currentHostId);

            // Start at the last line if there's existing content, otherwise line 1
            if (model) {
                const lineCount = model.getLineCount();
                const lastLine = model.getLineContent(lineCount);
                console.log('[AlternatingLines] Model line count:', lineCount);
                console.log('[AlternatingLines] Last line content:', JSON.stringify(lastLine));
                // Position at the last line (where new content would be added)
                this.currentLineNumber = lineCount;
            } else {
                this.currentLineNumber = 1;
            }
            console.log('[AlternatingLines] Initial current line:', this.currentLineNumber);
        } else {
            console.log('[AlternatingLines] WARNING: No players found!');
        }

        this.previousContent = this.context.editor.getValue();
        console.log('[AlternatingLines] Initial content length:', this.previousContent.length);

        this.updateEditorState();

        // Listen for content changes
        const contentDisposable = this.context.editor.onDidChangeModelContent((e) => {
            console.log('[AlternatingLines] onDidChangeModelContent fired, isProcessingRelay:', this.isProcessingRelay);
            if (!this.isProcessingRelay) {
                this.handleContentChange(e);
            } else {
                console.log('[AlternatingLines] Skipping content change handler (processing relay)');
            }
        });

        // Listen for cursor position changes
        const cursorDisposable = this.context.editor.onDidChangeCursorPosition((e) => {
            const myClientId = this.context.awareness.clientID;
            console.log('[AlternatingLines] Cursor position changed to line:', e.position.lineNumber, 'col:', e.position.column);
            console.log('[AlternatingLines] Am I host?', myClientId === this.currentHostId, '(my ID:', myClientId, 'host ID:', this.currentHostId, ')');

            if (myClientId === this.currentHostId) {
                const oldLine = this.currentLineNumber;
                this.currentLineNumber = e.position.lineNumber;
                console.log('[AlternatingLines] Updated current line from', oldLine, 'to', this.currentLineNumber);
                this.updateDecorations();
            }
        });

        this.disposables.push(contentDisposable, cursorDisposable);
        this.updateDecorations();
        console.log('[AlternatingLines] ===== ACTIVATE COMPLETE =====');
    }

    private updateEditorState(): void {
        console.log('[AlternatingLines] --- updateEditorState START ---');
        const myClientId = this.context.awareness.clientID;
        const isHost = myClientId === this.currentHostId;
        console.log('[AlternatingLines] My ID:', myClientId, 'Host ID:', this.currentHostId, 'Am I host?', isHost);

        // Set read-only state for non-hosts
        console.log('[AlternatingLines] Setting readOnly to:', !isHost);
        this.context.editor.updateOptions({ readOnly: !isHost });

        if (isHost) {
            // Position cursor at the end of current line
            const model = this.context.editor.getModel();
            if (model && this.currentLineNumber <= model.getLineCount()) {
                const lineLength = model.getLineMaxColumn(this.currentLineNumber);
                console.log('[AlternatingLines] Positioning cursor at line', this.currentLineNumber, 'column', lineLength);
                this.context.editor.setPosition({
                    lineNumber: this.currentLineNumber,
                    column: lineLength
                });
                this.context.editor.focus();
            } else {
                console.log('[AlternatingLines] WARNING: Cannot position cursor - model:', !!model, 'currentLine:', this.currentLineNumber, 'lineCount:', model?.getLineCount());
            }
        }

        this.updateDecorations();
        console.log('[AlternatingLines] --- updateEditorState END ---');
    }

    private updateDecorations(): void {
        console.log('[AlternatingLines] --- updateDecorations START ---');
        const model = this.context.editor.getModel();
        if (!model) {
            console.log('[AlternatingLines] No model, skipping decorations');
            return;
        }

        const myClientId = this.context.awareness.clientID;
        const isHost = myClientId === this.currentHostId;
        const totalLines = model.getLineCount();
        console.log('[AlternatingLines] Total lines:', totalLines, 'Am I host?', isHost, 'Current line:', this.currentLineNumber);

        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

        if (!isHost) {
            console.log('[AlternatingLines] Creating locked decoration for all lines');
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
            console.log('[AlternatingLines] Creating decorations - active line:', this.currentLineNumber);
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

        console.log('[AlternatingLines] Created', newDecorations.length, 'decorations');
        this.decorations = this.context.editor.deltaDecorations(
            this.decorations,
            newDecorations
        );
        console.log('[AlternatingLines] --- updateDecorations END ---');
    }

    private handleContentChange(e: monaco.editor.IModelContentChangedEvent): void {
        console.log('[AlternatingLines] ##### handleContentChange START #####');
        const myClientId = this.context.awareness.clientID;
        console.log('[AlternatingLines] My ID:', myClientId, 'Host ID:', this.currentHostId);

        // Only the host should process changes
        if (myClientId !== this.currentHostId) {
            console.log('[AlternatingLines] Not host, ignoring change');
            return;
        }

        const model = this.context.editor.getModel();
        if (!model) {
            console.log('[AlternatingLines] No model, returning');
            return;
        }

        console.log('[AlternatingLines] Number of changes:', e.changes.length);

        for (const change of e.changes) {
            console.log('[AlternatingLines] Change:', {
                text: JSON.stringify(change.text),
                range: {
                    startLine: change.range.startLineNumber,
                    startCol: change.range.startColumn,
                    endLine: change.range.endLineNumber,
                    endCol: change.range.endColumn
                }
            });

            // Check if Enter was pressed (newline added)
            const hasNewline = change.text.includes('\n');
            console.log('[AlternatingLines] Contains newline?', hasNewline);
            if (hasNewline) {
                console.log('[AlternatingLines] NEWLINE DETECTED - passing relay to next');
                this.passRelayToNext();
                return;
            }

            // Check if line was deleted (backspace on empty line)
            // This occurs when the change range spans multiple lines with empty text
            const rangeSpansLines = change.range.startLineNumber < change.range.endLineNumber;
            console.log('[AlternatingLines] Range spans lines?', rangeSpansLines);
            console.log('[AlternatingLines] Text is empty?', change.text === '');

            if (rangeSpansLines && change.text === '') {
                console.log('[AlternatingLines] LINE DELETE DETECTED - passing relay to previous');
                this.passRelayToPrevious();
                return;
            }

            // Check if edit is outside the current line - revert it
            const editedCurrentLineOnly =
                change.range.startLineNumber === this.currentLineNumber &&
                change.range.endLineNumber === this.currentLineNumber;

            console.log('[AlternatingLines] Edit is on current line only?', editedCurrentLineOnly);
            console.log('[AlternatingLines] Current line:', this.currentLineNumber);

            if (!editedCurrentLineOnly) {
                console.log('[AlternatingLines] INVALID EDIT - reverting to previous content');
                // Restore previous content to prevent editing other lines
                this.isProcessingRelay = true;
                model.setValue(this.previousContent);
                // Restore cursor position
                const lineLength = model.getLineMaxColumn(this.currentLineNumber);
                console.log('[AlternatingLines] Restoring cursor to line', this.currentLineNumber, 'column', lineLength);
                this.context.editor.setPosition({
                    lineNumber: this.currentLineNumber,
                    column: lineLength
                });
                setTimeout(() => {
                    console.log('[AlternatingLines] Revert complete, clearing isProcessingRelay flag');
                    this.isProcessingRelay = false;
                }, 50);
                return;
            }
        }

        // Store current content for potential revert
        const newContent = model.getValue();
        console.log('[AlternatingLines] Storing new content (length:', newContent.length, ')');
        this.previousContent = newContent;
        this.updateDecorations();
        console.log('[AlternatingLines] ##### handleContentChange END #####');
    }

    private passRelayToNext(): void {
        console.log('[AlternatingLines] >>>>> passRelayToNext START >>>>>');
        if (this.players.length === 0) {
            console.log('[AlternatingLines] No players, aborting');
            return;
        }

        this.isProcessingRelay = true;
        console.log('[AlternatingLines] Set isProcessingRelay = true');

        const currentIndex = this.players.indexOf(this.currentHostId!);
        const nextIndex = (currentIndex + 1) % this.players.length;
        const oldHostId = this.currentHostId;
        this.currentHostId = this.players[nextIndex];

        console.log('[AlternatingLines] Old host:', oldHostId, 'index:', currentIndex);
        console.log('[AlternatingLines] New host:', this.currentHostId, 'index:', nextIndex);
        console.log('[AlternatingLines] Players:', this.players);

        const model = this.context.editor.getModel();
        if (model) {
            const oldLine = this.currentLineNumber;
            // New host gets the last line (the newly created one)
            this.currentLineNumber = model.getLineCount();
            console.log('[AlternatingLines] Line changed from', oldLine, 'to', this.currentLineNumber);
        } else {
            console.log('[AlternatingLines] WARNING: No model!');
        }

        this.previousContent = this.context.editor.getValue();
        console.log('[AlternatingLines] Updated previousContent (length:', this.previousContent.length, ')');

        this.updateEditorState();

        setTimeout(() => {
            console.log('[AlternatingLines] Clearing isProcessingRelay flag');
            this.isProcessingRelay = false;
            console.log('[AlternatingLines] >>>>> passRelayToNext END >>>>>');
        }, 100);
    }

    private passRelayToPrevious(): void {
        console.log('[AlternatingLines] <<<<< passRelayToPrevious START <<<<<');
        if (this.players.length === 0) {
            console.log('[AlternatingLines] No players, aborting');
            return;
        }

        this.isProcessingRelay = true;
        console.log('[AlternatingLines] Set isProcessingRelay = true');

        const currentIndex = this.players.indexOf(this.currentHostId!);
        const prevIndex = (currentIndex - 1 + this.players.length) % this.players.length;
        const oldHostId = this.currentHostId;
        this.currentHostId = this.players[prevIndex];

        console.log('[AlternatingLines] Old host:', oldHostId, 'index:', currentIndex);
        console.log('[AlternatingLines] New host:', this.currentHostId, 'index:', prevIndex);
        console.log('[AlternatingLines] Players:', this.players);

        const model = this.context.editor.getModel();
        if (model) {
            const oldLine = this.currentLineNumber;
            // Previous host gets the last line (or current line if at boundary)
            this.currentLineNumber = Math.max(1, model.getLineCount());
            console.log('[AlternatingLines] Line changed from', oldLine, 'to', this.currentLineNumber);
        } else {
            console.log('[AlternatingLines] WARNING: No model!');
        }

        this.previousContent = this.context.editor.getValue();
        console.log('[AlternatingLines] Updated previousContent (length:', this.previousContent.length, ')');

        this.updateEditorState();

        setTimeout(() => {
            console.log('[AlternatingLines] Clearing isProcessingRelay flag');
            this.isProcessingRelay = false;
            console.log('[AlternatingLines] <<<<< passRelayToPrevious END <<<<<');
        }, 100);
    }

    getConfig() {
        const config = {
            currentHost: this.currentHostId,
            currentLine: this.currentLineNumber,
            players: this.players
        };
        console.log('[AlternatingLines] getConfig called:', config);
        return config;
    }

    getName() {
        return 'Relay Race';
    }

    getDescription() {
        return 'Players alternate editing lines. Press Enter to pass relay forward, backspace on empty line to pass backward.';
    }
}