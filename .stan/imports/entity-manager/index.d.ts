import { EntityMap, TranscodeRegistry, ConditionalProperty, Exactify, PropertiesOfType, TranscodableProperties, FlattenEntityMap, Transcodes, MutuallyExclusive, NotNever, DefaultTranscodeRegistry, SortOrder } from '@karmaniverous/entity-tools';
import * as z from 'zod';
import { z as z$1, ZodType } from 'zod';
import { BatchProcessOptions } from '@karmaniverous/batch-process';

/**
 * Default type parameter for {@link ConfigMap | `ConfigMap`}.
 *
 * @category EntityManager
 */
interface BaseConfigMap {
    EntityMap: EntityMap;
    HashKey: string;
    RangeKey: string;
    ShardedKeys: string;
    UnshardedKeys: string;
    TranscodedProperties: string;
    TranscodeRegistry: TranscodeRegistry;
}

/**
 * Defines a single time period in an entity sharding strategy.
 *
 * @category EntityManager
 * @protected
 */
interface ShardBump {
    /**
     * The timestamp marking the beginning of the time period. Must be a non-negative integer.
     *
     * This value must be unique across all {@link ShardBump | `ShardBumps`} for the entity.
     */
    timestamp: number;
    /**
     * The number of bits per character in the bump's shard space. For example, `0` yields a single shard per character, and a value of `2` would yield 4 shards per character.
     *
     * This value must be an integer between `1` and `5` inclusive.
     */
    charBits: number;
    /**
     * The number of characters used to represent the bump's shard key.
     *
     * This value must be an integer between `0` and `40` inclusive. Note that more than a few characters will result in an impossibly large shard space!   *
     * A ShardBump with `chars` of `2` and `charBits` of `3` would yield a two-character shard key with a space of 16 shards.
     */
    chars: number;
}

/**
 * Configuration object for an {@link EntityManager | `EntityManager`} instance.
 *
 * @typeParam C - {@link ConfigMap | `ConfigMap`} that defines the configuration's {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityManager
 */
type Config<C extends BaseConfigMap = BaseConfigMap> = ConditionalProperty<'entities', keyof Exactify<C['EntityMap']>, {
    [E in keyof Exactify<C['EntityMap']>]: {
        defaultLimit?: number;
        defaultPageSize?: number;
        shardBumps?: ShardBump[];
        timestampProperty: Extract<Extract<C['TranscodedProperties'], PropertiesOfType<C['EntityMap'][E], number>>, TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>>;
        uniqueProperty: Extract<Extract<C['TranscodedProperties'], keyof C['EntityMap'][E]>, TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>>;
    };
}> & ConditionalProperty<'generatedProperties', C['ShardedKeys'] | C['UnshardedKeys'], ConditionalProperty<'sharded', C['ShardedKeys'], Record<C['ShardedKeys'], (C['TranscodedProperties'] & TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>)[]>> & ConditionalProperty<'unsharded', C['UnshardedKeys'], Record<C['UnshardedKeys'], (C['TranscodedProperties'] & TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>)[]>>> & ConditionalProperty<'propertyTranscodes', C['TranscodedProperties'] & TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>, {
    [P in C['TranscodedProperties'] & TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>]: PropertiesOfType<C['TranscodeRegistry'], FlattenEntityMap<C['EntityMap']>[P]>;
}> & ConditionalProperty<'transcodes', keyof C['TranscodeRegistry'], Transcodes<C['TranscodeRegistry']>> & {
    generatedKeyDelimiter?: string;
    generatedValueDelimiter?: string;
    hashKey: C['HashKey'];
    indexes?: Record<string, {
        hashKey: C['HashKey'] | C['ShardedKeys'];
        rangeKey: C['RangeKey'] | C['UnshardedKeys'] | (C['TranscodedProperties'] & TranscodableProperties<C['EntityMap'], C['TranscodeRegistry']>);
        projections?: string[];
    }>;
    rangeKey: C['RangeKey'];
    shardKeyDelimiter?: string;
    throttle?: number;
};

/**
 * Validates a type derived from {@link BaseConfigMap | `BaseConfigMap`} to ensure HashKey and RangeKey are both defined and that all sets of special keys are mutually exclusive.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityManager
 * @protected
 */
type ValidateConfigMap<CC extends BaseConfigMap> = MutuallyExclusive<[
    CC['HashKey'],
    CC['RangeKey'],
    CC['ShardedKeys'],
    CC['UnshardedKeys'],
    keyof FlattenEntityMap<CC['EntityMap']>
]> extends true ? NotNever<CC, ['HashKey' | 'RangeKey']> extends true ? CC : Exclude<NotNever<CC, ['HashKey' | 'RangeKey']>, true> : Exclude<MutuallyExclusive<[
    CC['HashKey'],
    CC['RangeKey'],
    CC['ShardedKeys'],
    CC['UnshardedKeys'],
    keyof FlattenEntityMap<CC['EntityMap']>
]>, true>;

/**
 * Generates & validates the map defining defines an {@link EntityManager | `EntityManager`} configuration's {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}.
 *
 * Unspecified properties will default to those defined in {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @typeParam M - {@link BaseConfigMap | `BaseConfigMap`} extension. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityManager
 */
