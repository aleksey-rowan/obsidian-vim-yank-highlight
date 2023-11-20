import { RangeSetBuilder } from "@codemirror/state";
import {
    PluginValue,
    DecorationSet,
    EditorView,
    Decoration,
    PluginSpec,
    ViewPlugin,
} from "@codemirror/view";

export class PilotViewPlugin implements PluginValue {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.buildDecorations(view, "", 0);
    }

    buildDecorations(view: EditorView, visibleYankText: string, from: number) {
        const builder = new RangeSetBuilder<Decoration>();

        if (visibleYankText.length === 0) {
            this.decorations = builder.finish();
            return [];
        }
        const lineRanges: number[] = [from];

        builder.add(from, from + 1, Decoration.mark({ class: "ovy-standard" }));

        let match;
        const regex = /(?:\n)(.)/g;
        while ((match = regex.exec(visibleYankText)) !== null) {
            const fromBreak = from + match.index + 1;
            lineRanges.push(...[fromBreak - 1, fromBreak]);

            builder.add(
                fromBreak,
                fromBreak + 1,
                Decoration.mark({ class: "ovy-standard" })
            );
        }

        lineRanges.push(from + visibleYankText.length);

        this.decorations = builder.finish();

        return lineRanges;
    }
}

const pluginSpec: PluginSpec<PilotViewPlugin> = {
    decorations: (value: PilotViewPlugin) => value.decorations,
};

export const pilotViewPlugin = ViewPlugin.fromClass(
    PilotViewPlugin,
    pluginSpec
);
