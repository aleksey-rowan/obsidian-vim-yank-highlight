import { MarkdownView } from "obsidian";
import {
    Editor as CMEditor,
    EditorEventMap as CMEditorEventMap,
} from "codemirror";

/* The code you provided is written in TypeScript and defines various interfaces and classes used in
the VimYankHighlightPlugin. Here's a breakdown of what each part does: */
export const enum vimEvents {
    keypress = "vim-keypress",
    commanddone = "vim-command-done",
}

declare global {
    interface Window {
        CodeMirrorAdapter: {
            Vim: Vim;
        };
    }
}

/* The `interface CMEditorEventMapExtended` is extending the `CMEditorEventMap` interface from the
`codemirror` library. It adds two additional event types: `vimEvents.keypress` and
`vimEvents.commanddone`. These events have a different signature compared to the regular events in
`CMEditorEventMap` because they don't include the instance of the editor as the first argument. The
extended interface specifies the event handlers for these two events. */
interface CMEditorEventMapExtended extends CMEditorEventMap {
    [vimEvents.keypress]: (vimkey: string) => void;
    [vimEvents.commanddone]: (vimkey: string) => void;
}

interface CMEditorExtended extends CMEditor {
    on<T extends keyof CMEditorEventMapExtended>(
        eventName: T,
        handler: CMEditorEventMapExtended[T]
    ): void;
    off<T extends keyof CMEditorEventMapExtended>(
        eventName: T,
        handler: CMEditorEventMapExtended[T]
    ): void;
}

export abstract class MarkdownViewExtended extends MarkdownView {
    editMode: {
        editor: {
            cm: {
                cm: CMEditorExtended;
            };
        };
    };
}

export interface Vim {
    getRegisterController(): RegisterController;
}

interface RegisterController {
    getRegister(name: string): { keyBuffer: string[] };
}
