var log_history = [];
const eaccounts_url = "https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx";

const url_params = new URLSearchParams(window.location.search);
const bb_token_param = url_params.get('bb_token');
var bb_token_valid;
var bb_token_data;

var oglog = console.log;
var nlog = function () {
    a = [];
    a.push('[bb][index.js]\t');
    for (var i = 0; i < arguments.length; i++) {
        a.push(arguments[i]);
    }
    log_history.push(a);
    oglog.apply(console, a);
};

const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
const main_container = document.querySelector("#mainContainer").querySelector("#Content");

const css = document.createElement('link');
css.setAttribute("href", chrome.extension.getURL('bb.css'));
css.id = "bb-css";
css.rel = "stylesheet";

var running;

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
    if (running) {
        wip_title.innerText = "Stopping Data Collection";
        running = false;
    }
    nlog("budget buddy stopped!");
    work_in_progress.classList.add(["bb-hidden"]);
}

var wip_analyze = document.createElement("input");
wip_analyze.value = "Analyze";
wip_analyze.type = "button";
wip_analyze.classList.add("button", "bb-hidden");
wip_analyze.onclick = function (e) {
    e.preventDefault();
    chrome.runtime.sendMessage("analyze");
}

work_in_progress.insertBefore(wip_stop, work_in_progress.lastChild);
work_in_progress.insertBefore(wip_title, work_in_progress.lastChild);
work_in_progress.insertBefore(wip_analyze, work_in_progress.lastChild);

var panel = document.createElement("div");
panel.id = "bb-action-panel";
panel.classList.add("formPanel");

var form_container = document.createElement("div");
form_container.classList.add(["formContainer"]);

var form_instructions = document.createElement("div");
form_instructions.classList.add(["formInstructions"]);
form_instructions.innerHTML = "An extension by \<a href\=\"https\:\/\/waymondrang.com\/\"\>waymondrang\<\/a\>\.";

var form_title = document.createElement("h1");
form_title.classList.add(["formIntroText"]);
form_title.innerText = "Budget Buddy";

// * FUNCTION DECLARATIONS

function wait_for_timeout(timeout) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, timeout)
    })
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
        }, timeout)
    });

}

function uuid_v4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

