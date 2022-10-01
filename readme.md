# BudgetBuddy ![BudgetBuddy version badge](https://img.shields.io/badge/dynamic/json?color=informational&label=version&query=%24.version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fwaymondrang%2Fbetter-budget-buddy%2Fmain%2Fsrc%2Fchrome%2Fmanifest.json) <!-- omit in toc -->

A browser extension for analyzing UCSD HDH Account transactions

## Table of Contents <!-- omit in toc -->

- [Known Issues](#known-issues)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Analyze](#analyze)

## Known Issues

Please refer to the [Issues section](https://github.com/waymondrang/budget-buddy/issues) regarding any issues/bugs with BudgetBuddy.

## How It Works

As a browser extension, BudgetBuddy has permission to view information and manipulate the [eAccounts Account Transactions page](https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx). BudgetBuddy also has permission to store data locally in the browser and open new tabs. No user data, including analytics data, is sent from the extension.

## Installation

To install BudgetBuddy, either pull/clone the repository or download as .zip. If necessary, unzip the file, then navigate to the Chrome Extensions page at `chrome://extensions/`.

Once on the Chrome Extensions page, enable **Developer Mode** using the toggle on the top-right of the page, revealing a button drawer.

Select **Load Unpacked** and locate the folder with the contents of BudgetBuddy. BudgetBuddy should now appear under the list of installed extensions. Make sure that the version of your installed BudgetBuddy matches the most up to date version.

Congrats, you've installed BudgetBuddy!

## Usage

To start utilizing BudgetBuddy, navigate to the [eAccounts Account Transactions page](https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx).

Once the Account Transaction Report form appears, a separate box titled BudgetBuddy will appear under the form. Select **Begin** to initiate the data collection process.

Collected transaction data is automatically saved at the end of the process

After the process finishes, two options will appear.

- **Launch Analyzer** will open the BudgetBuddy Analyzer web app, where users can visualize, sort, and filter through transactions.

- **Awesome** closes the overlay.

## Analyze

_This section is still in progress_
