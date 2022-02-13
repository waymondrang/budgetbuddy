# Budget Buddy ![budget buddy version badge](https://img.shields.io/badge/dynamic/json?color=informational&label=version&query=%24.version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fwaymondrang%2Fbetter-budget-buddy%2Fmain%2Fsrc%2Fchrome%2Fmanifest.json) <!-- omit in toc -->

A browser extension that aims to help with budgeting and spending analysis for UCSD Dining Dollars and Triton Cash.

## Table of Contents <!-- omit in toc -->

- [Known Issues](#known-issues)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Analyze](#analyze)

## Known Issues

Please refer to the [Issues section](https://github.com/waymondrang/budget-buddy/issues) regarding any issues/bugs with Budget Buddy.

## How It Works

As a browser extension, Budget Buddy has exclusive access to view and change information on the [eAccounts Account Transactions page](https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx). Budget Buddy also has permission to store data locally in the browser and open new tabs.

## Installation

To install Budget Buddy, either pull/clone the repository or download as .zip. If necessary, unzip the file, then navigate to the Chrome Extensions page at `chrome://extensions/`.

Once on the Chrome Extensions page, enable **Developer Mode** using the toggle on the top-right of the page. A button drawer should then appear.

Select **Load Unpacked** and locate the file with the contents of Budget Buddy. Budget Buddy should now appear under the list of installed extensions. Make sure that the version of your installed Budget Buddy matches the most up to date version.

Congrats, you've installed Budget Buddy!

## Usage

To start utilizing Budget Buddy, navigate to the [eAccounts Account Transactions page](https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx).

Once the Account Transaction Report form appears, a separate box titled Budget Buddy will appear under the form. Select **Begin** to initiate the data collection process.

Collected transaction data is automatically saved at the end of the process

After the process finishes, two options will appear.

- **Analyze** will open the Budget Buddy Analyzer web app, where users can visualize, sort, and filter through transactions.

- **Awesome** closes the overlay.

## Analyze

_This section is still in progress_