type ConfigMap<M extends Partial<BaseConfigMap> = Partial<BaseConfigMap>> = ValidateConfigMap<{
    EntityMap: 'EntityMap' extends keyof M ? NonNullable<M['EntityMap']> : Record<string, never>;
    HashKey: 'HashKey' extends keyof M ? NonNullable<M['HashKey']> : 'hashKey';
    RangeKey: 'RangeKey' extends keyof M ? NonNullable<M['RangeKey']> : 'rangeKey';
    ShardedKeys: 'ShardedKeys' extends keyof M ? NonNullable<M['ShardedKeys']> : never;
    UnshardedKeys: 'UnshardedKeys' extends keyof M ? NonNullable<M['UnshardedKeys']> : never;
    TranscodedProperties: 'TranscodedProperties' extends keyof M ? NonNullable<M['TranscodedProperties']> : never;
    TranscodeRegistry: 'TranscodeRegistry' extends keyof M ? NonNullable<M['TranscodeRegistry']> : DefaultTranscodeRegistry;
}>;

/**
 * Database-facing record key type from a {@link BaseConfigMap | `ConfigMap`} with required hash & range keys.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityClient
 * @protected
 */
type EntityKey<CC extends BaseConfigMap> = Record<CC['HashKey'] | CC['RangeKey'], string>;

/**
 * Extracts entity tokens from a {@link ConfigMap | `ConfigMap`}.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityManager
 * @protected
 */
type EntityToken<CC extends BaseConfigMap> = Extract<keyof Exactify<CC['EntityMap']>, string>;

/**
 * Storage-facing partial item type from a {@link BaseConfigMap | `ConfigMap`}.
 *
 * Token-agnostic shape used by encoding/decoding, key updates, and
 * (de)hydration services.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityManager
 */
type StorageItem<CC extends BaseConfigMap> = Partial<FlattenEntityMap<CC['EntityMap']> & Record<CC['HashKey'] | CC['RangeKey'] | CC['ShardedKeys'] | CC['UnshardedKeys'], string>> & Record<string, unknown>;

/**
 * A partial {@link StorageItem | `StorageItem`} restricted to keys defined in `C`.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category QueryBuilder
 * @protected
 */
type PageKey<CC extends BaseConfigMap> = Pick<StorageItem<CC>, CC['HashKey'] | CC['RangeKey'] | CC['ShardedKeys'] | CC['UnshardedKeys'] | CC['TranscodedProperties']>;
/**
 * Internal helpers to safely derive index component tokens for an index IT.
 *
 * These helpers avoid direct generic indexing into `CF['indexes'][IT]` which can
 * trigger TS2536. They guard presence and key membership before extracting
 * literal types when available.
 */
type IndexHashKeyOf<CF, IT extends string> = CF extends {
    indexes?: infer I;
} ? I extends Record<string, unknown> ? IT extends keyof I ? I[IT] extends {
    hashKey: infer HK;
} ? HK & string : never : never : never : never;
type IndexRangeKeyOf<CF, IT extends string> = CF extends {
    indexes?: infer I;
} ? I extends Record<string, unknown> ? IT extends keyof I ? I[IT] extends {
    rangeKey: infer RK;
} ? RK & string : never : never : never : never;
/**
 * Derive the union of index token names from a values-first config literal.
 *
 * When CF carries an `indexes` object with preserved literal keys (prefer `as const`),
 * this helper captures the index token union. Falls back to `string` if absent.
 */
type IndexTokensOf<CF> = CF extends {
    indexes?: infer I;
} ? I extends Record<string, unknown> ? Extract<keyof I, string> : string : string;
type HasIndexFor<CF, IT extends string> = CF extends {
    indexes?: infer I;
} ? I extends Record<string, unknown> ? IT extends keyof I ? true : false : false : false;
/**
 * Base index component tokens shared by all indexes
 * (the global hashKey and rangeKey defined in the Config).
 *
 * @category QueryBuilder
 */
type BaseKeyTokens<CC extends BaseConfigMap> = CC['HashKey'] | CC['RangeKey'];
/**
 * Key set for index component tokens when CF/IT identify a concrete index.
 * - Always includes base key tokens (global hash/range).
 * - Conditionally includes index hashKey/rangeKey when they do not collapse
 *   to the base key union.
 *
 * @category QueryBuilder
 */
type PresentIndexTokenSet<CC extends BaseConfigMap, CF, IT extends string> = Record<BaseKeyTokens<CC>, true> & {
    [K in IndexHashKeyOf<CF, IT> as K extends BaseKeyTokens<CC> ? never : K]: true;
} & {
    [K in IndexRangeKeyOf<CF, IT> as K extends BaseKeyTokens<CC> ? never : K]: true;
};
/**
 * Key set for index component tokens when CF does not carry an `indexes` map
 * or IT is unknown. Includes global keys, generated keys, and transcodable
 * properties.
 *
 * @category QueryBuilder
 */
type FallbackIndexTokenSet<CC extends BaseConfigMap> = Record<CC['HashKey'] | CC['RangeKey'] | CC['ShardedKeys'] | CC['UnshardedKeys'] | CC['TranscodedProperties'], true>;
type IndexComponentTokens<CC extends BaseConfigMap, CF, IT extends string> = HasIndexFor<CF, IT> extends true ? keyof PresentIndexTokenSet<CC, CF, IT> : keyof FallbackIndexTokenSet<CC>;
/**
 * Page key typed for a specific index token.
 *
 * - With CF (values-first config literal) present and carrying `indexes`, the
 *   shape narrows to exactly the component tokens of IT.
 * - Without CF, falls back to the broad PageKey<CC> shape.
 */
type PageKeyByIndex<CC extends BaseConfigMap, ET extends EntityToken<CC>, IT extends string = string, CF = unknown> = Pick<StorageItem<CC>, IndexComponentTokens<CC, CF, IT>>;

