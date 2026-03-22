import { EditorView } from '@codemirror/view';

export const editorTheme = EditorView.theme({
    '&': {
        flex: '1',
        height: '100%',
        background: 'transparent',
        fontSize: '0.875rem',
        color: 'var(--foreground)',
    },
    '.cm-content': {
        padding: '5vh 1rem 7vh 1rem',
        caretColor: 'var(--foreground)',
        color: 'var(--foreground)',
        lineHeight: '1.625',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    '.cm-line': {
        padding: '0',
        color: 'var(--foreground)',
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--foreground)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(99,102,241,0.35)',
    },
    '.cm-focused': {
        outline: 'none',
    },
    '&.cm-focused': {
        outline: 'none',
    },
    '.cm-scroller': {
        overflowY: 'auto',
        fontFamily: 'inherit',
    },
    '.cm-placeholder': {
        color: 'var(--muted-foreground)',
        opacity: '0.3',
    },
    '.cm-gutters': {
        display: 'none',
    },
    '.cm-activeLineGutter': {
        display: 'none',
    },
    '.cm-activeLine': {
        backgroundColor: 'transparent',
    },
});
