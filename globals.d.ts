declare namespace KofeScript {
    type NamedArguments = import('/scripts/slash-commands/SlashCommand.js').NamedArguments;
    type NamedArgumentsCapture = import('/scripts/slash-commands/SlashCommand.js').NamedArgumentsCapture;
    type SlashCommandNamedArgumentAssignment = import('/scripts/slash-commands/SlashCommandNamedArgumentAssignment.js').SlashCommandNamedArgumentAssignment;

    type NamedArgumentAssignment = SlashCommandNamedArgumentAssignment & {
        start?: 0;
        end?: 0;
    }

    type WIEntry = {
        uid: number;
        world: string;
        comment: string;
        content: string;
        outletName: string;
        displayIndex: number;
        vectorized: boolean;
        constant: boolean;
    };

	type ExtensionSettingsMacros = {
		experimental_macro_engine: boolean;
		collapse_multiple_newlines: boolean;
	};

	type ExtensionSettings = {
		enabled: boolean;
		show_warnings: boolean;
		macros: ExtensionSettingsMacros;
		debug: boolean;
	};

	type HTMLTemplateGetOptions = {
        clone?: boolean;
    };
};