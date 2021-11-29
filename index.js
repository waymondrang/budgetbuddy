var log_history = [];

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

var toggle_button = document.createElement("input");
toggle_button.value = "Begin";
toggle_button.type = "button";
toggle_button.classList.add(["button"])
toggle_button.onclick = async function (e) { // * BEGIN DATA COLLECTION
    e.preventDefault();
    nlog("budget buddy activated!");

    running = true;
    toggle_button.disabled = true;

    try {
        work_in_progress.classList.remove(["bb-hidden"]);

        // * FORM VALIDATION

        document.querySelector("#ctl00_MainContent_BeginRadDateTimePicker_dateInput").value = '9/1/2021 12:00 AM';
        document.querySelector("#ctl00_MainContent_EndRadDateTimePicker_dateInput").value = '6/10/2022 12:00 AM'; 0
        document.querySelector("#ctl00_MainContent_AmountRangeFrom").value = '';
        document.querySelector("#ctl00_MainContent_AmountRangeTo").value = '';
        document.querySelector("#MainContent_Location").value = '';
        document.querySelector("#MainContent_Accounts").value = document.querySelector("#MainContent_Accounts").querySelectorAll("option")[0].value;
        document.querySelector("#MainContent_TransactionType").value = document.querySelector("#MainContent_TransactionType").querySelectorAll("option")[0].value;
        document.querySelector("#MainContent_ContinueButton").click();

        var t_bodies;
        var data = [];

        function collect_data() {
            return new Promise(async function (resolve, reject) {

                // * CHECKPOINT
                if (!running) {
                    reject();
                }

                try {
                    await wait_for_selector("#MainContent_LoadingPanelAction", { hidden: true });
                    t_bodies = document.querySelector("#ctl00_MainContent_ResultRadGrid_ctl00").querySelectorAll("tbody");
                    var transactions = t_bodies[t_bodies.length - 1].querySelectorAll("tr");
                    for (transaction of transactions) {
                        var transaction_data = {};
                        var date_time = transaction.querySelectorAll("td")[0].innerText;
                        var e_date = date_time.substr(0, date_time.indexOf("\ ")).split(/\//gm);
                        var e_time = date_time.substr(date_time.indexOf("\ ") + 1);
                        var t_date = new Date(e_date[2], e_date[0] - 1, e_date[1]);
                        console.log(e_time);
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

        // ! CODE MAY BREAK IF MORE THAN 10 PAGES

        function get_current_page() {
            return Number(document.querySelector(".rgCurrentPage").innerText);
        }

        function get_pages() {
            return Number(document.querySelector(".rgInfoPart").innerText.split(/\,/gm)[0].trim().replace(/[^0-9\s]/gm, '').trim().split(/\s/gm).at(-1));
        }

        await collect_data();

        nlog("finished initial collect_data");

        var page_links = t_bodies[0].querySelectorAll("a");
        var pages = get_pages();
        var current_page;

        if (t_bodies.length > 1) {
            while ((current_page = get_current_page()) < pages) {
                nlog("moving onto next page");
                page_links[current_page].click();

                // * CHECKPOINT
                if (!running) {
                    nlog("user initiated stop")
                    return;
                }

                await wait_for_inner_text(".rgCurrentPage", `${current_page + 1}`);
                await collect_data();
            }
        }

        // * CHECKPOINT
        if (!running) {
            nlog("user initiated stop")
            return;
        }

        chrome.storage.local.set({ data: data }, function () {
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

nlog("ready to start budgeting");