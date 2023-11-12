import { MarkdownView, Plugin } from "obsidian";

import { EditorView } from "@codemirror/view";

import { MarkViewPlugin, markViewPlugin } from "./markViewPlugin";

const enum vimEvents {
    keypress = "vim-keypress",
    commanddone = "vim-command-done",
}

export default class VimYankHighlightPlugin extends Plugin {
    initialized: Boolean;

    vimCommand: string[] = [];
    vimCommandDone: Boolean = false;

    codeMirrorVimObject: any = null;
    timeoutHandle: NodeJS.Timeout;

    private get activeView(): MarkdownView | null {
        return this.app.workspace.getActiveViewOfType(MarkdownView);
    }

    private get activeEditor(): EditorView {
        return (</* { editor?: { cm: EditorView } } */ any>this.activeView!)
            .editor.cm;
    }

    // CodeMirror editor from the active view
    // the one you can set event listeners on
    private get codeMirror(): CodeMirror.Editor | null {
        return (this.activeView as any).editMode?.editor?.cm?.cm;
    }

    async onload() {
        this.registerEditorExtension([markViewPlugin]);

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", () => {
                if (!this.initialized) {
                    this.initialize();
                }
            })
        );
    }

    private initialize() {
        console.log("init");

        if (this.activeView && this.codeMirror) {
            this.codeMirrorVimObject = (window as any).CodeMirrorAdapter?.Vim;

            const cmV = this.codeMirror;

            cmV.off<any>(vimEvents.keypress, this.onVimKeypress.bind(this));
            cmV.on<any>(vimEvents.keypress, this.onVimKeypress.bind(this));
            cmV.off<any>(
                vimEvents.commanddone,
                this.onVimCommandDone.bind(this)
            );
            cmV.on<any>(
                vimEvents.commanddone,
                this.onVimCommandDone.bind(this)
            );
        }
    }

    // for some reason, done fires before keypress
    // and you need the next key after done to figure out the full command
    private onVimKeypress(vimKey: string) {
        // Push the key to the command
        this.vimCommand.push(vimKey);

        // Check if the command is done
        if (!this.vimCommandDone) {
            return;
        }

        // Log the command
        console.log("command done", this.vimCommand);

        if (this.vimCommand.contains("y")) {
            this.highlightYank();
        }

        this.vimCommandDone = false;
        this.vimCommand.splice(0, this.vimCommand.length);
    }

    highlightYank() {
        console.log("yank!");

        const yankRegister = this.codeMirrorVimObject
            .getRegisterController()
            .getRegister("yank");
        const currentYankBuffer: string = yankRegister.keyBuffer[0];

        const plugin = this.activeEditor.plugin(
            markViewPlugin
        ) as MarkViewPlugin;

        plugin.setYankText(currentYankBuffer, this.activeEditor);

        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = setTimeout(() => {
            plugin.cleanYankText(this.activeEditor);
        }, 3000);
    }

    private onVimCommandDone(reason: any) {
        this.vimCommandDone = true;
    }

    action() {}

    onunload() {}
}
