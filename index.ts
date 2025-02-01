import chromePromised from 'webext-polyfill-kinda';
import {isBackground, isChrome} from 'webext-detect';
import {isUrlPermittedByManifest} from 'webext-permissions';
import {findMatchingPatterns} from 'webext-patterns';
import {createContextMenu, getTabUrl} from 'webext-tools';
import alert from 'webext-alert';
import {executeFunction, isScriptableUrl} from 'webext-content-scripts';

const contextMenuId = 'webext-permission-toggle:add-permission';
let globalOptions: Options;

const chromeP = isChrome() && globalThis.chrome?.runtime?.getManifest().manifest_version < 3
	? chromePromised
	: globalThis.chrome;

type Options = {
	/**
	 * The title of the action in the context menu.
	 */
	title?: string;

	/**
	 * If the user accepts the new permission, they will be asked to reload the current tab.
	 * Set a `string` to customize the message and `false` (default) to avoid the reload and its request.
	 */
	reloadOnSuccess?: string | boolean;
};

function assertTab(tab: chrome.tabs.Tab | undefined):
	asserts tab is chrome.tabs.Tab & {id: number} {
	if (!tab?.id) {
		// Don't use non-ASCII characters because Safari breaks the encoding in executeScript.code
		throw new Error('The browser didn\'t supply any information about the active tab.');
	}
}

function assertUrl(url: string | undefined): asserts url is string {
	if (!url) {
		// Don't use non-ASCII characters because Safari breaks the encoding in executeScript.code
		throw new Error('The browser didn\'t supply the current page\'s URL.');
	}
}

function assertScriptableUrl(url: string): void {
	if (!isScriptableUrl(url)) {
		throw new Error(chrome.runtime.getManifest().name + ' can\'t be enabled on this page.');
	}
}

async function isOriginPermanentlyAllowed(origin: string): Promise<boolean> {
	return chromeP.permissions.contains({
		origins: [origin + '/*'],
	});
}

function updateItemRaw({checked, enabled}: chrome.contextMenus.UpdateProperties): void {
	void chrome.contextMenus.update(contextMenuId, {
		checked,
		enabled,
	});
}

async function updateItem(url?: string): Promise<void> {
	if (!url) {
		// No URL means no activeTab, no manifest permission, no granted permission, OR no permission possible (chrome://)
		// Since we can't differentiate between these cases, we can't disable the toggle
		updateItemRaw({
			enabled: true,
			checked: false,
		});
		return;
	}

	if (isScriptableUrl(url)) {
		const {origin} = new URL(url);

		const isDefault = isUrlPermittedByManifest(url);

		// We might have temporary permission as part of `activeTab`, so it needs to be properly checked
		const hasPermission = await isOriginPermanentlyAllowed(origin);

		updateItemRaw({
			// Don't let the user remove a default permission.
			// However, if they removed it via Chrome's UI, let them re-enable it with this toggle.
			// https://github.com/fregante/webext-permission-toggle/pull/54
			enabled: !isDefault || !hasPermission,
			checked: hasPermission,
		});
		return;
	}

	// We know the URL, and we know it's not scriptable (about:blank, chrome://, etc.)
	updateItemRaw({
		enabled: false,
		checked: false,
	});
}

/**
 * Requests or removes the host permission for the specified tab
 * @returns Whether the permission exists after the request/removal
 */
async function setPermission(url: string, request: boolean): Promise<boolean> {
	const permissionData = {
		origins: [
			new URL(url).origin + '/*',
		],
	};

	if (request) {
		await chromeP.permissions.request(permissionData);
	} else {
		// The user, browser or extension might have granted permissions broader than the exact origin we find here.
		// https://github.com/fregante/webext-permission-toggle/issues/37
		// This might also remove a `*://*/*` permission if granted, which might unexpected but "technically correct" since, after this successful removal, the extension will no longer have access to the current domain, as requested.
		const {origins = []} = await chromeP.permissions.getAll();
		const matchingPatterns = findMatchingPatterns(url, ...origins);
		console.debug('Removing permissions:', ...matchingPatterns);
		await chromeP.permissions.remove({
			origins: matchingPatterns,
		});
	}

	return chromeP.permissions.contains(permissionData);
}

