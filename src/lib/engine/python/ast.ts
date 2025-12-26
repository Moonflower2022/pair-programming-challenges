import type { AstNode, SourceRange } from "..";

export class PythonAstNode implements AstNode {
    private constructor(
        private contents: any
    ) { }

    static fromJson(json: any): PythonAstNode {
        return new PythonAstNode(json);
    }

    type(): string {
        return this.contents.type;
    }

    children(): AstNode[] {
        const result: AstNode[] = [];

        for (const value of Object.values(this.contents)) {
            // Single AST node
            if (value && typeof value === "object" && "type" in value && typeof value.type === "string") {
                result.push(PythonAstNode.fromJson(value));
                continue;
            }

            // Array of AST nodes
            if (Array.isArray(value)) {
                for (const item of value) {
                    if (item && typeof item === "object" && "type" in item && typeof item.type === "string") {
                        result.push(PythonAstNode.fromJson(item));
                    }
                }
            }
        }

        return result;
    }

    position(): SourceRange | null {
        if (typeof this.contents.lineno === "number" && typeof this.contents.col_offset === "number") {
            const start = {
                line: this.contents.lineno,
                column: this.contents.col_offset,
            };

            if (typeof this.contents.end_lineno === "number" && typeof this.contents.end_col_offset === "number") {
                return {
                    start,
                    end: {
                        line: this.contents.end_lineno,
                        column: this.contents.end_col_offset,
                    }
                };
            }

            return { start };
        }

        return null;
    }
}