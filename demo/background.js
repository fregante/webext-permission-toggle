import chromeP from 'webext-polyfill-kinda';
import addPermissionToggle from 'webext-permission-toggle';

console.log('Extension ready. Reload any tab to see the logs.');

addPermissionToggle();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (!tab.url) {
		console.log('No access to tab', tabId);
		return;
	}

	const why = await chromeP.permissions.contains({origins: [tab.url]}) ? 'granted' : 'just because of activeTab';
	console.log('Access to tab', tabId, tab.url, why);
});

(chrome.action ?? chrome.browserAction).onClicked.addListener(async () => chromeP.permissions.request({origins: ['*://*/*']}));

chrome.permissions.onAdded.addListener(permissions => console.log('Permissions added:', permissions));
chrome.permissions.onRemoved.addListener(permissions => console.log('Permissions removed:', permissions));
