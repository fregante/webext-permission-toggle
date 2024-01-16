import addDomainPermissionToggle from '..';

addDomainPermissionToggle();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (!tab.url) {
		console.log('No access to tab', tabId);
		return;
	}

	console.log('Access to tab', tabId, tab.url);
	chrome.scripting.executeScript({
		target: {tabId},
		function() {
			document.body.style.backgroundColor = 'yellow';
			console.log('chrome.tabs.onUpdated was fired');
		},
	});
});