async function handleTabActivated({tabId}: chrome.tabs.TabActiveInfo): Promise<void> {
	void updateItem(await getTabUrl(tabId) ?? '');
}

async function handleWindowFocusChanged(windowId: number): Promise<void> {
	const [tab] = await chromeP.tabs.query({
		active: true,
		windowId,
	});

	void updateItem(tab?.url);
}

async function handleClick(
	{checked, menuItemId}: chrome.contextMenus.OnClickData,
	tab?: chrome.tabs.Tab,
): Promise<void> {
	if (menuItemId !== contextMenuId) {
		return;
	}

	let url: string | undefined;

	try {
		assertTab(tab);
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `tab.url` can be an empty string
		url = tab.url || await getTabUrl(tab.id);
		assertUrl(url);
		assertScriptableUrl(url);
		const permissionExistsNow = await setPermission(url, checked!);
		const settingWasSuccessful = permissionExistsNow === checked;
		// If successful, Chrome already natively updated the context menu item.
		if (!settingWasSuccessful) {
			updateItemRaw({
				checked: permissionExistsNow,
			});
		}

		if (permissionExistsNow && globalOptions.reloadOnSuccess) {
			void executeFunction(tab.id, (message: string) => {
				if (confirm(message)) {
					location.reload();
				}
			}, globalOptions.reloadOnSuccess);
		}
	} catch (error) {
		// Delay updating the context menu item because of spurious events and activeTab race conditions
		// https://github.com/fregante/webext-permission-toggle/pull/45
		setTimeout(updateItem, 500, url);

		if (tab?.id) {
			try {
				// TODO: Drop after https://github.com/fregante/webext-alert/issues/2
				await executeFunction(
					tab.id,
					text => {
						globalThis.alert(text); /* Can't pass a raw native function */
					},
					String(error),
				);
			} catch {
				void alert(String(error));
			}
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
export default function addPermissionToggle(options?: Options): void {
	if (!isBackground()) {
		throw new Error('webext-permission-toggle can only be called from a background page');
	}

	if (globalOptions) {
		throw new Error('webext-permission-toggle can only be initialized once');
	}

	const manifest = chrome.runtime.getManifest();

	globalOptions = {
		title: `Enable ${manifest.name} on this domain`,
		reloadOnSuccess: false,
		...options,
	};

	if (globalOptions.reloadOnSuccess === true) {
		globalOptions.reloadOnSuccess = `Do you want to reload this page to apply ${manifest.name}?`;
	}

	const optionalHosts = [
		...manifest.optional_permissions ?? [],
		...manifest.optional_host_permissions as string[] ?? [],
	].filter((permission: string) => permission === '<all_urls>' || permission.includes('*'));

	if (optionalHosts.length === 0) {
		throw new TypeError('webext-permission-toggle requires some wildcard hosts to be specified in `optional_permissions` (MV2) or `optional_host_permissions` (MV3)');
	}

	const contexts: chrome.contextMenus.ContextType[] = manifest.manifest_version === 2
		? ['page_action', 'browser_action']
		: ['action'];

	chrome.contextMenus.onClicked.addListener(handleClick);
	chrome.tabs.onActivated.addListener(handleTabActivated);
	// Chrome won't fire `onFocusChanged` if the window is clicked when a context menu is open
	// https://github.com/fregante/webext-permission-toggle/pull/60
	chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);
	chrome.tabs.onUpdated.addListener(async (tabId, {status}, {url, active}) => {
		if (active && status === 'complete') {
			void updateItem(url ?? await getTabUrl(tabId) ?? '');
		}
	});

	void createContextMenu({
		id: contextMenuId,
		type: 'checkbox',
		checked: false,
		title: globalOptions.title,
		contexts,

		// Note: This is completely ignored by Chrome #14
		// https://github.com/w3c/webextensions/issues/755#issuecomment-2628772400
		documentUrlPatterns: optionalHosts,
	});
}
