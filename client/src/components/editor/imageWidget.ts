import { WidgetType, ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

function parseImageSrc(rawSrc: string): { cleanUrl: string; width: string; align: string } {
    const hashIdx = rawSrc.indexOf('#');
    if (hashIdx === -1) return { cleanUrl: rawSrc, width: '100%', align: 'center' };
    const fragment = rawSrc.slice(hashIdx + 1);
    const widthMatch = fragment.match(/width(\d+)/);
    const alignMatch = fragment.match(/(left|center|right)/);
    return {
        cleanUrl: rawSrc.slice(0, hashIdx),
        width: widthMatch ? `${widthMatch[1]}%` : '100%',
        align: alignMatch ? alignMatch[1] : 'center',
    };
}

function resolveUrl(src: string): string {
    if (!src || src.startsWith('http') || src.startsWith('//') || src.startsWith('blob:')) return src;
    const base = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? '';
    return `${base}${src}`;
}

class ImageWidget extends WidgetType {
    src: string;
    alt: string;
    width: string;
    align: string;

    constructor(src: string, alt: string, width: string, align: string) {
        super();
        this.src = src;
        this.alt = alt;
        this.width = width;
        this.align = align;
    }

    eq(other: ImageWidget) {
        return other.src === this.src && other.width === this.width && other.align === this.align;
    }

    toDOM() {
        const marginStyle: Record<string, string> = {
            left: 'margin-right:auto;margin-left:0;',
            center: 'margin-left:auto;margin-right:auto;',
            right: 'margin-left:auto;margin-right:0;',
        };

        // span is required for inline Decoration.replace; CSS makes it render as block
        const wrap = document.createElement('span');
        wrap.style.cssText =
            `display:block;width:${this.width};` +
            (marginStyle[this.align] ?? marginStyle.center) +
            'padding:16px 0;';

        const img = document.createElement('img');
        img.src = this.src;
        img.alt = this.alt;
        img.style.cssText =
            'width:100%;height:auto;display:block;' +
            'border-radius:12px;border:1px solid rgba(128,128,128,0.2);' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.15);';
        img.onerror = () => {
            img.style.display = 'none';
        };

        const urlLabel = document.createElement('span');
        urlLabel.textContent = `![${this.alt}](${this.src})`;
        urlLabel.style.cssText =
            'display:block;margin-top:4px;font-size:0.7rem;opacity:0.45;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
            'font-family:ui-monospace,monospace;';

        wrap.appendChild(img);
        wrap.appendChild(urlLabel);
        return wrap;
    }

    ignoreEvent() {
        return false;
    }
}

export const imageDecorationExtension = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.build(view);
        }

        update(u: ViewUpdate) {
            if (u.docChanged || u.selectionSet || u.viewportChanged) {
                this.decorations = this.build(u.view);
            }
        }

        build(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            const { doc, selection } = view.state;

            // Collect all lines the cursor(s) touch
            const cursorLines = new Set<number>();
            for (const r of selection.ranges) {
                const fromLine = doc.lineAt(r.from).number;
                const toLine = doc.lineAt(r.to).number;
                for (let n = fromLine; n <= toLine; n++) cursorLines.add(n);
            }

            for (const { from, to } of view.visibleRanges) {
                IMAGE_REGEX.lastIndex = 0;
                const text = doc.sliceString(from, to);
                let m: RegExpExecArray | null;

                while ((m = IMAGE_REGEX.exec(text)) !== null) {
                    const start = from + m.index;
                    const end = start + m[0].length;
                    const line = doc.lineAt(start).number;

                    // Show raw markdown when cursor is on this line
                    if (cursorLines.has(line)) continue;

                    const { cleanUrl, width, align } = parseImageSrc(m[2]);
                    // Skip empty URLs (e.g. upload placeholder ![Uploading...]())
                    if (!cleanUrl) continue;

                    const resolved = resolveUrl(cleanUrl);

                    builder.add(
                        start,
                        end,
                        Decoration.replace({
                            widget: new ImageWidget(resolved, m[1], width, align),
                            inclusive: false,
                        })
                    );
                }
            }

            return builder.finish();
        }
    },
    { decorations: (v) => v.decorations }
);
