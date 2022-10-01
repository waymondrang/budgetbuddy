// TODO test new transactions (single page, multiple pages)

const eaccounts_url = "https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx";
const url_params = new URLSearchParams(window.location.search);
const bb_token_param = url_params.get('bb_token');
const start_processing_date = "1/1/2010 12:00 AM";
const start_processing_client = `{"enabled":true,"emptyMessage":"","validationText":"2010-01-01-00-00-00","valueAsString":"2010-01-01-00-00-00","minDateStr":"1980-01-01-00-00-00","maxDateStr":"2099-12-31-00-00-00","lastSetTextBoxValue":"1/1/2010 12:00 AM"}`;
const end_processing_date = "12/30/2099 12:00 AM";
const end_processing_client = `{"enabled":true,"emptyMessage":"","validationText":"2010-01-01-00-00-00","valueAsString":"2010-01-01-00-00-00","minDateStr":"1980-01-01-00-00-00","maxDateStr":"2099-12-31-00-00-00","lastSetTextBoxValue":"1/1/2010 12:00 AM"}`;
const version = chrome.runtime.getManifest().version;

const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
const main_container = document.querySelector("#mainContainer").querySelector("#Content");

var bb_token_valid;
var bb_token_data;
var bb_current_data;
var bb_matched_data;
var running;

// Custom BudgetBuddy Logger
var og_log = console.log;
var log = function () {
    a = [];
    a.push('[bb][index.js]\t');
    for (var i = 0; i < arguments.length; i++) {
        a.push(arguments[i]);
    }
    og_log.apply(console, a);
};

const css = document.createElement('link');
css.setAttribute("href", chrome.runtime.getURL('bb.css'));
css.id = "bb-css";
css.rel = "stylesheet";

const js = document.createElement('script');
js.setAttribute("src", chrome.runtime.getURL('m4in.js'));
js.id = "bb-js";
js.type = "text/javascript";

// Insertions

var work_in_progress = document.createElement("div");
work_in_progress.id = "bb-wip";
work_in_progress.classList.add(["bb-hidden"]);

var wip_title = document.createElement("h1");
wip_title.id = "bb-wip-title";
wip_title.innerText = "Data Collection in Progress";

var wip_stop = document.createElement("input");
wip_stop.id = "bb-switch";
wip_stop.value = "Stop";
wip_stop.type = "button";
wip_stop.classList.add(["button"]);
wip_stop.onclick = function (e) {
    e.preventDefault();
    wip_stop.disabled = true;
    end("BudgetBuddy Stopped");
    work_in_progress.classList.add(["bb-hidden"]);
}

var wip_analyze = document.createElement("input");
wip_analyze.value = "Launch Analyzer";
wip_analyze.type = "button";
wip_analyze.classList.add("button", "bb-hidden");
wip_analyze.onclick = function (e) {
    e.preventDefault();
    chrome.runtime.sendMessage("analyze");
}

work_in_progress.insertBefore(wip_stop, work_in_progress.lastChild);
work_in_progress.insertBefore(wip_title, work_in_progress.lastChild);
work_in_progress.insertBefore(wip_analyze, work_in_progress.lastChild);
document.body.insertBefore(work_in_progress, document.body.lastChild);

var panel = document.createElement("div");
panel.id = "bb-action-panel";
panel.classList.add("formPanel");

var form_container = document.createElement("div");
form_container.classList.add(["formContainer"]);

var form_instructions = document.createElement("div");
form_instructions.classList.add(["formInstructions"]);
form_instructions.innerText = "Transaction analyzer for UCSD HDH Accounts.";

var form_title = document.createElement("h1");
form_title.classList.add(["formIntroText"]);
form_title.innerText = "BudgetBuddy";

// Functions

// Custom BudgetBuddy Logger
var og_log = console.log;
var log = function () {
    a = [];
    a.push('[bb][index.js]\t');
    for (var i = 0; i < arguments.length; i++) {
        a.push(arguments[i]);
    }
    og_log.apply(console, a);
};

function wait_for_timeout(timeout) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, timeout)
    })
}

function object_equals(x, y) {
    try {
        for (key of Object.keys(x)) {
            if (x[key] !== y[key]) {
                return false;
            }
        }
        return true;
        // return Object.keys(x).map(e => x[e] == y[e]).every(e => e == true);
    } catch {
        return false;
    }
}

