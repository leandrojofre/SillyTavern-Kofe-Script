import { commonEnumProviders, enumIcons } from "../../../slash-commands/SlashCommandCommonEnumsProvider.js";
import { newWorldInfoEntryDefinition, newWorldInfoEntryTemplate, world_info_logic, world_info_position, world_names, worldInfoCache } from "../../../world-info.js";
import { enumTypes, SlashCommandEnumValue } from "../../../slash-commands/SlashCommandEnumValue.js";
import { SlashCommandClosure } from "../../../slash-commands/SlashCommandClosure.js";
import { SlashCommandExecutor } from "../../../slash-commands/SlashCommandExecutor.js";
import { MacroValueType } from "../../../macros/macro-system.js";

import { natsort } from "./public/bundle.min.js";

/** @typedef {KofeScript.ExtensionSettings} ExtensionSettings */

// * MARK:Extension variables

const context = () => SillyTavern.getContext();

const {
    saveSettingsDebounced,
    variables,
    extensionSettings: extension_settings,
    ARGUMENT_TYPE,
    powerUserSettings,
    loadWorldInfo,
    t,
    SlashCommandArgument,
    SlashCommandNamedArgument,
    SlashCommand,
    SlashCommandParser,
    substituteParams,
} = context();

const {
    local: localVariables,
    global: globalVariables
} = variables;

const {
    lodash
} = SillyTavern.libs;

const extensionName = "SillyTavern-Kofe-Script";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

/** @type {ExtensionSettings} */
const extensionSettings = extension_settings[extensionName];

/** @type {ExtensionSettings} */
const defaultSettings = {
    enabled: true,
    show_warnings: true,
    macros: {
        experimental_macro_engine: false,
        collapse_multiple_newlines: false
    },
    debug: false
};

const localEnumProviders = {
    /** All possible fields that can be set in a WI entry */
    wiEntryFields: () => Object.entries(newWorldInfoEntryDefinition).map(([key, value]) =>
        new SlashCommandEnumValue(
            key,
            `[${value.type}] default: ${(typeof value.default === 'string' ? `'${value.default}'` : value.default)}`,
            enumTypes.enum,
            enumIcons.getDataTypeIcon(value.type)
        )
    ),

    /** All existing UIDs based on the file argument as world name */
    wiUids: (/** @type {SlashCommandExecutor} */ executor) => {
        const file = executor.namedArgumentList.find(it => it.name == 'file')?.value;
        if (file instanceof SlashCommandClosure) throw new Error('Argument \'file\' does not support closures');
        // Try find world from cache
        if (!worldInfoCache.has(file)) return [];
        const world = worldInfoCache.get(file);
        if (!world) return [];
        return Object.entries(world.entries).map(([uid, data]) =>
            new SlashCommandEnumValue(uid, `${data.comment ? `${data.comment}: ` : ''}${data.key.join(', ')}${data.keysecondary?.length ? ` [${Object.entries(world_info_logic).find(([_, value]) => value == data.selectiveLogic)[0]}] ${data.keysecondary.join(', ')}` : ''} [${getWiPositionString(data)}]`,
                enumTypes.enum, enumIcons.getWiStatusIcon(data)));
    },
}

let macroRegistered = false;

// * MARK:Debugs methods

/**
 * @param  {...any} msg
 * @returns {void}
 */
const log = function (...msg) {
    if (!extensionSettings.enabled || !extensionSettings.debug) return;
    console.log("[" + extensionName + "]", ...msg);
};

/**
 * @param  {...any} msg
 * @returns {void}
 */
const debug = function (...msg) {
    if (!extensionSettings.enabled || !extensionSettings.debug) return;
    console.debug("[" + extensionName + "]", ...msg);
};

/**
 * @param  {...any} msg
 * @returns {void}
 */
const warn = function (...msg) {
    if (!extensionSettings.enabled || !extensionSettings.debug) return;
    console.warn("[" + extensionName + "]", ...msg);
};

