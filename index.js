import {extension_settings} from "../../../extensions.js";
import {saveSettingsDebounced/*, event_types, eventSource*/, substituteParams} from "../../../../script.js";
// import {getLocalVariable, getGlobalVariable} from "../../../variables.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from "../../../slash-commands/SlashCommandArgument.js";
import { commonEnumProviders, enumIcons } from "../../../slash-commands/SlashCommandCommonEnumsProvider.js";
import { loadWorldInfo, newWorldInfoEntryDefinition, newWorldInfoEntryTemplate, world_names } from "../../../world-info.js";
import { enumTypes, SlashCommandEnumValue } from "../../../slash-commands/SlashCommandEnumValue.js";
import { t } from "../../../i18n.js";

// * Extension variables

const extensionName = "SillyTavern-Kofe-Script";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
    enabled: true,
    show_warnings: true,
    debug: false
};

const context = SillyTavern.getContext();
const localEnumProviders = {
    /** All possible fields that can be set in a WI entry */
    wiEntryFields: () => Object.entries(newWorldInfoEntryDefinition).map(([key, value]) =>
        new SlashCommandEnumValue(
            key,
            `[${value.type}] default: ${(typeof value.default === 'string' ? `'${value.default}'` : value.default)}`,
            enumTypes.enum,
            enumIcons.getDataTypeIcon(value.type)
        )
    )
}

// * Debugs methods

const log = (...msg) => {
    if (!extensionSettings.enabled || !extensionSettings.debug) return;
    console.log("[" + extensionName + "]", ...msg);
};

// * Extension methods

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
    @param {Object} args -  Lorebook name and entry field to match
    @param {String} value - Value to match against args
    @returns {Promise<String>} UID of the found lorebook entry
*/
async function getEntryUid(args, value) {
    const file = args.file;
    const field = args.field;

    const entries = await getEntriesFromFile(file);

    if (!entries) return "-1";

    if (newWorldInfoEntryTemplate[field] === undefined) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`Valid field name is required`);
        return "-1";
    }

    const macroedValue = substituteParams(value);
    const target = [...entries].find(entry => substituteParams(String(entry[field])) === macroedValue);

    if (!target) {
        // @ts-ignore
        if (extensionSettings.show_warnings) toastr.warning(t`No match found`);
        return "-1";
    }

    const uid = target.uid;

    return String(uid);
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'getentryuid',
    callback: async (args) => {
        if (!checkStrings([args.file, args.field, args.value], ["File", "Field", "Value"]))
            return "-1";

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
            description: 'field to match (ie: comment)',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
            enumList: localEnumProviders.wiEntryFields()
        }),
        SlashCommandNamedArgument.fromProps({
            name: 'value',
            description: 'value to match against field, case sensitive (empty or invalid will return uid=0) ie: cooking 101',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true
        })
    ],
    helpString: `
        <div>
            Get an entry uid by pairing a World Info field and a value, returning the uid of the first match. If no match is found, the non-valid UID value -1 is returned.
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

// * Methods in charge of controlling the extension settings

const settingsCallbacks = {
    /**	Triggers on enabled setting change. */
    enabled: () => {
        // Nothing by the moment
    }
}

/** Changes a setting value and triggers a callback if there's any on settingsCallbacks. */
function settingsBooleanButton(event) {
    const target = event.target;
    const value = Boolean($(target).prop("checked"));
    const setting = target.getAttribute("kofe-script-setting");
    const callback = settingsCallbacks[setting];

    extensionSettings[setting] = value;

    if (callback) callback();

    log("toggleSetting " + setting, value);
    saveSettingsDebounced();
}

/**	Logs setting's values. */
function displaySettings() {
    console.debug("[" + extensionName + "]", `The extension is ${extensionSettings.enabled ? "active" : "not active"}`);
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
    $("#kofe-script-activate-debug").on("input", settingsBooleanButton);
    $("#kofe-script-check-configuration").on("click", displaySettings);

    log("loadHTMLSettings");
}

/** Init setting values on the menu */
function setSettings() {
    $("#kofe-script-activate-extension").prop("checked", extensionSettings.enabled).trigger("input");
    $("#kofe-script-show-warnings").prop("checked", extensionSettings.show_warnings).trigger("input");
    $("#kofe-script-activate-debug").prop("checked", extensionSettings.debug).trigger("input");

    log("setSettings", extensionSettings);
}

// * Initialize Extension

(async function initExtension() {

    if (!context.extensionSettings[extensionName]) {
        context.extensionSettings[extensionName] = structuredClone(defaultSettings);
    }

    for (const key of Object.keys(defaultSettings)) {
        if (context.extensionSettings[extensionName][key] === undefined) {
            context.extensionSettings[extensionName][key] = defaultSettings[key];
        }
    }

    await loadHTMLSettings();
    setSettings();
})();
