# SillyTavern - Kofe Script
This is a simple extension that adds a bunch of random commands needed by me for random reasons.

## Features
- Slash Commands
  - `/getexactentryuid file= field= value=` Returns the uid of the first entry that exactly matches the value in the selected field. Returns an empty string if no match is found. *Note, SillyTavern's /findentry uses fuzzy matching.*
  - `/getrawentryfield file= field= uid` Returns the raw text content of the selected field (default: content) on the selected lorebook; no macros are replaced. Returns an empty string if no match is found.
  - `/newsetfromarray list` Create a new set from an array, removing duplicate items. Returns a new list with all duplicated items from the input list removed.
  - `/natsort list` Sorts the items from an array using a natural sorting method. Returns a new list with items sorted. *Normal sorting would put `"Text 10"` before `"Text 8"`, natural sorting places `"Text 8"` before `"Text 10"`.*
  - `/array-some list|var-name command-closure` It allows to run a test over a list to determine whether it passes the test or not.

- Macros
  - `{{sorttext::text::separator::glue}}` It breaks the input text into lines, sorts them alphabetically, and then joins them back together. Returns the text sorted using a natural sorting algorithm. `separator` can be a text to search or a regular expression (Regex).
  - `{{getvarindex::varname::index0::index1::indexN}}` Fetches the value of a local variable at a given index. It can take as many idexes as you input. Returns the final value after applying indexes.
  - `{{getvarindexes::varname::index1::indexN}}` and `{{getglobalvarindexes::varname::index1::indexN}}` They allow to fetch values from variables that are objects or arrays/lists. Unlike the built in `getvarindex` and `getglobalvarindex`, these new macros allow to use multiple indexes for nested objects/arrays.
  - `{{arrayjoin::varname|array::glue}}` It will joing all the values inside the given array using the provided `glue`. If no `glue` is given, `, ` is used by default.

- Fixes for [LaLib](https://github.com/LenAnderson/SillyTavern-LALib) commands
> They override the commands from LaLib, fixing bugs like not being able to parse lists/objects, or not updating chat variables properly.
  - `/shift`
  - `/pop`
  - `/push`

## Installation
Install the extension using this link: ```https://github.com/leandrojofre/SillyTavern-Kofe-Script.git```

### Usage
This extension is requires Quick Replies to be enabled in ST's extension settings, inside `manage extensions`.