declare const configSchema: z$1.ZodObject<{
    entities: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodRecord<z$1.ZodString, z$1.ZodObject<{
        defaultLimit: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodNumber>>;
        defaultPageSize: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodNumber>>;
        shardBumps: z$1.ZodPipe<z$1.ZodDefault<z$1.ZodOptional<z$1.ZodArray<z$1.ZodObject<{
            timestamp: z$1.ZodNumber;
            charBits: z$1.ZodNumber;
            chars: z$1.ZodNumber;
        }, z$1.core.$strict>>>>, z$1.ZodTransform<{
            timestamp: number;
            charBits: number;
            chars: number;
        }[], {
            timestamp: number;
            charBits: number;
            chars: number;
        }[]>>;
        timestampProperty: z$1.ZodString;
        uniqueProperty: z$1.ZodString;
    }, z$1.core.$strict>>>>;
    generatedProperties: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodObject<{
        sharded: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodRecord<z$1.ZodString, z$1.ZodArray<z$1.ZodString>>>>;
        unsharded: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodRecord<z$1.ZodString, z$1.ZodArray<z$1.ZodString>>>>;
    }, z$1.core.$strip>>>;
    hashKey: z$1.ZodString;
    indexes: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodRecord<z$1.ZodString, z$1.ZodObject<{
        hashKey: z$1.ZodString;
        rangeKey: z$1.ZodString;
        projections: z$1.ZodOptional<z$1.ZodArray<z$1.ZodString>>;
    }, z$1.core.$strip>>>>;
    generatedKeyDelimiter: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodString>>;
    generatedValueDelimiter: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodString>>;
    propertyTranscodes: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodRecord<z$1.ZodString, z$1.ZodString>>>;
    rangeKey: z$1.ZodString;
    shardKeyDelimiter: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodString>>;
    throttle: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodNumber>>;
    transcodes: z$1.ZodDefault<z$1.ZodOptional<z$1.ZodRecord<z$1.ZodString, z$1.ZodObject<{
        encode: z$1.ZodCustom<unknown, unknown>;
        decode: z$1.ZodCustom<unknown, unknown>;
    }, z$1.core.$strict>>>>;
}, z$1.core.$strict>;
/**
 * Simplified type taken on by a {@link Config | `Config`} object after parsing in the {@link EntityManager | `EntityManager`} constructor.
 *
 * @category EntityManager
 */
type ParsedConfig = z$1.infer<typeof configSchema>;

/** EntityOfToken — resolves the concrete entity shape for a specific entity token. */
type EntityOfToken<CC extends BaseConfigMap, ET extends EntityToken<CC>> = Exactify<CC['EntityMap']>[ET];
/**
 * EntityItem — domain-facing item narrowed to a specific entity token, plus
 * optional key/token properties. Required fields per captured entitiesSchema
 * (when present); no string index signature.
 */
type EntityItem<CC extends BaseConfigMap, ET extends EntityToken<CC>> = EntityOfToken<CC, ET> & Partial<Record<CC['HashKey'] | CC['RangeKey'] | CC['ShardedKeys'] | CC['UnshardedKeys'], string>>;
/**
 * Normalize literals: string | readonly string[] -\> union of strings.
 */
type KeysFrom<K> = K extends readonly (infer E)[] ? Extract<E, string> : K extends string ? K : never;
/**
 * Project item shape by keys; if K is never/unknown, fall back to T.
 */
type Projected<T, K> = [KeysFrom<K>] extends [never] ? T : T extends object ? Pick<T, Extract<KeysFrom<K>, keyof Exactify<T>>> : T;
/** EntityRecord — DB-facing record (keys required), narrowed to a specific entity token. */
type EntityRecord<CC extends BaseConfigMap, ET extends EntityToken<CC>> = Partial<EntityItem<CC, ET>> & EntityKey<CC>;
/** EntityItemPartial — projected/seed domain shape by token.
 * - If K provided: required projected keys (`Projected<EntityItem<CC, ET>, K>`).
 * - If K omitted: permissive seed (`Partial<EntityItem<CC, ET>>`).
 */
type EntityItemPartial<CC extends BaseConfigMap, ET extends EntityToken<CC>, K = unknown> = [KeysFrom<K>] extends [never] ? Partial<EntityItem<CC, ET>> : Projected<EntityItem<CC, ET>, K>;
/** EntityRecordPartial — projected DB record shape by token. */
type EntityRecordPartial<CC extends BaseConfigMap, ET extends EntityToken<CC>, K = unknown> = Projected<EntityRecord<CC, ET>, K>;

/**
 * A result returned by a {@link ShardQueryFunction | `ShardQueryFunction`} querying an individual shard.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`}.
 * @typeParam ET - Entity token narrowing the item type.
 * @typeParam IT - Index token (for page key typing).
 * @typeParam CF - Optional values-first config literal type for narrowing.
 * @typeParam K - Optional projection keys; narrows item shape when provided.
 *
 * @category EntityManager
 * @protected
 */
interface ShardQueryResult<CC extends BaseConfigMap, ET extends EntityToken<CC>, IT extends string, CF = unknown, K = unknown> {
    /** The number of records returned. */
    count: number;
    /** The returned records. */
    items: EntityItemPartial<CC, ET, K>[];
    /** The page key for the next query on this shard. */
    pageKey?: PageKeyByIndex<CC, ET, IT, CF>;
}

/**
 * A query function that returns a single page of results from an individual shard.
 *
 * This function will typically be composed dynamically to express a specific query index & logic. The arguments to this function will be provided by the {@link EntityManager.query | `EntityManager.query`} method, which assembles many returned pages queried across multiple shards into a single query result.
 *
 * @param hashKey - The hash key value of the shard being queried.
 * @param pageKey - The typed page key for the index being queried.
 * @param pageSize - The maximum number of items to return from this query.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`}.
 * @typeParam ET - Entity token narrowing the item/record types.
 * @typeParam IT - Index token (inferred from shardQueryMap keys).
 * @typeParam CF - Optional values-first config literal type for narrowing.
 * @typeParam K - Optional projection keys; narrows item shape when provided.
 *
 * @category EntityManager
 * @protected
 */
