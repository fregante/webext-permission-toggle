// https://github.com/bfred-it/webext-domain-permission-toggle

(() => {
	const contextMenuId = 'webext-domain-permission-toggle:add-permission';

	let currentTabId;
	let globalOptions;

	async function p(fn, ...args) {
		return new Promise((resolve, reject) => fn(...args, r => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(r);
			}
		}));
	}

	function isOriginPermanentlyAllowed(origin) {
		return p(chrome.permissions.contains, {
			origins: [
				origin + '/*'
			]
		});
	}

	function createMenu() {
		chrome.contextMenus.remove(contextMenuId, () => chrome.runtime.lastError);
		chrome.contextMenus.create({
			id: contextMenuId,
			type: 'checkbox',
			checked: false,
			title: globalOptions.title,
			contexts: [
				'page_action',
				'browser_action'
			],
			documentUrlPatterns: [
				'http://*/*',
				'https://*/*'
			]
		});
	}

	function updateItem({tabId}) {
		chrome.tabs.executeScript(tabId, {
			code: 'location.origin'
		}, async ([origin] = []) => {
			// We might have temporary permission as part of `activeTab`,
			// so it needs to be properly checked
			const checked = Boolean(origin && await isOriginPermanentlyAllowed(origin));
			chrome.contextMenus.update(contextMenuId, {checked});

			return chrome.runtime.lastError; // Silence error
		});
	}

	async function handleClick({wasChecked, menuItemId}, {tabId, url}) {
		if (menuItemId !== contextMenuId) {
			return;
		}

		try {
			const successful = await p(wasChecked ? chrome.permissions.remove : chrome.permissions.request, {
				origins: [
					new URL(url).origin + '/*'
				]
			});

			if (wasChecked && successful) {
				chrome.contextMenus.update(contextMenuId, {
					checked: false
				});
			}

			if (!wasChecked && successful && globalOptions.reloadOnSuccess && confirm(globalOptions.reloadOnSuccess)) {
				chrome.tabs.reload(tabId);
			}
		} catch (error) {
			console.error(error.message);
			alert(`Error: ${error.message}`);
			updateItem({tabId});
		}
	}

	function addContextMenu(options) {
		if (globalOptions) {
			throw new Error('webext-domain-permission-toggle can only be initialized once');
		}

		const {name} = chrome.runtime.getManifest();
		globalOptions = Object.assign({
			title: `Enable ${name} on this domain`,
			reloadOnSuccess: `Do you want to reload this page to apply ${name}?`
		}, options);

		chrome.contextMenus.onClicked.addListener(handleClick);
		chrome.runtime.onInstalled.addListener(createMenu);
		chrome.tabs.onActivated.addListener(updateItem);
		chrome.tabs.onUpdated.addListener((tabId, {status}) => {
			if (currentTabId === tabId && status === 'complete') {
				updateItem({tabId});
			}
		});
	}

	if (typeof module === 'object') {
		module.exports = {addContextMenu};
	} else {
		window.DCE = {addContextMenu};
	}
})();
