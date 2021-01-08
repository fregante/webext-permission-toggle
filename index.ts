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

// @ts-expect-error
async function p<T>(fn, ...args): Promise<T> {
	return new Promise((resolve, reject) => {
		// @ts-expect-error
		fn(...args, result => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(result);
			}
		});
	});
}

async function executeCode(tabId: number, function_: string | ((...args: any[]) => void), ...args: any[]): Promise<any[]> {
	return p(chrome.tabs.executeScript, tabId, {
		code: `(${function_.toString()})(...${JSON.stringify(args)})`
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

		// Note: This is completely ignored by Chrome and Safari. Great.
		// TODO: Read directly from manifest and verify that the requested URL matches
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

async function togglePermission(tab: chrome.tabs.Tab, toggle: boolean): Promise<void> {
	const permissionData = {
		origins: [
			new URL(tab.url!).origin + '/*'
		]
	};

	if (!toggle) {
		return p(chrome.permissions.remove, permissionData);
	}

	const userAccepted = await p(chrome.permissions.request, permissionData);
	if (!userAccepted) {
		chrome.contextMenus.update(contextMenuId, {
			checked: false
		});
		return;
	}

	if (globalOptions.reloadOnSuccess) {
		void executeCode(tab.id!, (message: string) => {
			if (confirm(message)) {
				location.reload();
			}
		}, globalOptions.reloadOnSuccess);
	}
}

async function handleClick({checked, menuItemId}: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
	if (menuItemId !== contextMenuId) {
		return;
	}

	try {
		await togglePermission(tab!, checked!);
	} catch (error) {
		if (tab?.id) {
			executeCode(tab.id, 'alert' /* Can't pass a raw native function */, String(error)).catch(() => {
				alert(error); // One last attempt
			});
			updateItem({tabId: tab.id});
		}

		throw error;
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
