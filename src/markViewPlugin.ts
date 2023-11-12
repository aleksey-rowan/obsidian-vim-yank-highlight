import { RangeSetBuilder } from "@codemirror/state";
import {
    PluginValue,
    DecorationSet,
    EditorView,
    ViewUpdate,
    Decoration,
    PluginSpec,
    ViewPlugin,
} from "@codemirror/view";

import { longestCommonSubstring } from "./util";

export class MarkViewPlugin implements PluginValue {
    decorations: DecorationSet;
    yankText: string | null;
    cursorHead: number | null;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate | EditorView) {
        if (update instanceof EditorView) {
            this.decorations = this.buildDecorations(update);
            update.dispatch();
        } else if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    public setYankText(value: string | null, view: EditorView): MarkViewPlugin {
        this.cleanYankText(view);
        this.yankText = value;

        this.update(view);

        return this;
    }

    public cleanYankText(view: EditorView): MarkViewPlugin {
        this.yankText = null;

        this.update(view);

        return this;
    }

    destroy() {}

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        this.cursorHead = null;

        // if there's no yank text or the document is empty,
        // there's nothing to decorate
        if (!this.yankText || view.state.doc.length === 0) {
            return builder.finish();
        }

        // use the viewport instead of visibleLines since
        // yank will copy folded text as well and visible
        // lines filter out folded text
        const viewport: { from: number; to: number } = view.viewport;
        const visibleText: string = view.state.sliceDoc(
            viewport.from,
            viewport.to
        );

        // find the longest common substring between the visible text and the yank text
        const visibleYankText = longestCommonSubstring(
            visibleText,
            this.yankText
        );

        // get the position of the yanked text to render the highligh on
        const yankPosition = this.getSubstringPosition(
            view,
            visibleText,
            visibleYankText
        );

        // the from and to indexes are relative to the viewport
        const from = viewport.from + yankPosition;
        const to = from + visibleYankText.length;

        builder.add(from, to, Decoration.mark({ class: "ovy-highlight" }));

        return builder.finish();
    }

    /**
     * Returns the position of the supplied substring in the supplied text
     * relative to the cursor postion.
     *
     * @param view
     * @param text
     * @param substring
     * @returns
     */
    private getSubstringPosition(
        view: EditorView,
        text: string,
        substring: string
    ) {
        // store the current cursort head; it will persist until the yank is changed
        // otherwise, if the cursor moves and the document is editing, the highlight won't be accurate anymore
        this.cursorHead = this.cursorHead || view.state.selection.main.head;

        // find the closest location of the "visibleYankText" to the cursor
        // this help to highlight the proper yank pieces instead of other occurrences
        let currentIndex = text.indexOf(substring);
        while (currentIndex !== -1) {
            // the cursor must be inside the yank most of the times
            if (
                currentIndex <= this.cursorHead &&
                this.cursorHead <= currentIndex + substring.length
            ) {
                break;
            } else if (currentIndex > this.cursorHead) {
                // commands like `yi(` can yank text that's not exactly under the cursro but, down the line
                // in this example, "two" will be yanked on `yi(`
                // (one) text <cursor> text (two)
                break;
            }

            currentIndex = text.indexOf(substring, currentIndex + 1);
        }
        return currentIndex;
    }
}

const pluginSpec: PluginSpec<MarkViewPlugin> = {
    decorations: (value: MarkViewPlugin) => value.decorations,
};

export const markViewPlugin = ViewPlugin.fromClass(MarkViewPlugin, pluginSpec);