function wait_for_selector(selector, options = {}) {
    var hidden = Boolean(options["hidden"]);
    var timeout = options["timeout"] ? Number(options["timeout"]) : 30000;
    return new Promise(function (resolve, reject) {
        if (hidden ? !document.querySelector(selector) || document.querySelector(selector).style.display == "none" : document.querySelector(selector)) {
            return resolve();
        }
        const observer = new MutationObserver(function (mutations, me) {
            if (hidden ? !document.querySelector(selector) || document.querySelector(selector).style.display == "none" : document.querySelector(selector)) {
                resolve();
                me.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(function () {
            reject();
            return;
        }, timeout)
    });
}

function wait_for_inner_text(selector, text, options = {}) {
    var timeout = options["timeout"] ? Number(options["timeout"]) : 30000;
    return new Promise(function (resolve, reject) {
        if (document.querySelector(selector).innerText == text) {
            return resolve();
        }
        const observer = new MutationObserver(function (mutations, me) {
            if (document.querySelector(selector).innerText == text) {
                resolve();
                me.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(function () {
            reject();
            return;
        }, timeout)
    });

}

function uuid_v4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// https://stackoverflow.com/a/60467595
//  A formatted version of a popular md5 implementation.
//  Original copyright (c) Paul Johnston & Greg Holt.
//  The function itself is now 42 lines long.
function md5(inputString) {
    var hc = "0123456789abcdef";
    function rh(n) { var j, s = ""; for (j = 0; j <= 3; j++) s += hc.charAt((n >> (j * 8 + 4)) & 0x0F) + hc.charAt((n >> (j * 8)) & 0x0F); return s; }
    function ad(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF); var m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); }
    function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
    function sb(x) {
        var i; var nblk = ((x.length + 8) >> 6) + 1; var blks = new Array(nblk * 16); for (i = 0; i < nblk * 16; i++) blks[i] = 0;
        for (i = 0; i < x.length; i++) blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8);
        blks[i >> 2] |= 0x80 << ((i % 4) * 8); blks[nblk * 16 - 2] = x.length * 8; return blks;
    }
    var i, x = sb(inputString), a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, olda, oldb, oldc, oldd;
    for (i = 0; i < x.length; i += 16) {
        olda = a; oldb = b; oldc = c; oldd = d;
        a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = ff(b, c, d, a, x[i + 3], 22, -1044525330); a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983); a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = ff(b, c, d, a, x[i + 15], 22, 1236535329); a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302); a = gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = gg(b, c, d, a, x[i + 8], 20, 1163531501); a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734); a = hh(a, b, c, d, x[i + 5], 4, -378558);
        d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = hh(b, c, d, a, x[i + 10], 23, -1094730640); a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189); a = hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = ii(b, c, d, a, x[i + 5], 21, -57434055); a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799); a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = ii(b, c, d, a, x[i + 9], 21, -343485551); a = ad(a, olda); b = ad(b, oldb); c = ad(c, oldc); d = ad(d, oldd);
    }
    return rh(a) + rh(b) + rh(c) + rh(d);
}

function get_current_page() {
    let target = document.querySelector(".rgCurrentPage");
    if (!target)
        return null;
    return Number(target.innerText);
}

function get_pages() {
    return Number(document.querySelector(".rgInfoPart").innerText.split(/\,/gm)[0].trim().replace(/[^0-9\s]/gm, '').trim().split(/\s/gm).at(-1));
}

/**
 * Find node with specified innerText from a NodeList.
 * @param {NodeList} node_list 
 * @param {String} text 
 * @returns {Node | null}
 */
function find_node_with_inner_text(node_list, text) {
    for (node of node_list) {
        if (node.innerText === text) {
            return node
        }
    }
    return null;
}

/**
 * An alternative to clicking on the <a> page elements
 * @param {*} node 
 */
function run_href(node) {
    document.documentElement.setAttribute('onreset', node.getAttribute("href"));
    document.documentElement.dispatchEvent(new CustomEvent('reset'));
    document.documentElement.removeAttribute('onreset');
}

let ended;

/**
 * End function with custom message
 * @param {*} message 
 */
function end(message) {
    try {
        if (!ended) {
            chrome.storage.local.set({ bb_token: {} }, function () {
                log("Token cleared");
            });
            log("end() called", message);
            running = false;
            wip_title.innerText = message;
            wip_analyze.classList.remove(["bb-hidden"]);
            wip_stop.value = "Close";
            ended = true;
        }
    } catch (e) {
        log("Error in ending BudgetBuddy");
        log(e);
    }
}

