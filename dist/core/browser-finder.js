import { existsSync } from 'fs';
import { execSync } from 'child_process';
const MAC_BROWSERS = [
    { name: 'Google Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
    { name: 'Microsoft Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
    { name: 'Brave Browser', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' },
    { name: 'Arc', path: '/Applications/Arc.app/Contents/MacOS/Arc' },
    { name: 'Chromium', path: '/Applications/Chromium.app/Contents/MacOS/Chromium' },
    { name: 'Opera', path: '/Applications/Opera.app/Contents/MacOS/Opera' },
    { name: 'Vivaldi', path: '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi' },
];
const LINUX_BROWSERS = [
    { name: 'Google Chrome', cmd: 'google-chrome' },
    { name: 'Google Chrome (stable)', cmd: 'google-chrome-stable' },
    { name: 'Chromium', cmd: 'chromium' },
    { name: 'Chromium Browser', cmd: 'chromium-browser' },
    { name: 'Microsoft Edge', cmd: 'microsoft-edge' },
    { name: 'Brave Browser', cmd: 'brave-browser' },
];
const WIN_BROWSERS = [
    { name: 'Microsoft Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
    { name: 'Microsoft Edge', path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' },
    { name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    { name: 'Google Chrome', path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' },
    { name: 'Brave Browser', path: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' },
];
function whichCommand(cmd) {
    try {
        return execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim();
    }
    catch {
        return null;
    }
}
export function findBrowser() {
    const platform = process.platform;
    if (platform === 'darwin') {
        // macOS — check known app paths
        for (const browser of MAC_BROWSERS) {
            if (existsSync(browser.path)) {
                return { name: browser.name, path: browser.path };
            }
        }
    }
    else if (platform === 'win32') {
        // Windows — Edge is built-in, check it first
        for (const browser of WIN_BROWSERS) {
            if (existsSync(browser.path)) {
                return { name: browser.name, path: browser.path };
            }
        }
    }
    else {
        // Linux — check commands on PATH
        for (const browser of LINUX_BROWSERS) {
            const path = whichCommand(browser.cmd);
            if (path) {
                return { name: browser.name, path };
            }
        }
    }
    return null;
}
//# sourceMappingURL=browser-finder.js.map