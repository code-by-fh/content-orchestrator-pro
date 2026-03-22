/**
 * Attempts to repair a truncated JSON string by closing open quotes, brackets, and braces.
 */
export function repairTruncatedJson(json: string): string {
    let repaired = json.trim();

    if (repaired.endsWith('}')) {
        return repaired;
    }

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"') {
            if (inString) {
                stack.pop();
                inString = false;
            } else {
                stack.push('"');
                inString = true;
            }
            continue;
        }

        if (inString) continue;

        if (char === '{') {
            stack.push('}');
        } else if (char === '[') {
            stack.push(']');
        } else if (char === '}') {
            if (stack[stack.length - 1] === '}') {
                stack.pop();
            }
        } else if (char === ']') {
            if (stack[stack.length - 1] === ']') {
                stack.pop();
            }
        }
    }

    if (inString) {
        repaired += '"';
    }

    while (stack.length > 0) {
        const closer = stack.pop();
        if (closer !== '"') {
            repaired += closer;
        }
    }

    return repaired;
}
