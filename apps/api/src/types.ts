export type Bindings = {
	DB: D1Database;
	/**
	 * Self-hosted Bible verses (`sdarm-bible`, weur). Optional on purpose: an
	 * environment without the binding serves no local translations rather than
	 * failing, which is what lets local and staging run the feature while
	 * production still goes through YouVersion.
	 */
	BIBLE_DB?: D1Database;
	IMAGES: R2Bucket;
	KV: KVNamespace;
	API_KEY: string;
	RESEND_API_KEY: string;
	CF_ZONE_ID?: string;
	CF_PURGE_TOKEN?: string;
	YOUVERSION_API_KEY?: string;
	YOUVERSION_DEVELOPER_ID?: string;
	/**
	 * Workers Rate Limiting binding for the `/api/v1/llm/*` and `/llms.txt`
	 * agent endpoints. Optional: an environment without it (e.g. local dev)
	 * serves those routes unrestricted rather than failing — see
	 * middleware/llm-rate-limit.ts.
	 */
	LLM_RATE_LIMITER?: RateLimit;
};
