/** 
 * TODO: Check manifest version of Chrome manifest and handle each version accordingly
 */

const start_time = new Date();
const fs = require('fs-extra');
const { exec } = require("child_process");

const config = require("./build_config.json");
const source_manifest = JSON.parse(fs.readFileSync(config.source.directory + "/manifest.json").toString());
const force_mode = (process.argv.includes("--ignore") || process.argv.includes("--force"));
const will_package = process.argv.includes("--all") || process.argv.includes("--package");
const will_copy = process.argv.includes("--copy") || process.argv.includes("--all");
const version_exists = fs.existsSync(`./releases/${config.project_name_short}_v${source_manifest["version"]}_${config.source.platform}.zip`);

var targets = config.targets;

//* manifest updates should happen here

for (var target of targets) {
    if (!fs.existsSync(target.directory + "/manifest.json")) {
        fs.writeFileSync(target.directory + "/manifest.json", JSON.stringify({ manifest_version: target.manifest_version }, null, 2));
    };
    target.manifest = JSON.parse(fs.readFileSync(target.directory + "/manifest.json").toString());
}

/**  */

if (config["enforce_version_control"] && will_package && version_exists && !force_mode) {
    console.log("\x1b[33m%s\x1b[0m", "packaged version already exists!");
    process.exit(9);
}

if (config["enforce_version_control"] && will_package && targets.map(e => e.manifest.version).includes(source_manifest.version) && !force_mode) {
    console.log("\x1b[33m%s\x1b[0m", "source manifest version not updated!");
    process.exit(9);
}

if (will_copy) {
    const src_files = fs.readdirSync(config.source.directory);

    for (var target of targets) {
        for (var file of src_files) {
            if (file.includes("manifest.json")) {
                continue;
            }
            if (!target.patch.includes(file)) {
                fs.copySync(config.source.directory + "/" + file, target.directory + "/" + file);
            } else {
                var source_file = fs.readFileSync(config.source.directory + "/" + file, { encoding: "utf-8" }).toString();
                var target_file;
                if (config.source.platform == "chrome") {
                    if (source_manifest.manifest_version == 3 && target.manifest_version == 2) {
                        console.log("parsing manifest v3 to manifest v2 for file " + file);
                        target_file = source_file
                            .replace(/chrome\.action/gm, "browser.browserAction")
                            .replace(/chrome\./gm, "browser\.");
                    } else if (source_manifest.manifest_version == 2 && target.manifest_version == 3) {
                        console.log("bump manifest version not yet supported");
                        process.exit(1);
                    } else {
                        console.log("manifest is equal, skipping parsing for file " + file);
                        target_file = source_file;
                    }
                } else {
                    console.log("platform not yet supported for directory sync");
                    process.exit(1);
                }
                fs.writeFileSync(target.directory + "/" + file, target_file);
            }
        }
    }

    console.log("finished copying " + src_files.length + " files from chrome into firefox & opera directories");

    process.exit(0);

    var excluded_fields = ["manifest_version"];

    for (field in source_manifest) {
        if (excluded_fields.includes(field)) {
            continue;
        }
        if (field === "web_accessible_resources") {
            var resources = source_manifest[field][0]["resources"];
            var new_resources = []
            for (resource of resources) {
                new_resources.push(resource);
            }
            firefox_manifest[field] = new_resources;
            continue;
        }
        if (field == "action") {
            var actions = source_manifest[field];
            firefox_manifest["browser_action"] = {};
            for (action in actions) {
                firefox_manifest["browser_action"][action] = source_manifest[field][action];
            }
            continue;
        }
        firefox_manifest[field] = source_manifest[field];
    }

    fs.writeFileSync("./src/firefox/manifest.json", JSON.stringify(firefox_manifest, null, 2));
    fs.writeFileSync("./src/opera/manifest.json", JSON.stringify(firefox_manifest, null, 2));

    console.log("updated firefox & opera manifests using chrome manifest");

    if (process.argv.includes("--git") || process.argv.includes("--all")) {
        console.log("pushing synced directories to github");
        var package_shell = exec(`git.sh \"platform directory sync\"`);
    }
} else {
    console.log("skipped copying");
}

function end_message() {
    console.log("\x1b[36m%s\x1b[0m", "process finished in " + ((new Date() - start_time) / 1000) + " seconds");
}

if (process.argv.includes("--package") || process.argv.includes("--all")) {
    console.log("creating zip files");
    var package_shell = exec(`package.sh \"v${source_manifest["version"]}\"`);
    package_shell.on("exit", function () {
        console.log(`release ${source_manifest["version"]} created for chrome, firefox, and opera`);
        if (process.argv.includes("--git") || process.argv.includes("--all")) {
            console.log("committing and pushing changes");
            var package_shell = exec(`git.sh \"version v${source_manifest["version"]}\"`);
            package_shell.on("exit", function () {
                console.log(`committed and pushed ${source_manifest["version"]} to github`);
                end_message();
            })
        } else {
            console.log("skipping push to github");
            end_message();
        }
    })
} else {
    console.log("skipping zip files");
    end_message();
}