/**
 * @param  {...any} msg
 * @returns {void}
 */
const error = function (...msg) {
    if (!extensionSettings.enabled || !extensionSettings.debug) return;
    console.error("[" + extensionName + "]", ...msg);
};

// * MARK:Extension methods

/**
 * @param {string} str
 * @returns {string}
 */
export function un_escapeNewlines(str = '') {
    return str
        .replaceAll(/\\n/g, "\n")
        .replaceAll(/\\r/g, "\r")
        .replaceAll(/\\t/g, "\t");
}

function getWiPositionString(entry) {
    switch (entry.position) {
        case world_info_position.before: return '↑Char';
        case world_info_position.after: return '↓Char';
        case world_info_position.EMTop: return '↑EM';
        case world_info_position.EMBottom: return '↓EM';
        case world_info_position.ANTop: return '↑AT';
        case world_info_position.ANBottom: return '↓AT';
        case world_info_position.atDepth: return `@D${enumIcons.getRoleIcon(entry.role)}`;
        default: return '<Unknown>';
    }
}

/** Determines if params are valid strings
    @param {Array} params - An Array of strings
    @param {Array} names - Optional array of titles for the warning message
    @returns {boolean}
*/
function checkStrings(params, names=[]) {
    let valid = true;

    for (let i = 0; i < params.length; i++) {
        const string = params[i];
        const name = names[i] ?? "An argument";

        if (!isNaN(Number(string))) {
            continue;
        }

        // @ts-ignore
        if (!String(string).trim() || !string) {

            // @ts-ignore
            if (extensionSettings.show_warnings) toastr.warning(t`${name} is empty`);

            valid = false;
            break;
        }
    }

    return valid;
}

/** Get a world info entries
    @param {String} file - Name of the lorebook
    @returns {Promise<String|Object>}
*/
async function getEntriesFromFile(file) {
    if (!file || !world_names.includes(file)) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`Valid World Info file name is required`);
        return '';
    }

    const data = await loadWorldInfo(file);

    if (!data || !('entries' in data)) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`World Info file has an invalid format`);
        return '';
    }

    const entries = Object.values(data.entries);

    if (!entries || entries.length === 0) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`World Info file has no entries`);
        return '';
    }

    return entries;
}

/** Get the UID of world info entry
    @param {Object} args - Lorebook name and entry field to match
    @param {String} value - Value to match against args
    @returns {Promise<String>} UID of the found lorebook entry
*/
async function getEntryUid(args, value) {
    const file = args.file;
    const field = args.field;

    const entries = await getEntriesFromFile(file);

    if (!entries) return "";

    if (newWorldInfoEntryTemplate[field] === undefined) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`Valid field name is required`);
        return "";
    }

    const macroedValue = substituteParams(value);
    const target = [...entries].find(entry => substituteParams(String(entry[field])) === macroedValue);

    if (!target) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`No match found`);
        return "";
    }

    const uid = target.uid;

    return String(uid);
}

