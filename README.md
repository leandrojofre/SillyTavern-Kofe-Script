# SillyTavern - Kofe Script
This is a simple extension that adds a bunch of random commands needed by me for random reasons.
## Features
- `/getentryuid file= field= value=` Returns the uid of the first entry that exactly matches the value in the selected field. Returns an empty string if no match is found. *Note, SillyTavern's /findentry uses fuzzy matching.*
- `/getrawentryfield file= field= uid` Returns the raw text content of the selected field (default: content) on the selected lorebook; no macros are replaced. Returns an empty string if no match is found.
## Installation
Install the extension using this link: ```https://github.com/leandrojofre/SillyTavern-Kofe-Script.git```
### Usage
This extension is requires Quick Replies to be enabled in ST's extension settings, inside `manage extensions`.
