# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. Do not open a public issue for a vulnerability.

Include what you found, the steps to reproduce it, and the files or commands involved. You can expect a first reply within a few days.

## Scope

gifisi-harness installs files into a project or into your home folder and runs small Node scripts. These count as security problems:

- The installer writes, overwrites or deletes anything outside the target folder or outside its own managed blocks.
- A script runs a command, makes a network request, or reads a secret that its documentation does not say it does.
- A template or hook ships a credential, a token, or a command that deletes data.

Report ordinary bugs as regular issues.

## Supported versions

Only the latest release on the default branch receives fixes.
