browser.runtime.onMessage.addListener(function (request) {
    if (request === "analyze") {
        console.log(request);
        browser.tabs.create({ 'url': browser.runtime.getURL("./build/index.html") });
    }
});

browser.browserAction.onClicked.addListener((tab) => {
    browser.tabs.create({ 'url': browser.runtime.getURL("./build/index.html") });
});