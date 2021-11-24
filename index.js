var oglog = console.log;
var nlog = function () {
    a = [];
    a.push('[bb][index.js]\t');
    for (var i = 0; i < arguments.length; i++) {
        a.push(arguments[i]);
    }
    oglog.apply(console, a);
};

const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
const main_container = document.querySelector("#mainContainer");

const css = document.createElement('link');
css.setAttribute("href", chrome.extension.getURL('bb.css'));
css.id = "bb-css";
css.rel = "stylesheet";

var toggle_button = document.createElement("button");
toggle_button.id = "bb-switch";
toggle_button.innerHTML = "start budgeting!"
toggle_button.onclick = function () {
    nlog("budget buddy activated!");
}

head.insertBefore(css, head.lastChild);
main_container.insertBefore(toggle_button, main_container.lastChild);

nlog("ready to start budgeting");