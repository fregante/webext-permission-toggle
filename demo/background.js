/* eslint-disable n/no-extraneous-import, import-x/no-extraneous-dependencies -- Demo */
import addPermissionToggle from 'webext-permission-toggle';
import {localWebExtAlertHtml} from 'webext-alert';
import localPage from 'url:webext-alert/page.html';

localWebExtAlertHtml(localPage);

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
