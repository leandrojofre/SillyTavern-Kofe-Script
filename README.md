# SillyTavern - Kofe Script
This is a simple extension that adds a bunch of random commands needed by me for random reasons.
## Features
- `/getexactentryuid file= field= value=` Returns the uid of the first entry that exactly matches the value in the selected field. Returns an empty string if no match is found. *Note, SillyTavern's /findentry uses fuzzy matching.*
- `/getrawentryfield file= field= uid` Returns the raw text content of the selected field (default: content) on the selected lorebook; no macros are replaced. Returns an empty string if no match is found.
- `/newsetfromarray list` Create a new set from an array, removing duplicate items. Returns a new list with all duplicated items from the input list removed.
- `/natsort list` Sorts the items from an array using a natural sorting method. Returns a new list with items sorted. *Normal sorting would put `"Text 10"` before `"Text 8"`, natural sorting places `"Text 8"` before `"Text 10"`.*
- `{{sorttext::text::glue}}` It breaks the input text into lines, sorts them alphabetically, and then joins them back together. Returns the text sorted using a natural sorting algorithm.
- `{{getvarindex::varname::index0::index1::indexN}}` Fetches the value of a local variable at a given index. It can take as many idexes as you input. Returns the final value after applying indexes.
## Installation
Install the extension using this link: ```https://github.com/leandrojofre/SillyTavern-Kofe-Script.git```
### Usage
This extension is requires Quick Replies to be enabled in ST's extension settings, inside `manage extensions`.
