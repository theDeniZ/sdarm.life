export type Bindings = {
	DB: D1Database;
	IMAGES: R2Bucket;
	KV: KVNamespace;
	API_KEY: string;
	RESEND_API_KEY: string;
	CF_ZONE_ID?: string;
	CF_PURGE_TOKEN?: string;
};
