import addPermissionToggle from 'webext-permission-toggle';

console.log('Extension ready. Reload any tab to see the logs.');

addPermissionToggle();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status !== 'loading') {
		return;
	}

	if (!tab.url) {
		console.log('No access to tab', tab);
		return;
	}

	const why = await chrome.permissions.contains({origins: [tab.url]}) ? 'granted' : 'just because of activeTab';
	console.log('Access to tab', tabId, tab.url, why);
});

chrome.action.onClicked.addListener(async () => chrome.permissions.request({origins: ['*://*/*']}));

chrome.permissions.onAdded.addListener(permissions => console.log('Permissions added:', permissions));
chrome.permissions.onRemoved.addListener(permissions => console.log('Permissions removed:', permissions));
