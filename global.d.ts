import type {Tabs, Permissions} from 'webextension-polyfill';

// Only required until https://github.com/fregante/webext-polyfill-kinda/issues/2
declare global {
	namespace browser {
		const tabs: Tabs.Static;
		const permissions: Permissions.Static;
	}
}
