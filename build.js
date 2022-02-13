/** 
 * TODO: Check manifest version of Chrome manifest and handle each version accordingly
 */

const start_time = new Date();
const fs = require('fs-extra');
const { exec } = require("child_process");

const config = require("./build_config.json");
const source_manifest = JSON.parse(fs.readFileSync(config.source.directory + "/" + "manifest.json").toString());
const force_mode = process.argv.includes("--ignore") || process.argv.includes("--force");
const will_package = process.argv.includes("--all") || process.argv.includes("--package");
const will_copy = process.argv.includes("--copy") || process.argv.includes("--all");
const will_git = process.argv.includes("--git") || process.argv.includes("--all");
const version_exists = fs.existsSync(`./releases/${config.project_name_short}_v${source_manifest["version"]}_${config.source.platform}.zip`);
const browser_platforms = ["firefox"];
const chrome_platforms = ["chrome", "opera", "edge"];
const manifest_ignore = ["manifest_version"];

var targets = config.targets;

var ogl = console.log;
var log = function () {
    a = [];
    a.push(`[${new Date().toLocaleTimeString()}][info] \t`);
    for (var i = 0; i < arguments.length; i++) {
        a.push(arguments[i]);
    }
    ogl.apply(console, a);
};
var warn = function () {
    a = [];
    a.push(`[${new Date().toLocaleTimeString()}][warn] \t`);
    a.push(...arguments);
    ogl.apply(console, a);
};

//* manifest updates should happen here

for (var target of targets) {
    // if (!fs.existsSync(target.directory + "/manifest.json")) {
    //     fs.writeFileSync(target.directory + "/manifest.json", JSON.stringify({ manifest_version: target.manifest_version }, null, 2));
    // };
    target.manifest = { manifest_version: target.manifest_version };
    for (field in source_manifest) {
        if (manifest_ignore.includes(field)) {
            continue;
        }
        if (!source_manifest[field] ||
            Array.isArray(source_manifest[field]) ? !source_manifest[field].length : false ||
                typeof source_manifest[field] === 'object' ? !Object.keys(source_manifest[field]).length : false) {
            warn(field + " field is empty");
            if (config.clean_manifest) continue;
        }
        if (source_manifest.manifest_version == 3 && target.manifest_version == 2) {
            if (field == "web_accessible_resources") {
                target.manifest[field] = source_manifest[field][0].resources;
                continue;
            }
            if (field == "action") {
                target.manifest.browser_action = source_manifest.action;
                continue;
            }
        }
        target.manifest[field] = source_manifest[field];
    }
    fs.writeFileSync(target.directory + "/manifest.json", JSON.stringify(target.manifest, null, 2));
    // target.manifest = JSON.parse(fs.readFileSync(target.directory + "/manifest.json").toString());
}

log("updated " + targets.map(e => e.platform).join(" ") + " manifests using " + config.source.platform + " manifest");

/**  */

if (version_exists) {
    warn("\x1b[33m%s\x1b[0m", "packaged version already exists!");
    if (config["enforce_version_control"] && will_package && !force_mode) process.exit(99);
}

if (targets.map(e => e.manifest.version).includes(source_manifest.version)) {
    warn("\x1b[33m%s\x1b[0m", "source manifest version not updated!");
    if (config["enforce_version_control"] && will_package && !force_mode) process.exit(99);
}

if (will_copy) {
    var src_files = fs.readdirSync(config.source.directory);
    for (var target of targets) {
        for (var file of src_files) {
            if (fs.statSync(config.source.directory + "/" + file).isDirectory()) {
                log("expanding directory " + config.source.directory + "/" + file);
                var directory_files = fs.readdirSync(config.source.directory + "/" + file);
                src_files.push(...directory_files.map(e => file + "/" + e));
                continue;
            }
            if (file.includes("manifest.json")) {
                log("skipping manifest file");
                continue;
            }
            if (!target.patch.includes(file)) {
                log("copying " + (file.length > 30 ? file.substring(0, 30) + "..." : file) + " to " + target.directory + "/" + (file.length > 30 ? file.substring(0, 30) + "..." : file));
                fs.copySync(config.source.directory + "/" + file, target.directory + "/" + file);
            } else {
                log("processing " + file);
                var source_file = fs.readFileSync(config.source.directory + "/" + file, { encoding: "utf-8" }).toString();
                var target_file;
                if (config.source.platform == "chrome") {
                    if (source_manifest.manifest_version == 3 && target.manifest_version == 2) {
                        target_file = browser_platforms.includes(target.platform) ? source_file
                            .replace(/chrome\.action/gm, "browser.browserAction")
                            .replace(/chrome\./gm, "browser\.") :
                            source_file
                                .replace(/chrome\.action/gm, "chrome.browserAction");
                    } else if (source_manifest.manifest_version == 2 && target.manifest_version == 3) {
                        log("bump manifest version not yet supported");
                        process.exit(1);
                    } else {
                        log("manifest is equal, skipping parsing for file " + file);
                        target_file = browser_platforms.includes(target.platform) ? source_file
                            .replace(/chrome\./gm, "browser\.") :
                            source_file;
                    }
                } else {
                    log("platform not yet supported for directory sync");
                    process.exit(1);
                }
                fs.writeFileSync(target.directory + "/" + file, target_file);
                log("finished processing " + file);
            }
        }
    }
    log("finished copying " + src_files.length + " files from " + config.source.platform + " into " + targets.map(e => e.platform).join(" ") + " directories");
    if (will_git) {
        log("pushing synced directories to github");
        var package_shell = exec(`git.sh \"${config.git_messages.directory_sync}\"`);
    }
} else {
    log("skipped copying files");
}

process.on("exit", function (code) {
    log("\x1b[36m" + "process finished in " + ((new Date() - start_time) / 1000) + " seconds with exit code " + code + "\x1b[0m");
})

if (will_package) {
    log(`packaging ${source_manifest["version"]} for ` + targets.map(e => e.platform).join(", ") + " & " + config.source.platform);
    var package_shell = exec(`package.sh \"v${source_manifest["version"]}\"`);
    package_shell.on("exit", function () {
        log(`packaged ${source_manifest["version"]} for ` + targets.map(e => e.platform).join(", ") + " & " + config.source.platform);
        if (will_git) {
            log("committing and pushing changes to github");
            var package_shell = exec(`git.sh \"version v${source_manifest["version"]}\"`);
            package_shell.on("exit", function () {
                log(`committed and pushed ${source_manifest["version"]} to github`);
            });
        } else {
            log("skipping pushing to github");
        }
    })
} else {
    log("skipping zipping files");
}

process.exit(0);