type ShardQueryFunction<CC extends BaseConfigMap, ET extends EntityToken<CC>, IT extends string, CF = unknown, K = unknown> = CF extends {
    indexes?: infer I;
} ? I extends Record<string, unknown> ? IT extends Extract<keyof I, string> ? (hashKey: string, pageKey?: PageKeyByIndex<CC, ET, IT, CF>, pageSize?: number) => Promise<ShardQueryResult<CC, ET, IT, CF, K>> : never : (hashKey: string, pageKey?: PageKeyByIndex<CC, ET, IT, CF>, pageSize?: number) => Promise<ShardQueryResult<CC, ET, IT, CF, K>> : (hashKey: string, pageKey?: PageKeyByIndex<CC, ET, IT, CF>, pageSize?: number) => Promise<ShardQueryResult<CC, ET, IT, CF, K>>;

/**
 * Relates a specific index token to a {@link ShardQueryFunction | `ShardQueryFunction`} to be performed on that index.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`}.
 * @typeParam ET - Entity token narrowing the function item types.
 * @typeParam ITS - Index token subset (inferred from object keys).
 * @typeParam CF - Optional values-first config literal type for narrowing. When
 *                 provided and it carries an `indexes` object with preserved
 *                 literal keys (prefer `as const` at call sites), the map keys
 *                 are constrained to that set. Excess keys are rejected by
 *                 excess property checks on object literals.
 * @typeParam K - Optional projection keys; narrows item shape when provided.
 *
 * @category EntityManager
 * @protected
 */
type ShardQueryMap<CC extends BaseConfigMap, ET extends EntityToken<CC>, ITS extends string, CF = unknown, K = unknown> = CF extends {
    indexes?: infer I;
} ? I extends Record<string, unknown> ? Record<Extract<ITS, Extract<keyof I, string>>, ShardQueryFunction<CC, ET, Extract<ITS, Extract<keyof I, string>>, CF, K>> : Record<ITS, ShardQueryFunction<CC, ET, ITS, CF, K>> : Record<ITS, ShardQueryFunction<CC, ET, ITS, CF, K>>;
/**
 * Convenience alias for ShardQueryMap that derives ITS (index token subset)
 * from a values-first captured config CC (e.g., your config literal type).
 *
 * - If CC has `indexes`, ITS becomes the union of its keys.
 * - Otherwise, ITS defaults to `string`.
 *
 * It also passes CC through the CF channel so per-index page-key narrowing
 * applies consistently.
 *
 * This is optional DX sugar; it does not change runtime behavior.
 */
type ShardQueryMapByCC<CC extends BaseConfigMap, ET extends EntityToken<CC>, CCLit = unknown, K = unknown> = ShardQueryMap<CC, ET, IndexTokensFrom<CCLit>, CCLit, K>;
/**
 * Convenience alias for ShardQueryMap that derives ITS (index token subset)
 * directly from a values-first config literal CF when it carries `indexes`.
 *
 * - If CF has `indexes`, ITS becomes the union of its keys.
 * - Otherwise, ITS defaults to `string`.
 *
 * This is optional DX sugar; it does not change runtime behavior.
 */
type ShardQueryMapByCF<CC extends BaseConfigMap, ET extends EntityToken<CC>, CF = unknown, K = unknown> = ShardQueryMap<CC, ET, IndexTokensOf<CF>, CF, K>;

/**
 * Options passed to the {@link EntityManager.query | `EntityManager.query`} method.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 * @typeParam ET - Entity token narrowing the item types.
 * @typeParam ITS - Index token subset (inferred from shardQueryMap keys).
 * @typeParam CF - Optional values-first config literal type used for index-aware narrowing.
 * @typeParam K - Optional projection keys; narrows item/sort shapes when provided.
 *
 * @category EntityManager
 * @protected
 */
interface QueryOptions<CC extends BaseConfigMap, ET extends EntityToken<CC> = EntityToken<CC>, ITS extends string = string, CF = unknown, K = unknown> {
    /** Identifies the entity to be queried. Key of {@link Config | `Config`} `entities`. */
    entityToken: ET;
    /**
     * Partial item object sufficiently populated to generate index hash keys.
     */
    item: EntityItemPartial<CC, ET>;
    /**
     * The target maximum number of records to be returned by the query across
     * all shards.
     *
     * The actual number of records returned will be a product of {@link QueryOptions.pageSize | `pageSize`} and the
     * number of shards queried, unless limited by available records in a given
     * shard.
     */
    limit?: number | undefined;
    /**
     * {@link QueryResult.pageKeyMap | `pageKeyMap`} returned by the previous iteration of this query.
     */
    pageKeyMap?: string | undefined;
    /**
     * The maximum number of records to be returned by each individual query to a
     * single shard (i.e. {@link ShardQueryFunction | `ShardQueryFunction`} execution).
     *
     * Note that, within a given {@link EntityManager.query | `query`} method execution, these queries will be
     * repeated until either available data is exhausted or the {@link QueryOptions.limit | `limit`} value is
     * reached.
     */
    pageSize?: number | undefined;
    /**
     * Each key in this object is a valid entity index token. Each value is a valid
     * {@link ShardQueryFunction | 'ShardQueryFunction'} that specifies the query of a single page of data on a
     * single shard for the mapped index.
     *
     * This allows simultaneous queries on multiple sort keys to share a single
     * page key, e.g. to match the same string against `firstName` and `lastName`
     * properties without performing a table scan for either.
     */
    shardQueryMap: ShardQueryMap<CC, ET, ITS, CF, K>;
    /**
     * A {@link SortOrder | `SortOrder`} object specifying the sort order of the result set. Defaults to `[]`. Aligned with the projected item shape when K is provided.
     */
    sortOrder?: SortOrder<EntityItemPartial<CC, ET, K>> | undefined;
    /**
     * Lower limit to query shard space.
     *
     * Only valid if the query is constrained along the dimension used by the
     * {@link Config | `EntityManager.config.entities.<entityToken>.sharding.timestamptokens.timestamp`}
     * function to generate `shardKey`.
     *
     * @defaultValue `0`
     */
    timestampFrom?: number | undefined;
    /**
     * Upper limit to query shard space.
     *
     * Only valid if the query is constrained along the dimension used by the
     * {@link Config | `EntityManager.config.entities.<entityToken>.sharding.timestamptokens.timestamp`}
     * function to generate `shardKey`.
     *
     * @defaultValue `Date.now()`
     */
    timestampTo?: number | undefined;
    /**
     * The maximum number of shards to query in parallel. Overrides options `throttle`.
     *
     * @defaultValue `options.throttle`
     */
    throttle?: number | undefined;
}
/**
 * Convenience alias for QueryOptions that derives ITS (index token subset)
 * directly from a values-first config literal CF when it carries `indexes`.
 *
 * - If CF has `indexes`, ITS becomes the union of its keys.
 * - Otherwise, ITS defaults to `string`.
 *
 * This is optional DX sugar; it does not change runtime behavior.
 */
