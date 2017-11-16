// https://github.com/bfred-it/webext-domain-permission-toggle

const DCE = {
	addContextMenu(options) {
		const contextMenuId = 'webext-dynamic-content-scripts:add-permission';

		const {name: extensionName} = chrome.runtime.getManifest();

		options = Object.assign({
			title: `Enable ${extensionName} on this domain`,
			reloadOnSuccess: `Do you want to reload this page to apply ${extensionName}?`
		}, options);

		chrome.contextMenus.create({
			id: contextMenuId,
			title: options.title,
			contexts: ['page_action'],
			documentUrlPatterns: [
				'http://*/*',
				'https://*/*'
			]
		});

		chrome.contextMenus.onClicked.addListener(async ({menuItemId}, {tabId, url}) => {
			if (menuItemId !== contextMenuId) {
				return;
			}
			chrome.permissions.request({
				origins: [
					`${new URL(url).origin}/*`
				]
			}, granted => {
				if (chrome.runtime.lastError) {
					alert(`Error: ${chrome.runtime.lastError.message}`);
				} else if (granted && options.reloadOnSuccess && confirm(options.reloadOnSuccess)) {
					chrome.tabs.reload(tabId);
				}
			});
		});
	}
};

if (typeof module === 'object') {
	module.exports = DCE;
}
