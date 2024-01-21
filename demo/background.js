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