async function main() {
    // * BEGIN DATA COLLECTION
    nlog("budget buddy activated!");

    if (bb_token_valid) {
        nlog("resuming session", bb_token_param);
    }

    running = true;
    toggle_button.disabled = true;

    try {
        work_in_progress.classList.remove(["bb-hidden"]);

        // * FORM VALIDATION

        document.querySelector("#ctl00_MainContent_BeginRadDateTimePicker_dateInput").value = '9/1/2021 12:00 AM';
        document.querySelector("#ctl00_MainContent_EndRadDateTimePicker_dateInput").value = '6/10/2022 12:00 AM';
        document.querySelector("#ctl00_MainContent_AmountRangeFrom").value = '';
        document.querySelector("#ctl00_MainContent_AmountRangeTo").value = '';
        document.querySelector("#MainContent_Location").value = '';
        document.querySelector("#MainContent_Accounts").value = document.querySelector("#MainContent_Accounts").querySelectorAll("option")[0].value;
        document.querySelector("#MainContent_TransactionType").value = document.querySelector("#MainContent_TransactionType").querySelectorAll("option")[0].value;
        document.querySelector("#MainContent_ContinueButton").click();

        var data = bb_token_data ? bb_token_data["data"] : [];

        function collect_data() {
            return new Promise(async function (resolve, reject) {

                if (!running) { reject(); } // * CHECK IF PAUSED

                try {
                    await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });

                    if (!running) { reject(); } // * CHECK IF PAUSED

                    var transactions = document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody").length - 1].querySelectorAll("tr");
                    for (transaction of transactions) {
                        var transaction_data = {};
                        var date_time = transaction.querySelectorAll("td")[0].innerText;
                        var e_date = date_time.substr(0, date_time.indexOf("\ ")).split(/\//gm);
                        var e_time = date_time.substr(date_time.indexOf("\ ") + 1);
                        var t_date = new Date(e_date[2], e_date[0] - 1, e_date[1]);
                        t_date.setHours(e_time.replace(/[^a-zA-Z]/gm, "").toLowerCase() === "am" ? Number(e_time.substr(0, e_time.indexOf("\:"))) != 12 ? Number(e_time.substr(0, e_time.indexOf("\:"))) : 0 : Number(e_time.substr(0, e_time.indexOf("\:"))) != 12 ? Number(e_time.substr(0, e_time.indexOf("\:"))) + 12 : Number(e_time.substr(0, e_time.indexOf("\:"))));
                        t_date.setMinutes(Number((e_time.substr(e_time.indexOf("\:") + 1)).replace(/[^0-9]/gm, "")));
                        transaction_data["date"] = t_date.toISOString();
                        transaction_data["time"] = e_time;
                        transaction_data["account"] = transaction.querySelectorAll("td")[1].innerText;
                        transaction_data["location"] = transaction.querySelectorAll("td")[3].innerText;
                        transaction_data["type"] = transaction.querySelectorAll("td")[4].innerText;
                        transaction_data["amount"] = Number((transaction.querySelectorAll("td")[5].innerText).replace(/[^0-9\.]/gm, ""));
                        transaction_data["id"] = uuid_v4();
                        data.push(transaction_data);
                    }
                    resolve();
                } catch (e) {
                    reject(e);
                }
            })
        }

        // * WORKAROUND IMPLEMENTED FOR SERVER LIMIT

        function get_current_page() {
            return Number(document.querySelector(".rgCurrentPage").innerText);
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

        var current_page = bb_token_valid ? bb_token_data["current_page"] : null;
        var refresh_interval = 8;

        if (bb_token_valid) {
            nlog("navigating to last processed page", current_page, "target page", `${current_page + 1}`);
            await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
            while (!find_node_with_inner_text(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"), `${current_page + 1}`)) {
                nlog("page link not found, navigating to more results");
                document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelector("[title=\"Next Pages\"]").click();
                await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
                nlog("waiting for timeout");
                await wait_for_timeout(3000);
            }
            nlog(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"));
            nlog("about to click on link with inner text", `${current_page + 1}`);
            find_node_with_inner_text(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"), `${current_page + 1}`).click();
            await wait_for_inner_text(".rgCurrentPage", `${current_page + 1}`);

            await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
        }

        await collect_data();

        nlog("finished initial collect_data");

        if (document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody").length > 1) { // IF MORE THAN ONE PAGE
            try {
                while ((current_page = get_current_page()) < get_pages()) {

                    // * CHECKPOINT
                    if (!running) { nlog("user initiated stop"); return; }

                    nlog("moving onto next page");

                    if (current_page % refresh_interval === 0) {
                        nlog("pausing collection to reload");
                        var bb_token = uuid_v4();
                        nlog(bb_token);
                        var body = { "bb_token": bb_token, "data": data, "current_page": current_page };
                        await function () {
                            return new Promise(function (resolve, reject) {
                                chrome.storage.local.set({ bb_token: body }, function () {
                                    window.location.href = `${eaccounts_url}?bb_token=${bb_token}`;
                                })
                            })
                        }()
                    }

                    try {
                        find_node_with_inner_text(document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelectorAll("a"), `${current_page + 1}`).click();
                    } catch (e) {
                        nlog("no more a elements with matching inner text");
                        try {
                            document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody")[0].querySelector("[title=\"Next Pages\"]").click();
                        } catch (e) {
                            nlog("could not find element with selector [title=\"Next Pages\"]");
                            nlog(e);
                            return;
                        }
                    }

                    // * CHECKPOINT
                    if (!running) { nlog("user initiated stop"); return; }

                    await wait_for_inner_text(".rgCurrentPage", `${current_page + 1}`);
                    await collect_data();
                }
            } catch (e) {
                nlog("an error occured");
                nlog(e)
            }
        }

        // * CHECKPOINT
        if (!running) { nlog("user initiated stop"); return; }

        chrome.storage.local.set({ bb_token: {}, data: data, last_update: new Date().toLocaleString("en-US", { timeZoneName: 'short' }) }, function () {
            nlog("transaction history stored in local storage");
        })

        nlog("data collection complete!");
        running = false;
        wip_title.innerText = "Data Collection Complete!";
        wip_analyze.classList.remove(["bb-hidden"]);
        wip_stop.value = "Awesome";

    } catch (e) {
        running = false;
        work_in_progress.classList.add(["bb-hidden"]);
        nlog("an error occurred!");
        nlog(e);
    }
}

if (bb_token_param) {
    nlog(bb_token_param);
    chrome.storage.local.get(["bb_token"], function (result) {
        if (Object.keys(result).includes("bb_token")) {
            if (result["bb_token"] ? result["bb_token"]["bb_token"] === bb_token_param : false) {
                bb_token_data = result["bb_token"];
                bb_token_valid = true;
                main();
            } else {
                nlog("invalid bb_token")
            }
        }
    })
}

var toggle_button = document.createElement("input");
toggle_button.value = "Begin";
toggle_button.type = "button";
toggle_button.classList.add(["button"])
toggle_button.onclick = async function (e) {
    e.preventDefault();
    await main();
}

var toggle_analyze = document.createElement("input");
toggle_analyze.value = "Analyze";
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
document.body.insertBefore(work_in_progress, document.body.lastChild);

nlog("ready to start budgeting!");