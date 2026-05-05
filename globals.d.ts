declare namespace KofeScript {
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