type QueryOptionsByCF<CC extends BaseConfigMap, ET extends EntityToken<CC> = EntityToken<CC>, CF = unknown, K = unknown> = QueryOptions<CC, ET, IndexTokensOf<CF>, CF, K>;
/**
 * Convenience alias for QueryOptions that derives ITS (index token subset)
 * from a values-first captured config CC (e.g., your config literal type).
 *
 * - If CC has `indexes`, ITS becomes the union of its keys.
 * - Otherwise, ITS defaults to `string`.
 *
 * It also passes CC through the CF channel so page-key narrowing and other
 * CF-aware typing applies consistently.
 *
 * This is optional DX sugar; it does not change runtime behavior.
 */
type QueryOptionsByCC<CCMap extends BaseConfigMap, ET extends EntityToken<CCMap> = EntityToken<CCMap>, CC = unknown, K = unknown> = QueryOptions<CCMap, ET, IndexTokensFrom<CC>, CC, K>;

/**
 * A result returned by a query across multiple shards, where each shard may receive multiple page queries via a dynamically-generated {@link ShardQueryFunction | `ShardQueryFunction`}.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`}.
 * @typeParam ET - Entity token narrowing the result item type.
 * @typeParam ITS - Index token subset (carried for symmetry; not represented in the shape).
 * @typeParam K - Optional projection keys; narrows item shape when provided.
 *
 * @category EntityManager
 * @protected
 */
interface QueryResult<CC extends BaseConfigMap, ET extends EntityToken<CC>, ITS extends string, K = unknown> {
    /** Total number of records returned across all shards. */
    count: number;
    /** The returned records. */
    items: EntityItemPartial<CC, ET, K>[];
    /**
     * A compressed, two-layer map of page keys, used to query the next page of
     * data for a given sort key on each shard of a given hash key.
     */
    pageKeyMap: string;
}

/**
 * The EntityManager class applies a configuration-driven sharded data model &
 * query strategy to NoSql data.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines the configuration's {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 * @typeParam CF - Values-first config literal type captured at construction
 *                 time (phantom generic; type-only). This is used by downstream
 *                 adapters to infer index-token unions (ITS) and per-index page
 *                 key shapes.
 *
 * @remarks
 * While the {@link EntityManager.query | `query`} method is `public`, normally it should not be called directly. The `query` method is used by a platform-specific {@link BaseQueryBuilder.query | `QueryBuilder.query`} method to provide a fluent query API.
 *
 * @category EntityManager
 */
