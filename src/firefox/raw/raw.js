var oglog = console.log;
var alog = function () {
    a = [];
    a.push('[bb][analyze.js]\t');
    for (var i = 0; i < arguments.length; i++) {
        a.push(arguments[i]);
    }
    log_history.push(a);
    oglog.apply(console, a);
};

var main_container = document.querySelector("#main");

browser.storage.local.get(['data'], function (result) {
    var data = result["data"];
    if (!data) {
        alog("no data found!");
        return;
    }
    console.log(data);
    main_container.innerText = JSON.stringify(data);
})