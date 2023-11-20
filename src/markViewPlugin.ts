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
import { PilotViewPlugin, pilotViewPlugin } from "./pilotViewPlugin";

/* The `MarkViewPlugin` class is a TypeScript class that represents a plugin for marking and
highlighting text in an editor view. */
export class MarkViewPlugin implements PluginValue {
    decorations: DecorationSet;
    yankText: string | null;
    cursorHead: number | null;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    /**
     * The `update` function updates the decorations in the editor view based on the provided
     * `ViewUpdate` or `EditorView` object.
     * @param {ViewUpdate | EditorView} update - The `update` parameter can be of type `ViewUpdate` or
     * `EditorView`. It represents an update to the editor view or document.
     */
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

    /* one idea is to at each line break wrap the first character on the line into
    a separate test decoration mark that doesn't do anything. Then to query all the marks
    and get the height of the line from the test mark and apply the needed padding
    to the following marks up until the next test mark. This will ensure that
    different lines that might have differnet heights (like headers and what not)
    have proper padding on them. */

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        // reset the cursor head
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

        const pilotPlugin = view.plugin<PilotViewPlugin>(pilotViewPlugin);
        if (!pilotPlugin) return builder.finish();

        // the from and to indexes are relative to the viewport
        const from = viewport.from + yankPosition;
        // const to = from + visibleYankText.length;

        const lineRanges = pilotPlugin.buildDecorations(
            view,
            visibleYankText,
            from
        );
        // oh boy, if this `buildDecorations` function is called during a proper update
        // like when the editor changes, calling dispatch again will crush the plugin
        // but without updaing the pilot marks, I can't get the padding right
        // what if I go back to a single mark plugin? no, that wouldn't work as well
        // setting padding fully manually will be lost on the next update and would have to be recalculated
        // hm, maybe
        // wow, such a rabit hole
        // view.dispatch();

        const lineElements = document.querySelectorAll(
            ".cm-line:has(.ovy-standard)"
        );
        if (lineElements.length !== lineRanges.length / 2)
            return builder.finish();

        // console.log(highlightLineElements.length, lineRanges.length / 2);

        for (let i = 0; i < lineRanges.length; i += 2) {
            const lineElement = lineElements[i / 2];
            const lineHeight = parseFloat(
                window.getComputedStyle(lineElement).lineHeight
            );
            const paddingValue =
                (lineHeight -
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    lineElement
                        .querySelector<HTMLElement>(".ovy-standard")!
                        .getBoundingClientRect().height) /
                2;

            // console.log(
            //     lineElement.clientHeight,
            //     lineElement.querySelector<HTMLElement>(".ovy-standard")!
            //         .offsetHeight
            // );
            const [start, end] = [lineRanges[i], lineRanges[i + 1]];
            builder.add(
                start,
                end,
                Decoration.mark({
                    class: "ovy-highlight",
                    attributes: {
                        style: `padding: ${paddingValue}px 0`,
                    },
                })
            );
        }

        // builder.add(from, to, Decoration.mark({ class: "ovy-highlight" }));

        return builder.finish();
    }

    /**
     * The function `getSubstringPosition` finds the position of a substring within a given text,
     * taking into account the current cursor position.
     * @param {EditorView} view - The `view` parameter is an instance of the `EditorView` class, which
     * represents the current state of the editor view. It provides methods and properties to interact
     * with the editor.
     * @param {string} text - The `text` parameter is a string that represents the entire text content
     * of the editor view. It is the text in which we want to find the position of a substring.
     * @param {string} substring - The `substring` parameter is a string that represents the text you
     * want to find within the `text` parameter. It is the portion of the `text` that you want to
     * locate the position of.
     * @returns the position of the closest occurrence of the substring within the given text.
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