declare class EntityManager<CC extends BaseConfigMap, CF = unknown> {
    #private;
    /** Logger object (defaults to `console`, must support `debug` & `error` methods). */
    readonly logger: Pick<Console, 'debug' | 'error'>;
    /**
     * Create an EntityManager instance.
     *
     * @param config - EntityManager {@link Config | `Config`} object.
     * @param logger - Logger object (defaults to `console`, must support `debug` & `error` methods).
     */
    constructor(config: Config<CC>, logger?: Pick<Console, 'debug' | 'error'>);
    /**
     * Get the current EntityManager {@link Config | `Config`} object.
     *
     * @returns Current {@link Config | `Config`} object.
     */
    get config(): ParsedConfig;
    /**
     * Set the current EntityManager {@link Config | `Config`} object.
     *
     * @param value - {@link Config | `Config`} object.
     */
    set config(value: ParsedConfig);
    /**
     * Encode a generated property value. Returns a string or undefined if atomicity requirement of sharded properties not met.
     *
     * @param property - {@link Config | Config} `generatedProperties` key.
     * @param item - {@link StorageItem | `StorageItem`} object.
     *
     * @returns Encoded generated property value.
     *
     * @throws `Error` if `property` is not a {@link Config | Config} `generatedProperties` key.
     */
    encodeGeneratedProperty(property: CC['ShardedKeys'] | CC['UnshardedKeys'], item: StorageItem<CC>): string | undefined;
    /**
     * Update generated properties, hash key, and range key on an {@link EntityItem | `EntityItem`} object.
     *
     * @param entityToken - {@link Config | `Config`} `entities` key.
     * @param item - {@link EntityItem | `EntityItem`} object.
     * @param overwrite - Overwrite existing properties (default `false`).
     *
     * @returns {@link EntityRecord | `EntityRecord`} object with updated properties.
     *
     * @throws `Error` if `entityToken` is invalid.
     *
     * @overload
     */
    addKeys<ET extends EntityToken<CC>>(entityToken: ET, item: EntityItemPartial<CC, ET>, overwrite?: boolean): EntityRecordPartial<CC, ET>;
    /**
     * @overload
     */
    addKeys<ET extends EntityToken<CC>>(entityToken: ET, item: EntityItemPartial<CC, ET>[], overwrite?: boolean): EntityRecordPartial<CC, ET>[];
    /**
     * Convert one or more {@link EntityItem | `EntityItem`} objects into an array of {@link EntityKey | `EntityKey`} values.
     *
     * @param entityToken - {@link Config | `Config`} `entities` key.
     * @param item - {@link EntityItem | `EntityItem`} object.
     * @param overwrite - Overwrite existing properties (default `false`).
     *
     * @returns Array of {@link EntityKey | `EntityKey`} values derived from `item`.
     *
     * @throws `Error` if `entityToken` is invalid.
     */
    getPrimaryKey<ET extends EntityToken<CC>>(entityToken: ET, item: EntityItemPartial<CC, ET>, overwrite?: boolean): EntityKey<CC>[];
    /**
     * @overload
     */
    getPrimaryKey<ET extends EntityToken<CC>>(entityToken: ET, items: EntityItemPartial<CC, ET>[], overwrite?: boolean): EntityKey<CC>[];
    /**
     * Strips generated properties, hash key, and range key from an {@link EntityRecord | `EntityRecord`} object.
     *
     * @param entityToken - {@link Config | `Config`} `entities` key.
     * @param item - {@link EntityRecord | `EntityRecord`} object.
     *
     * @returns {@link EntityItem | `EntityItem`} with generated properties, hash key & range key removed.
     *
     * @throws `Error` if `entityToken` is invalid.
     *
     * Overloads:
     */
    removeKeys<ET extends EntityToken<CC>>(entityToken: ET, item: EntityRecord<CC, ET>): EntityItem<CC, ET>;
    removeKeys<ET extends EntityToken<CC>, K = unknown>(entityToken: ET, item: EntityRecordPartial<CC, ET, K>): EntityItemPartial<CC, ET, K>;
    removeKeys<ET extends EntityToken<CC>>(entityToken: ET, items: EntityRecord<CC, ET>[]): EntityItem<CC, ET>[];
    removeKeys<ET extends EntityToken<CC>, K = unknown>(entityToken: ET, items: EntityRecordPartial<CC, ET, K>[]): EntityItemPartial<CC, ET, K>[];
    /**
     * Find an index token based on the configured hash and range key tokens.
     *
     * @param hashKeyToken - Index hash key token (global hashKey or a sharded generated key).
     * @param rangeKeyToken - Index range key token (global rangeKey, unsharded generated key, or a transcodable scalar).
     * @param suppressError - When false (default), throws if no match; when true, returns undefined instead.
     *
     * @returns A configured index token (narrowed to the CF.indexes key union) or undefined when allowed.
     *
     * @throws `Error` if no match is found and `suppressError` is not `true`.
     */
    findIndexToken(hashKeyToken: CC['HashKey'] | CC['ShardedKeys'], rangeKeyToken: CC['RangeKey'] | CC['UnshardedKeys'] | CC['TranscodedProperties'], suppressError?: false): IndexTokensOf<CF>;
    findIndexToken(hashKeyToken: CC['HashKey'] | CC['ShardedKeys'], rangeKeyToken: CC['RangeKey'] | CC['UnshardedKeys'] | CC['TranscodedProperties'], suppressError: true): IndexTokensOf<CF> | undefined;
    /**
     * Query a database entity across shards in a provider-generic fashion.
     *
     * @remarks
     * The provided `shardQueryMap` performs the actual query of individual data pages on individual index/shard combinations.
     *
     * Individual shard query results will be combined, deduped by {@link Config | `Config`} `uniqueProperty` value, and sorted by {@link QueryOptions.sortOrder | `sortOrder`}.
     *
     * In queries on sharded data, expect the leading and trailing edges of returned data pages to interleave somewhat with preceding & following pages.
     *
     * Unsharded query results should sort & page as expected.
     *
     * **Normally this method should not be called directly!** It is used by a platform-specific {@link BaseQueryBuilder.query | `QueryBuilder.query`} method to provide a fluent query API.
     *
     * @param options - {@link QueryOptions | `QueryOptions`} object.
     *
     * @returns {@link QueryResult} object.
     *
     * @throws Error if `options` {@link QueryOptions.pageKeyMap | `pageKeyMap`} `pageKeyMap` keys do not match {@link QueryOptions.shardQueryMap | `shardQueryMap`} keys.
     *
     * @protected
     */
    query<ET extends EntityToken<CC>, ITS extends string, CF = unknown, K = unknown>(options: QueryOptions<CC, ET, ITS, CF, K>): Promise<QueryResult<CC, ET, ITS, K>>;
}

/**
 * Values-first config input used to capture literal tokens from the provided
 * configuration value. This does not enforce full Config shape at compile
 * time; runtime validation still occurs via Zod in the EntityManager.
 *
 * Keep this intentionally permissive to maximize inference from `as const`.
 */
