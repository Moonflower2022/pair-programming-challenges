import { walkAst } from '$lib/engine';
import { Challenge, type ChallengeContext } from './base';
import * as monaco from 'monaco-editor';

interface ViolationRule {
    nodeTypes: string[];
    message: string;
    enabled: boolean;
}

interface NoForLoopsConfig {
    rules: {
        forLoops: ViolationRule;
        whileLoops: ViolationRule;
        comprehensions: ViolationRule;
    };
}

export class NoForLoops extends Challenge {
    private decorations: string[] = [];
    private config: NoForLoopsConfig = {
        rules: {
            forLoops: {
                nodeTypes: ['For', 'AsyncFor'],
                message: '⚠ For loops are not allowed',
                enabled: true
            },
            whileLoops: {
                nodeTypes: ['While'],
                message: '⚠ While loops are not allowed',
                enabled: true
            },
            comprehensions: {
                nodeTypes: ['ListComp', 'SetComp', 'DictComp', 'GeneratorExp'],
                message: '⚠ Comprehensions are for loops in disguise',
                enabled: true
            },
        }
    };

    activate(): void {
        const disposable = this.context.editor.onDidChangeModelContent(async () => {
            await this.checkViolations();
        });

        this.disposables.push(disposable);
    }

    deactivate(): void {
        super.deactivate();
    }

    private async checkViolations(): Promise<void> {
        const content = this.context.editor.getValue();
        const ast = await this.context.engine.parse(content);
        const model = this.context.editor.getModel();

        if (!model) return;

        const violations: Array<{ node: any; message: string }> = [];

        // Check all nodes against active rules
        for (const node of walkAst(ast)) {
            const violation = this.checkNode(node, ast);
            if (violation) {
                violations.push({ node, message: violation });
            }
        }

        // Convert violations to decorations
        const newDecorations = violations.flatMap(v =>
            this.createViolationDecorations(v.node, v.message, model)
        );

        this.decorations = this.context.editor.deltaDecorations(
            this.decorations,
            newDecorations
        );
    }

    private checkNode(node: any, ast: any): string | null {
        const nodeType = node.type();

        // Check simple node type rules
        for (const rule of Object.values(this.config.rules)) {
            if (rule.enabled && rule.nodeTypes.includes(nodeType)) {
                return rule.message;
            }
        }

        return null;
    }

    private createViolationDecorations(
        node: any,
        message: string,
        model: monaco.editor.ITextModel
    ): monaco.editor.IModelDeltaDecoration[] {
        const pos = node.position();
        if (!pos) return [];

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        // Full range highlighting
        decorations.push({
            range: new monaco.Range(
                pos.start.line,
                pos.start.column,
                pos.end?.line ?? pos.start.line,
                (pos.end?.column ?? pos.start.column) + 1
            ),
            options: {
                isWholeLine: true,
                className: 'error-line-highlight',
                glyphMarginClassName: 'error-glyph'
            }
        });

        // Inline message on first line
        decorations.push({
            range: new monaco.Range(
                pos.start.line,
                pos.start.column,
                pos.start.line,
                model.getLineMaxColumn(pos.start.line)
            ),
            options: {
                after: {
                    content: ` ${message}`,
                    inlineClassName: 'inline-error-message'
                }
            }
        });

        return decorations;
    }

    // Public API for configuration
    public setRule(ruleName: keyof NoForLoopsConfig['rules'], enabled: boolean): void {
        if (this.config.rules[ruleName]) {
            this.config.rules[ruleName].enabled = enabled;
            this.checkViolations(); // Re-check immediately
        }
    }

    public setRuleMessage(ruleName: keyof NoForLoopsConfig['rules'], message: string): void {
        if (this.config.rules[ruleName]) {
            this.config.rules[ruleName].message = message;
        }
    }

    getConfig() {
        return this.config;
    }

    getName() {
        return 'No For Loops';
    }

    getDescription() {
        const enabledRules = Object.entries(this.config.rules)
            .filter(([_, rule]) => rule.enabled)
            .map(([name, _]) => name);

        return `No iteration allowed. Banned: ${enabledRules.join(', ')}`;
    }
}