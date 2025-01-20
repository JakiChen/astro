import { createRequire } from 'node:module';
import type { AstroSettings } from '../../types/astro.js';
import { adobe } from './providers/adobe.js';
import { google } from './providers/google.js';
import { local } from './providers/local.js';
import type { FontProvider, ResolvedFontProvider } from './types.js';
import { fileURLToPath } from 'node:url';

/** TODO: */
export const fontProviders = {
	adobe,
};

function resolveEntrypoint(settings: AstroSettings, entrypoint: string): string {
	const require = createRequire(settings.config.root);

	try {
		return require.resolve(entrypoint);
	} catch {
		return fileURLToPath(new URL(entrypoint, settings.config.root));
	}
}

export async function resolveProviders({
	settings,
	providers: _providers,
}: { settings: AstroSettings; providers: Array<FontProvider<any>> }): Promise<
	Array<ResolvedFontProvider>
> {
	const providers = [google(), local(), ..._providers];
	const resolvedProviders: Array<ResolvedFontProvider> = [];

	for (const { name, entrypoint, config } of providers) {
		const id = resolveEntrypoint(settings, entrypoint);
		const { provider } = await import(id);
		resolvedProviders.push({ name, config, provider });
	}

	return resolvedProviders;
}