interface ConfigInput {
    hashKey: string;
    rangeKey: string;
    generatedProperties?: {
        sharded?: Record<string, readonly string[]>;
        unsharded?: Record<string, readonly string[]>;
    };
    propertyTranscodes?: Record<string, string>;
    indexes?: Record<string, {
        hashKey: string;
        rangeKey: string;
        projections?: string[];
    }>;
    entities?: Record<string, unknown>;
    /**
     * Optional Zod schemas for per-entity domain shapes (non-generated fields only).
     *
     * Important: Schemas MUST declare only base (non-generated) properties. Do not include
     * global keys (hashKey/rangeKey) or any generated tokens (sharded/unsharded).
     */
    entitiesSchema?: Record<string, ZodType>;
    generatedKeyDelimiter?: string;
    generatedValueDelimiter?: string;
    shardKeyDelimiter?: string;
    transcodes?: unknown;
    throttle?: number;
}
type HashKeyFrom<CC> = CC extends {
    hashKey: infer H;
} ? H & string : 'hashKey';
type RangeKeyFrom<CC> = CC extends {
    rangeKey: infer R;
} ? R & string : 'rangeKey';
type ShardedKeysFrom<CC> = CC extends {
    generatedProperties?: infer GP;
} ? GP extends {
    sharded?: infer S;
} ? keyof S & string : never : never;
type UnshardedKeysFrom<CC> = CC extends {
    generatedProperties?: infer GP;
} ? GP extends {
    unsharded?: infer U;
} ? keyof U & string : never : never;
type TranscodedPropertiesFrom<CC> = CC extends {
    propertyTranscodes?: infer PT;
} ? keyof PT & string : never;
/**
 * Derive an EntityMap from CC.entitiesSchema when provided (values-first, no generics).
 * Fallback to broad EntityMap if schemas are absent.
 */
type EntitiesFromSchema<CC> = CC extends {
    entitiesSchema?: infer S;
} ? S extends Record<string, ZodType> ? {
    [K in Extract<keyof S, string>]: z.infer<S[K]>;
} & EntityMap : EntityMap : EntityMap;
/**
 * Derive the union of index token names from a values-first config input.
 *
 * When the provided config literal carries an `indexes` object with preserved
 * literal keys (prefer `as const` at call sites), this helper captures the
 * index token union. Falls back to `string` if absent.
 */
type IndexTokensFrom<CC> = CC extends {
    indexes?: infer I;
} ? keyof I & string : string;
/**
 * Captures a BaseConfigMap-compatible type from a literal ConfigInput value
 * and an EntityMap (defaults to MinimalEntityMapFrom<CC>).
 */
interface CapturedConfigMapFrom<CC, EM extends EntityMap> extends BaseConfigMap {
    EntityMap: EM;
    HashKey: HashKeyFrom<CC>;
    RangeKey: RangeKeyFrom<CC>;
    ShardedKeys: ShardedKeysFrom<CC>;
    UnshardedKeys: UnshardedKeysFrom<CC>;
    TranscodedProperties: TranscodedPropertiesFrom<CC>;
    TranscodeRegistry: DefaultTranscodeRegistry;
}
/**
 * Values-first factory that captures literal tokens and index names directly
 * from the provided config value. Runtime config parsing/validation is
 * unchanged (performed in the EntityManager constructor).
 *
 * @typeParam CC - Captured config input (values-first). Prefer `as const` and
 *                 `satisfies` at call sites to preserve literal keys.
 * @typeParam EM - EntityMap for the manager. Defaults to a minimal derived map
 *                 from `CC.entitiesSchema` when present; otherwise falls back to EntityMap.
 *
 * @returns An {@link EntityManager | `EntityManager`} instance whose type
 *          captures CF from the single values-first config literal ({@link ConfigInput | `ConfigInput`})
 *          as the second generic parameter (phantom; type-only).
 */
declare function createEntityManager<const CC extends ConfigInput, EM extends EntityMap = EntitiesFromSchema<CC>>(config: CC, logger?: Pick<Console, 'debug' | 'error'>): EntityManager<CapturedConfigMapFrom<CC, EM>, CC>;

/**
 * Storage-facing record type with required keys.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityManager
 */
type StorageRecord<CC extends BaseConfigMap> = StorageItem<CC> & EntityKey<CC>;

/**
 * Base EntityClient options.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 *
 * @category EntityClient
 */
interface BaseEntityClientOptions<CC extends BaseConfigMap, CF = unknown> {
    /** Default batch process options. */
    batchProcessOptions?: Omit<BatchProcessOptions<unknown, unknown>, 'batchHandler' | 'unprocessedItemExtractor'>;
    /** {@link EntityManager | `EntityManager`} instance. */
    entityManager: EntityManager<CC, CF>;
    /** Injected logger object. Must support `debug` and `error` methods. Default: `console` */
    logger?: Pick<Console, 'debug' | 'error'> | undefined;
}

/**
 * Base EntityClient class. Integrates {@link EntityManager | `EntityManager`} with injected logging & enhanced batch processing.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s
 *                 {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}.
 *                 If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 * @typeParam CF - Values-first config literal type captured by the manager (phantom; type-only). Propagated so
 *                 client-facing calls that return `IndexTokensOf<CF>` retain the narrowed union.
 *
 * @category EntityClient
 */
declare abstract class BaseEntityClient<CC extends BaseConfigMap, CF = unknown> {
    /** Default batch process options. */
    readonly batchProcessOptions: NonNullable<BaseEntityClientOptions<CC, CF>['batchProcessOptions']>;
    /** {@link EntityManager | `EntityManager`} instance. */
    readonly entityManager: EntityManager<CC, CF>;
    /** Injected logger object. Must support `debug` and `error` methods. Default: `console` */
    readonly logger: NonNullable<BaseEntityClientOptions<CC, CF>['logger']>;
    /**
     * Base EntityClient constructor.
     *
     * @param options - {@link BaseEntityClientOptions | `BaseEntityClientOptions`} object.
     */
    constructor(options: BaseEntityClientOptions<CC, CF>);
}