/** Get the raw, un-macro-parsed content of an entry field
    @param {Object} args - Lorebook name and entry field to match
    @param {String} uid - UID of the target entry
    @returns {Promise<String>} Raw text content of the field found from the lorebook
*/
async function getRawEntryField(args, uid) {
    const file = args.file;
    const field = args.field || 'content';

    const entries = await getEntriesFromFile(file);

    if (!entries) {
        return "";
    }

    const entry = entries.find(x => String(x.uid) === String(uid));

    if (!entry) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning('Valid UID is required');
        return "";
    }

    if (newWorldInfoEntryTemplate[field] === undefined) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning('Valid field name is required');
        return "";
    }

    const fieldValue = entry[field];

    if (fieldValue === undefined) {
        return "";
    }

    if (Array.isArray(fieldValue)) {
        return JSON.stringify(fieldValue);
    }

    return String(fieldValue);
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'getentryuid',
    callback: async (args) => {
        if (!checkStrings([args.file, args.field, args.value], ["File", "Field", "Value"]))
            return "";

        return await getEntryUid(args, String(args.value));
    },
    returns: 'entry uid',
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: 'file',
            description: 'book name',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
            enumProvider: commonEnumProviders.worlds
        }),
        SlashCommandNamedArgument.fromProps({
            name: 'field',
            description: 'field to match',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
            enumList: localEnumProviders.wiEntryFields()
        }),
        SlashCommandNamedArgument.fromProps({
            name: 'value',
            description: 'value to match against field - case sensitive',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true
        })
    ],
    helpString: `
        <div>
            Get an entry uid by pairing a World Info field and a value, returning the uid of the first match. If no match is found, an empty string is returned.
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/getentryuid file=chatLore field=comment value="title 1"</code></pre>
                </li>
            </ul>
        </div>
    `
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'getrawentryfield',
    callback: async (args, uid) => {
        if (!checkStrings([args.file, args.field, uid], ["File", "Field", "UID"]))
            return "";

        return await getRawEntryField(args, String(uid));
    },
    returns: 'field value',
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: 'file',
            description: 'book name',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
            enumProvider: commonEnumProviders.worlds,
        }),
        SlashCommandNamedArgument.fromProps({
            name: 'field',
            description: 'field to retrieve (default: content)',
            typeList: [ARGUMENT_TYPE.STRING],
            defaultValue: 'content',
            enumList: localEnumProviders.wiEntryFields(),
        }),
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'record UID',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
            enumProvider: localEnumProviders.wiUids,
        }),
    ],
    helpString: `
        <div>
            Get a raw field value (default: content - no macros replaced) of the record with the UID from the specified book and pass it down the pipe.
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/getrawentryfield file=chatLore field=content 123</code></pre>
                </li>
            </ul>
        </div>
    `,
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'newsetfromarray',
    callback: function (namedArgs,/**@type {string} */ arrayInput) {
        if (!arrayInput) return JSON.stringify([]);

        log("newsetfromarray input:", arrayInput);

        try {
            const arrayItems = JSON.parse(arrayInput);
            const isValidArray = Array.isArray(arrayItems);

            if (!isValidArray) return JSON.stringify([]);

            const uniqueItems = Array.from(new Set(arrayItems));

            return JSON.stringify(uniqueItems);
        } catch (error) {
            console.error(extensionName, "- newsetfromarray command error:", error);

            return JSON.stringify([]);
        }
    },
    returns: 'Array with unique items',
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'array input',
            typeList: [ARGUMENT_TYPE.LIST],
            defaultValue: JSON.stringify([]),
            isRequired: true,
        })
    ],
    helpString: `
        <div>
            Create a new set from an array, removing duplicate items.
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/newsetfromarray [1, 2, 2, 3, 4, 4] => returns: [1, 2, 3, 4]</code></pre>
                </li>
            </ul>
        </div>
    `,
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'natsort',
    callback: function (namedArgs,/**@type {string} */ arrayInput) {
        if (!arrayInput) return JSON.stringify([]);

        log("natsort input:", arrayInput);

        try {
            const sorter = natsort();
            const arrayItems = JSON.parse(arrayInput);
            const isValidArray = Array.isArray(arrayItems);

            if (!isValidArray) return JSON.stringify([]);

            const sortedArray = arrayItems.sort(sorter);

            return JSON.stringify(sortedArray);
        } catch (error) {
            console.error(extensionName, "- natsort command error:", error);

            return JSON.stringify([]);
        }
    },
    returns: 'Sorted array',
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'array input',
            typeList: [ARGUMENT_TYPE.LIST],
            defaultValue: JSON.stringify([]),
            isRequired: true,
        })
    ],
    helpString: `
        <div>
            Sorts the items from an array using a natural sorting method. Normal sorting would put <code>"Text 10"</code> before <code>"Text 8"</code>, natural sorting places <code>"Text 8"</code> before <code>"Text 10"</code>.
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/natsort ["Text 1", "Text 8", "Text 70", "Text 8008", "Text 10"]</code></pre>
                    <small>Returns: <code>["Text 1", "Text 8", "Text 10", "Text 70", "Text 8008"]</code></small>
                </li>
            </ul>
        </div>
    `,
}));

