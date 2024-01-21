import chromeP from 'webext-polyfill-kinda';
import {isBackground} from 'webext-detect-page';
import {isUrlPermittedByManifest} from 'webext-permissions';
import {getTabUrl} from 'webext-tools';
import alert from 'webext-alert';
import {executeFunction, isScriptableUrl} from 'webext-content-scripts';

const contextMenuId = 'webext-domain-permission-toggle:add-permission';
let globalOptions: Options;

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
	console.log('updateItemRaw', {checked, enabled});
	chrome.contextMenus.update(contextMenuId, {
		checked,
		enabled,
	});
}

async function updateItem(url?: string): Promise<void> {
	console.trace('updateItem', {url});
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

		// Manifest permissions can't be removed; this disables the toggle on those domains
		const isDefault = isUrlPermittedByManifest(url);

		updateItemRaw({
			enabled: !isDefault,

			// We might have temporary permission as part of `activeTab`, so it needs to be properly checked
			checked: isDefault || await isOriginPermanentlyAllowed(origin),
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
async function setPermission(url: string | undefined, request: boolean): Promise<boolean> {
	// TODO: Ensure that URL is in `optional_permissions`
	// TODO: https://github.com/fregante/webext-domain-permission-toggle/issues/37
	const permissionData = {
		origins: [
			new URL(url!).origin + '/*',
		],
	};

	await chromeP.permissions[request ? 'request' : 'remove'](permissionData);

	return chromeP.permissions.contains(permissionData);
}

async function handleTabActivated({tabId}: chrome.tabs.TabActiveInfo): Promise<void> {
	void updateItem(await getTabUrl(tabId) ?? '');
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
		url = tab.url ?? await getTabUrl(tab.id);
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
		void updateItem(url);

		if (tab?.id) {
			try {
				await executeFunction(
					tab.id,
					text => {
						window.alert(text); /* Can't pass a raw native function */
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
export default function addDomainPermissionToggle(options?: Options): void {
	if (!isBackground()) {
		throw new Error('webext-domain-permission-toggle can only be called from a background page');
	}

	if (globalOptions) {
		throw new Error('webext-domain-permission-toggle can only be initialized once');
	}

	const manifest = chrome.runtime.getManifest();

	if (!manifest.permissions?.includes('contextMenus')) {
		throw new Error('webext-domain-permission-toggle requires the `contextMenus` permission');
	}

	if (!chrome.contextMenus) {
		console.warn('chrome.contextMenus is not available');
		return;
	}

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
		throw new TypeError('webext-domain-permission-toggle requires some wildcard hosts to be specified in `optional_permissions` or `optional_host_permissions` (MV3)');
	}

	// Remove any existing context menu item and silence any error
	chrome.contextMenus.remove(contextMenuId, () => chrome.runtime.lastError);

	const contexts: chromeP.contextMenus.ContextType[] = manifest.manifest_version === 2
		? ['page_action', 'browser_action']
		: ['action'];

	chrome.contextMenus.create({
		id: contextMenuId,
		type: 'checkbox',
		checked: false,
		title: globalOptions.title,
		contexts,

		// Note: This is completely ignored by Chrome and Safari. Great. #14
		documentUrlPatterns: optionalHosts,
	});

	chrome.contextMenus.onClicked.addListener(handleClick);
	chrome.tabs.onActivated.addListener(handleTabActivated);
	chrome.tabs.onUpdated.addListener(async (tabId, {status}, {url, active}) => {
		if (active && status === 'complete') {
			void updateItem(url ?? await getTabUrl(tabId) ?? '');
		}
	});
}