type ConfigOfClient<EC> = EC extends BaseEntityClient<infer CC> ? CC : never;
type EntityClientRecordByToken<EC, ET extends EntityToken<ConfigOfClient<EC>>> = EntityRecord<ConfigOfClient<EC>, ET>;
type EntityClientItemByToken<EC, ET extends EntityToken<ConfigOfClient<EC>>> = EntityItem<ConfigOfClient<EC>, ET>;

/**
 * Constructor options for {@link BaseQueryBuilder | `BaseQueryBuilder`}.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 * @typeParam EntityClient - {@link BaseEntityClient | `BaseEntityClient`} derived class instance.
 *
 * @category QueryBuilder
 */
interface BaseQueryBuilderOptions<CC extends BaseConfigMap, EntityClient extends BaseEntityClient<CC>> {
    /** {@link BaseEntityClient | `EntityClient`} instance. */
    entityClient: EntityClient;
    /** Entity token. */
    entityToken: EntityToken<CC>;
    /** Hash key token. */
    hashKeyToken: CC['HashKey'] | CC['ShardedKeys'];
    /** Dehydrated page key map. */
    pageKeyMap?: string | undefined;
}

/**
 * Options for {@link BaseQueryBuilder.query | `query`} method on all derived classes.
 *
 * Same as {@link QueryOptions | `QueryOptions`} for {@link EntityManager.query | `EntityManager.query`}, excluding `entityToken`, `pageKeyMap`, and `shardQueryMap`.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 * @typeParam ET - Entity token narrowing the item types for options.item.
 *
 * @category QueryBuilder
 */
type QueryBuilderQueryOptions<CC extends BaseConfigMap, ET extends EntityToken<CC>, CF = unknown> = Omit<QueryOptions<CC, ET, string, CF>, 'entityToken' | 'pageKeyMap' | 'shardQueryMap'>;

/**
 * Abstract base class supporting a fluent API for building a {@link ShardQueryMap | `ShardQueryMap`} using a database client.
 *
 * @typeParam CC - {@link ConfigMap | `ConfigMap`} that defines an {@link Config | `EntityManager configuration`}'s {@link EntityMap | `EntityMap`}, key properties, and {@link TranscodeRegistry | `TranscodeRegistry`}. If omitted, defaults to {@link BaseConfigMap | `BaseConfigMap`}.
 * @typeParam EntityClient - {@link BaseEntityClient | `BaseEntityClient`} derived class instance.
 * @typeParam IndexParams - Database platform-specific, index-specific query parameters.
 * @typeParam CF - Optional values-first config literal type for page key narrowing.
 * @typeParam K - Optional projection keys; narrows item shape when provided.
 *
 * @category QueryBuilder
 */
declare abstract class BaseQueryBuilder<CC extends BaseConfigMap, EntityClient extends BaseEntityClient<CC>, IndexParams, ET extends EntityToken<CC> = EntityToken<CC>, ITS extends string = string, CF = unknown, K = unknown> {
    /** {@link BaseEntityClient | `EntityClient`} instance. */
    readonly entityClient: EntityClient;
    /** Entity token. */
    readonly entityToken: EntityToken<CC>;
    /** Hash key token. */
    readonly hashKeyToken: CC['HashKey'] | CC['ShardedKeys'];
    /** Dehydrated page key map. */
    readonly pageKeyMap?: string | undefined;
    /**
     * Maps `indexToken` values to database platform-specific query parameters.
     *
     * @protected
     */
    readonly indexParamsMap: Record<ITS, IndexParams>;
    /** BaseQueryBuilder constructor. */
    constructor(options: BaseQueryBuilderOptions<CC, EntityClient>);
    protected abstract getShardQueryFunction(indexToken: ITS): ShardQueryFunction<CC, ET, ITS, CF, K>;
    /**
     * Builds a {@link ShardQueryMap | `ShardQueryMap`} object.
     *
     * @returns - The {@link ShardQueryMap | `ShardQueryMap`} object.
     */
    build(): ShardQueryMap<CC, ET, ITS, CF, K>;
    query(options: QueryBuilderQueryOptions<CC, ET, CF>): Promise<QueryResult<CC, ET, ITS, K>>;
}

export { BaseEntityClient, BaseQueryBuilder, EntityManager, configSchema, createEntityManager };
export type { BaseConfigMap, BaseEntityClientOptions, BaseKeyTokens, BaseQueryBuilderOptions, CapturedConfigMapFrom, Config, ConfigInput, ConfigMap, ConfigOfClient, EntitiesFromSchema, EntityClientItemByToken, EntityClientRecordByToken, EntityItem, EntityItemPartial, EntityKey, EntityOfToken, EntityRecord, EntityRecordPartial, EntityToken, FallbackIndexTokenSet, HasIndexFor, HashKeyFrom, IndexComponentTokens, IndexHashKeyOf, IndexRangeKeyOf, IndexTokensFrom, IndexTokensOf, KeysFrom, PageKey, PageKeyByIndex, ParsedConfig, PresentIndexTokenSet, Projected, QueryBuilderQueryOptions, QueryOptions, QueryOptionsByCC, QueryOptionsByCF, QueryResult, RangeKeyFrom, ShardBump, ShardQueryFunction, ShardQueryMap, ShardQueryMapByCC, ShardQueryMapByCF, ShardQueryResult, ShardedKeysFrom, StorageItem, StorageRecord, TranscodedPropertiesFrom, UnshardedKeysFrom, ValidateConfigMap };
