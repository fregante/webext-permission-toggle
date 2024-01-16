declare namespace chrome.runtime {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Must match the type on DefinitelyTyped
	interface ManifestV3 extends ManifestBase {
		optional_host_permissions?: string[] | undefined;
	}
}