// * MARK:Macros Registration

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function registerMacros() {
    const hasEngine = 'macros' in context();

    if (
        !hasEngine ||
        !extensionSettings.enabled ||
        !extensionSettings.macros.experimental_macro_engine ||
        !powerUserSettings.experimental_macro_engine
    ) return warn('Macros 2.0 experimental engine is disabled');

    log('Macros 2.0 experimental engine is enabled');

    macroRegistered = true;

    const { macros } = context();

    macros.register('sorttext', {
        category: macros.category.UTILITY,
        returnType: MacroValueType.STRING,
        description: 'It breaks the input text into lines, sorts them alphabetically, and then joins them back together.',
        unnamedArgs: [{
            name: 'text',
            type: MacroValueType.STRING,
            description: 'The text to sort.',
        }, {
            name: 'separator',
            type: MacroValueType.STRING,
            description: 'The delimiter used to split lines.',
        }, {
            name: 'glue',
            type: MacroValueType.STRING,
            description: 'Text used to join the sorted lines (default: \\n).',
            optional: true,
            defaultValue: '\\n',
        }],
        delayArgResolution: false,
        handler: function ({args: [text, separator, glue], resolve}) {
            glue = !glue ? '\\n' : glue;
            text = resolve(text || '');

            const sorter = natsort();
            const parsedSeparator = un_escapeNewlines(separator);
            const parsedGlue = un_escapeNewlines(glue);
            const textLines = text.split(parsedSeparator);

            if (!textLines.length) return '';

            const filtered = textLines
                .filter(text => text?.length >= 1)

            if (!filtered.length) return '';

            const joined = filtered
                .sort((a,b) => sorter(a,b))
                .join(parsedGlue);

            log("sorttext macro:", {text, parsedSeparator, parsedGlue, textLines, joined});

            if (extensionSettings.macros.collapse_multiple_newlines)
                return joined.replaceAll(/(\r?\n){2,}/g, '\n');
            else return joined;
        }
    });

    macros.register('getvarindex', {
        category: macros.category.UTILITY,
        list: {
            min: 0
        },
        returnType: [
            MacroValueType.STRING,
            MacroValueType.NUMBER,
            MacroValueType.INTEGER,
            MacroValueType.BOOLEAN,
        ],
        description: 'Fetches the value of a local variable at a given index.',
        unnamedArgs: [{
            name: 'varname',
            type: MacroValueType.STRING,
            description: 'The name of the variable.',
            optional: false,
        },{
            name: 'indexes',
            type: MacroValueType.STRING,
            description: 'The index/es used to target a value of the variable.',
            optional: false,
        }],
        handler: function ({args: [text, ...indexes]}) {
            log('getvarindex', {text, indexes: structuredClone(indexes)});

            if (!indexes?.length) return '';

            const rawVariable = localVariables.get(text);

            if (typeof rawVariable !== 'string') return '';

            try {
                const variable = JSON.parse(rawVariable);

                if (!variable || typeof variable !== 'object') return '';

                let result = variable[indexes.shift()];

                for (const index of indexes)
                    result = result[index];

                log('getvarindex', {variable, result});

                return String(result);
            } catch (err) {
                error({err, text, indexes});
                return '';
            }
        }
    });
}

// * MARK:Settings Controls

