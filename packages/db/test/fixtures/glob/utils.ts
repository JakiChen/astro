import fastGlob from 'fast-glob';
import { readFile } from 'fs/promises';
import chokidar from 'chokidar';
import { eq } from 'drizzle-orm';
import { type ResolvedCollectionConfig, type DBDataContext } from '@astrojs/db';

export function createGlob({ db, mode }: Pick<DBDataContext, 'db' | 'mode'>) {
	return async function glob(
		pattern: string,
		opts: {
			into: ResolvedCollectionConfig;
			parse: (params: { file: string; content: string }) => Record<string, any>;
		}
	) {
		// TODO: expose `table`
		const { table } = opts.into as any;
		const fileField = table.file;
		if (!fileField) {
			throw new Error('`file` field is required for glob collections.');
		}
		if (mode === 'dev') {
			chokidar
				.watch(pattern)
				.on('add', async (file) => {
					const content = await readFile(file, 'utf-8');
					const parsed = opts.parse({ file, content });
					await db.insert(table).values({ ...parsed, file });
				})
				.on('change', async (file) => {
					const content = await readFile(file, 'utf-8');
					const parsed = opts.parse({ file, content });
					await db
						.insert(table)
						.values({ ...parsed, file })
						.onConflictDoUpdate({
							target: fileField,
							set: parsed,
						});
				})
				.on('unlink', async (file) => {
					await db.delete(table).where(eq(fileField, file));
				});
		} else {
			const files = await fastGlob(pattern);
			for (const file of files) {
				const content = await readFile(file, 'utf-8');
				const parsed = opts.parse({ file, content });
				await db.insert(table).values({ ...parsed, file });
			}
		}
	};
}

export function asJson(params: { file: string; content: string }) {
	try {
		return JSON.parse(params.content);
	} catch (e) {
		throw new Error(`Error parsing ${params.file}: ${e.message}`);
	}
}
