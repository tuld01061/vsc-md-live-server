// Browser bundle for the in-browser editor. esbuild bundles CodeMirror 6 (a single,
// de-duplicated @codemirror/state instance) and markdown-it into out/editor.js, which
// the server serves at /__mdls__/editor.js. This avoids loading CodeMirror from a CDN,
// which is unreliable (esm.sh cold-builds slowly; jsDelivr +esm ships duplicate
// @codemirror/state copies that CodeMirror rejects).
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import {
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import MarkdownIt from 'markdown-it';

export interface EditorHandle {
  getValue(): string;
  setValue(text: string): void;
  setDark(dark: boolean): void;
  focus(): void;
}

interface CreateOptions {
  dark: boolean;
  doc: string;
  onChange: () => void;
}

function createEditor(parent: HTMLElement, opts: CreateOptions): EditorHandle {
  const themeCompartment = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        markdown(),
        themeCompartment.of(opts.dark ? oneDark : []),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange();
        }),
      ],
    }),
  });
  return {
    getValue: () => view.state.doc.toString(),
    setValue: (text: string) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
    setDark: (dark: boolean) =>
      view.dispatch({ effects: themeCompartment.reconfigure(dark ? oneDark : []) }),
    focus: () => view.focus(),
  };
}

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

(window as unknown as { __MDLS_EDITOR__: unknown }).__MDLS_EDITOR__ = {
  createEditor,
  renderMarkdown: (text: string): string => md.render(text),
};