const settingsCallbacks = {
    /**	Triggers on enabled setting change. */
    enabled: () => {
        // Nothing by the moment
    },

    experimental_macro_engine: () => {
        if (extensionSettings.macros.experimental_macro_engine && !macroRegistered)
            toastr.warning(t`Refresh the tab to use the new engine`);

        if (!extensionSettings.macros.experimental_macro_engine && macroRegistered)
            toastr.warning(t`Refresh the tab to disable the experimental engine`);
    }
};

/** Changes a setting value and triggers a callback if there's any on settingsCallbacks. */
function settingsBooleanButton(event) {
    const target = event.target;
    const value = Boolean($(target).prop("checked"));
    const setting = target.getAttribute("kofe-script-setting");

    const hasPrefix = setting.split("/").length > 1;
    const settingPrefix = hasPrefix ? setting.split("/")[0] : "";
    const settingName = setting.replace(`${settingPrefix}/`, "");

    const callback = settingsCallbacks[settingName];

    if (hasPrefix)
        extensionSettings[settingPrefix][settingName] = value;
    else extensionSettings[setting] = value;

    if (callback) callback();

    log("toggleSetting " + setting, value);
    saveSettingsDebounced();
}

/**	Logs setting's values. */
function displaySettings() {
    console.debug("[" + extensionName + "]", `The extension is ${extensionSettings.enabled ? "active" : "not active"}`);
    console.debug("[" + extensionName + "]", `Show warnings is ${extensionSettings.show_warnings ? "enabled" : "disabled"}`);

    console.debug("[" + extensionName + "]", `Macros - Experimental Macro Engine is ${extensionSettings.macros.experimental_macro_engine ? "enabled" : "disabled"}`);
    console.debug("[" + extensionName + "]", `Macros - Collapse Multiple Newlines is ${extensionSettings.macros.collapse_multiple_newlines ? "enabled" : "disabled"}`);

    console.debug("[" + extensionName + "]", `Debug mode is ${extensionSettings.debug ? "active" : "not active"}`);
    console.debug("[" + extensionName + "]", structuredClone(extensionSettings));
}

/** Append settings menu on ST and set listeners. */
async function loadHTMLSettings() {
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);

    $("#extensions_settings2").append(settingsHtml);

    // Event Listeners for the extension HTML
    $("#kofe-script-activate-extension").on("input", settingsBooleanButton);
    $("#kofe-script-show-warnings").on("input", settingsBooleanButton);

    $("#kofe-script-experimetal-macro-engine").on("input", settingsBooleanButton);
    $("#kofe-script-collapse-multiple-newlines").on("input", settingsBooleanButton);

    $("#kofe-script-activate-debug").on("input", settingsBooleanButton);
    $("#kofe-script-check-configuration").on("click", displaySettings);

    log("loadHTMLSettings");
}

/** Init setting values on the menu */
function setSettingsMenu() {
    $("#kofe-script-activate-extension").prop("checked", extensionSettings.enabled).trigger("input");
    $("#kofe-script-show-warnings").prop("checked", extensionSettings.show_warnings).trigger("input");

    $("#kofe-script-experimetal-macro-engine").prop("checked", extensionSettings.macros.experimental_macro_engine).trigger("input");
    $("#kofe-script-collapse-multiple-newlines").prop("checked", extensionSettings.macros.collapse_multiple_newlines).trigger("input");

    $("#kofe-script-activate-debug").prop("checked", extensionSettings.debug).trigger("input");

    log("setSettingsMenu", extensionSettings);
}

// * MARK:Initialize Extension

$(async function () {

    if (!context().extensionSettings[extensionName]) {
        context().extensionSettings[extensionName] = structuredClone(defaultSettings);
    }

    for (const key of Object.keys(defaultSettings)) {
        if (context().extensionSettings[extensionName][key] === undefined) {
            context().extensionSettings[extensionName][key] = defaultSettings[key];
        }
    }

    await loadHTMLSettings();
    registerMacros();
    setSettingsMenu();
});