// window.m4in = async function () {
async function main() {
    log("BudgetBuddy Initiated");

    if (bb_token_valid)
        log("Resuming Session", bb_token_param);

    running = true;
    toggle_button.disabled = true;

    try {
        work_in_progress.classList.remove(["bb-hidden"]);

        // Change dateInput and ClientState values
        let start_date = document.querySelector("#ctl00_MainContent_BeginRadDateTimePicker_dateInput");
        let start_client = document.querySelector("#ctl00_MainContent_BeginRadDateTimePicker_dateInput_ClientState");
        start_date.value = start_processing_date;
        start_client.value = start_processing_client;
        let end_date = document.querySelector("#ctl00_MainContent_EndRadDateTimePicker_dateInput");
        let end_client = document.querySelector("#ctl00_MainContent_EndRadDateTimePicker_dateInput_ClientState");
        end_date.value = end_processing_date;
        end_client.value = end_processing_client;

        document.querySelector("#ctl00_MainContent_AmountRangeFrom").value = '';
        document.querySelector("#ctl00_MainContent_AmountRangeTo").value = '';
        document.querySelector("#MainContent_Location").value = '';
        document.querySelector("#MainContent_Accounts").value = document.querySelector("#MainContent_Accounts").querySelectorAll("option")[0].value;
        document.querySelector("#MainContent_TransactionType").value = document.querySelector("#MainContent_TransactionType").querySelectorAll("option")[0].value;
        document.querySelector("#MainContent_ContinueButton").click(); // Submit Form

        let data = bb_token_data ? bb_token_data.data : [];

        function collect_data() {
            return new Promise(async function (resolve, reject) {

                if (!running) { // Check if process should be stopped
                    end("BudgetBuddy Stopped");
                    reject("User-initiated stop");
                    return;
                }

                try {

                    await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });

                    if (!running) { // Check if stopped
                        end("BudgetBuddy Stopped");
                        reject("User-initiated stop");
                        return;
                    }
                    let transactions = document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody").length - 1].querySelectorAll("tr");
                    for (let i = 0; i < transactions.length; i++) {
                        let transaction = transactions[i];
                        if (!running) { // Check if stopped
                            end("BudgetBuddy Stopped");
                            reject("User-initiated stop");
                            return;
                        }
                        let transaction_data = {};

                        let date_time = transaction.querySelectorAll("td")[0].innerText;
                        let e_date = date_time.substring(0, date_time.indexOf("\ ")).split(/\//gm);
                        let e_time = date_time.substring(date_time.indexOf("\ ") + 1);
                        let t_date = new Date(e_date[2], e_date[0] - 1, e_date[1]); // Year, Month, Day
                        t_date.setHours(e_time.replace(/[^a-zA-Z]/gm, "").toLowerCase() === "am" ? Number(e_time.substring(0, e_time.indexOf("\:"))) != 12 ? Number(e_time.substring(0, e_time.indexOf("\:"))) : 0 : Number(e_time.substring(0, e_time.indexOf("\:"))) != 12 ? Number(e_time.substring(0, e_time.indexOf("\:"))) + 12 : Number(e_time.substring(0, e_time.indexOf("\:")))); // Hour
                        t_date.setMinutes(Number((e_time.substring(e_time.indexOf("\:") + 1)).replace(/[^0-9]/gm, ""))); // Minute
                        let t_account = transaction.querySelectorAll("td")[1].innerText;

                        transaction_data["date"] = t_date.toISOString();
                        transaction_data["time"] = e_time;
                        transaction_data["account"] = t_account;
                        transaction_data["location"] = transaction.querySelectorAll("td")[3].innerText;
                        transaction_data["type"] = transaction.querySelectorAll("td")[4].innerText;
                        transaction_data["amount"] = Number((transaction.querySelectorAll("td")[5].innerText).replace(/[^0-9\.]/gm, ""));
                        transaction_data["matched"] = false; // Mark transaction as unmatched

                        let hash = md5(JSON.stringify(transaction_data));
                        transaction_data["id"] = hash;

                        // Check if current data or existing data contains transaction with matching hash
                        if (data.some(e => e.id === hash) || (bb_current_data && bb_current_data.some(e => e.id === hash))) {
                            log("Marking transaction with matched hash " + hash);
                            transaction_data["matched"] = true;
                        }

                        // Section for checker-reduction algorithm

                        // This algorithm could be improved, it should work.
                        // This would break if the user scrapes their data between two transactions with the same hash.
                        if (bb_current_data && bb_current_data.length && hash === bb_current_data[0].id) {
                            log("Found match", hash);
                            bb_matched_data = hash;
                            resolve();
                            return;
                        }

                        data.push(transaction_data);
                    }
                    resolve();
                    return;
                } catch (e) {
                    reject(e);
                    return;
                }
            })
        }

        let current_page = bb_token_valid ? bb_token_data["current_page"] : null;
        let refresh_interval = 8;

        if (bb_token_valid) {
            log("Navigating to last processed page: " + current_page + ", then target page: " + (current_page + 1)); // i.e. Navigating to last processed page: 1, then target page: 2
            await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
            while (!find_node_with_inner_text(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"), `${current_page + 1}`)) {
                log("Page link not found. Navigating to more results");
                run_href(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelector("[title=\"Next Pages\"]"));
                await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
                log("Waiting for timeout");
                await wait_for_timeout(3000); // I'm not sure why this is here but I don't want to remove it
            }
            log("Finding and running href of <a> element with innerText: " + (current_page + 1));
            run_href(find_node_with_inner_text(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"), `${current_page + 1}`));
            await wait_for_inner_text(".rgCurrentPage", `${current_page + 1}`);
            await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
        }

        // Initial data collection round
        await collect_data();

        if (bb_matched_data) {
            log("Found repeated data, concatenating old data");
            let new_data = data.concat(bb_current_data);
            chrome.storage.local.set({ bb_token: {}, data: { data: new_data, version: version, last_update: new Date().toLocaleString("en-US", { timeZoneName: 'short' }) } });
            end("Data Update Complete");
            return;
        }

        log("Finished initial data collection");

        if (document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody").length > 1) { // If more than one page
            try {
                while ((current_page = get_current_page()) < get_pages()) {

                    if (!running) {
                        end("BudgetBuddy Stopped");
                        return;
                    }

                    log("Moving onto next page");

                    if (current_page % refresh_interval === 0) {
                        log("Generating session token");
                        var bb_token = uuid_v4();
                        log(bb_token);
                        var body = { "bb_token": bb_token, "data": data, "current_page": current_page };
                        log("Refreshing page");
                        await (function () { // Stall process and wait for token to be set
                            return new Promise(function (resolve, reject) {
                                chrome.storage.local.set({ bb_token: body }, function () {
                                    window.location.href = `${eaccounts_url}?bb_token=${bb_token}`;
                                })
                            })
                        })()
                    }

                    try {
                        log("Attempting to run href of next page <a> element");
                        run_href(find_node_with_inner_text(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"), `${current_page + 1}`));
                    } catch (e) {
                        log("No more <a> elements with matching innerText");
                        try {
                            run_href(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelector("[title=\"Next Pages\"]"));
                        } catch (e) {
                            log("Could not find element \"[title=\"Next Pages\"]\"");
                            log(e);
                            return;
                        }
                    }

                    if (!running) {
                        end("BudgetBuddy Stopped");
                        return;
                    }

                    await wait_for_inner_text(".rgCurrentPage", `${current_page + 1}`);

                    await collect_data();

                    if (bb_matched_data)
                        break;

                }
            } catch (e) {
                log("An error occurred");
                log(e);
                return;
            }
        }

        if (bb_matched_data) {
            log("Found repeated data, concatenating old data");
            data = data.concat(bb_current_data);
        }

        if (!running) {
            end("BudgetBuddy Stopped");
            return;
        }

        chrome.storage.local.set({ bb_token: {}, data: { data: data, version: version, last_update: new Date().toLocaleString("en-US", { timeZoneName: 'short' }) }, }, function () {
            log("Transaction history saved to local storage");
            end("Data Collection Complete");
        })

    } catch (e) {
        running = false;
        work_in_progress.classList.add(["bb-hidden"]);
        log("An error occurred");
        log(e);
    }
}

if (bb_token_param) { // If the page URL contains a bb_token parameter
    log("Validating token", bb_token_param);
    chrome.storage.local.get(["bb_token", "data"], function (result) {
        if (result.bb_token && result.bb_token.bb_token === bb_token_param) {
            bb_token_data = result.bb_token;
            bb_token_valid = true;
            if (Object.keys(result).includes("data")) {
                bb_current_data = result.data.data; // This requires result.data to be an object
                if (bb_current_data && bb_current_data.length > 0) {
                    wip_title.innerText = "Data Update in Progress";
                }
            }
            main();
        } else {
            log("Invalid token");
        }
    })
}

var toggle_button = document.createElement("input");
toggle_button.value = "Start";
toggle_button.type = "button";
toggle_button.style.marginRight = "1em";
toggle_button.classList.add(["button"]);
toggle_button.onclick = function () {
    chrome.storage.local.get(["data"], function (result) {
        if (Object.keys(result).includes("data")) {
            bb_current_data = result.data.data;
            if (bb_current_data && bb_current_data.length > 0) {
                wip_title.innerText = "Data Update in Progress";
            }
        }
        this.disabled = true;
        main();
    });
};

var toggle_analyze = document.createElement("input");
toggle_analyze.value = "Launch Analyzer";
toggle_analyze.type = "button";
toggle_analyze.classList.add(["button"])
toggle_analyze.onclick = function (e) {
    e.preventDefault();
    chrome.runtime.sendMessage("analyze");
}

head.insertBefore(css, head.lastChild);
panel.insertBefore(toggle_button, panel.lastChild);
panel.insertBefore(form_title, panel.lastChild);
form_container.insertBefore(form_instructions, form_container.lastChild);
panel.insertBefore(form_container, panel.lastChild);
panel.insertBefore(toggle_analyze, panel.lastChild);
main_container.insertBefore(panel, main_container.lastChild);

log("BudgetBuddy Ready");