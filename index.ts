import {getManifestPermissions} from 'webext-additional-permissions';

const contextMenuId = 'webext-domain-permission-toggle:add-permission';
let currentTabId: number;
let globalOptions: Options;

interface Options {
	/**
	 * The title of the action in the context menu.
	 */
	title?: string;

	/**
	 * If the user accepts the new permission, they will be asked to reload the current tab.
	 * Set a `string` to customize the message and `false` to avoid the reload and its request.
	 */
	reloadOnSuccess?: string | boolean;
}

// @ts-ignore
async function p<T>(fn, ...args): Promise<T> {
	return new Promise((resolve, reject) => {
		// @ts-ignore
		fn(...args, result => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result);
			}
		});
	});
}

async function isOriginPermanentlyAllowed(origin: string): Promise<boolean> {
	return p(chrome.permissions.contains, {
		origins: [
			origin + '/*'
		]
	});
}

function createMenu(): void {
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

function updateItem({tabId}: {tabId: number}): void {
	chrome.tabs.executeScript(tabId, {
		code: 'location.origin'
	}, async ([origin] = []) => {
		const settings = {
			checked: false,
			enabled: true
		};
		if (!chrome.runtime.lastError && origin) {
			// Manifest permissions can't be removed; this disables the toggle on those domains
			const manifestPermissions = await getManifestPermissions();
			const isDefault = manifestPermissions.origins.some(permission => permission.startsWith(origin));
			settings.enabled = !isDefault;

			// We might have temporary permission as part of `activeTab`, so it needs to be properly checked
			settings.checked = isDefault || await isOriginPermanentlyAllowed(origin);
		}

		chrome.contextMenus.update(contextMenuId, settings);
	});
}

async function handleClick({wasChecked, menuItemId}: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
	if (menuItemId !== contextMenuId || !tab) {
		return;
	}

	try {
		const successful = await p(wasChecked ? chrome.permissions.remove : chrome.permissions.request, {
			origins: [
				new URL(tab.url!).origin + '/*'
			]
		});

		if (wasChecked && successful) {
			chrome.contextMenus.update(contextMenuId, {
				checked: false
			});
		}

		if (!wasChecked && successful && globalOptions.reloadOnSuccess) {
			// Firefox doesn't support `confirm()` from the background page.
			// JSON.stringify escapes the string to avoid self-XSS
			chrome.tabs.executeScript({
				code: `confirm(${JSON.stringify(globalOptions.reloadOnSuccess)}) && location.reload()`
			});
		}
	} catch (error) {
		console.error(error.message);
		alert(`Error: ${error.message}`);
		updateItem({tabId: tab.id!});
	}
}

/**
 * Adds an item to the browser action icon's context menu.
 * The user can access this menu by right clicking the icon. If your extension doesn't have any action or
 * popup assigned to the icon, it will also appear with a left click.
 *
 * @param options {Options}
 */
export default function addDomainPermissionToggle(options?: Options): void {
	if (globalOptions) {
		throw new Error('webext-domain-permission-toggle can only be initialized once');
	}

	const {name} = chrome.runtime.getManifest();
	globalOptions = {title: `Enable ${name} on this domain`,
		reloadOnSuccess: `Do you want to reload this page to apply ${name}?`, ...options};

	chrome.contextMenus.onClicked.addListener(handleClick);
	chrome.tabs.onActivated.addListener(updateItem);
	chrome.tabs.onUpdated.addListener((tabId, {status}) => {
		if (currentTabId === tabId && status === 'complete') {
			updateItem({tabId});
		}
	});

	createMenu();
}
