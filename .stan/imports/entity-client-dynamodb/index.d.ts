import { BatchGetCommandInput, BatchWriteCommandInput, DynamoDBDocument, PutCommandInput, PutCommandOutput, DeleteCommandInput, DeleteCommandOutput, BatchWriteCommandOutput, TransactWriteCommandOutput, GetCommandInput, GetCommandOutput, BatchGetCommandOutput, NativeScalarAttributeValue, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { BatchProcessOptions } from '@karmaniverous/batch-process';
import * as _smithy_util_waiter from '@smithy/util-waiter';
import * as _aws_sdk_client_dynamodb from '@aws-sdk/client-dynamodb';
import { DynamoDBClientConfig, DynamoDBClient, CreateTableCommandInput, DeleteTableCommandInput, ScalarAttributeType } from '@aws-sdk/client-dynamodb';
import { BaseConfigMap, BaseEntityClientOptions, BaseEntityClient, EntityRecord, EntityToken, EntityKey, EntityRecordPartial, BaseQueryBuilder, ShardQueryFunction, IndexRangeKeyOf, QueryBuilderQueryOptions, QueryResult, IndexTokensOf, BaseQueryBuilderOptions, PageKeyByIndex, EntityManager } from '@karmaniverous/entity-manager';
export { EntityItem, EntityItemPartial, EntityRecord, EntityRecordPartial, EntityToken, Projected } from '@karmaniverous/entity-manager';
import { MakeOptional, ReplaceKey, TranscodeRegistry, Exactify, DefaultTranscodeRegistry } from '@karmaniverous/entity-tools';
import { WaiterConfiguration } from '@smithy/types';

/**
 * Options for batch get operations.
 *
 * @category EntityClient
 * @protected
 */
interface BatchGetOptions extends Omit<BatchGetCommandInput, 'RequestItems'> {
    batchProcessOptions?: Omit<BatchProcessOptions<unknown, unknown>, 'batchHandler' | 'unprocessedItemExtractor'>;
    tableName?: string | undefined;
}

/**
 * Options for batch put & delete operations.
 *
 * @category EntityClient
 * @protected
 */
interface BatchWriteOptions extends Omit<BatchWriteCommandInput, 'RequestItems'> {
    batchProcessOptions?: Omit<BatchProcessOptions<unknown, unknown>, 'batchHandler' | 'unprocessedItemExtractor'>;
    tableName?: string | undefined;
}

/**
 * DynamoDB EntityClient options. Extends {@link BaseEntityClientOptions | `BaseEntityClientOptions`} and {@link DynamoDBClientConfig | `DynamoDBClientConfig`} with the following additional properties:
 * - `[enableXray]` - Activates AWS Xray for internal DynamoDb client when `true` and running in a Lambda environment.
 * - `entityManager` - {@link EntityManager | `EntityManager`} instance.
 * - `tableName` - Table name.
 *
 * @category EntityClient
 */
interface EntityClientOptions<C extends BaseConfigMap, CF = unknown> extends BaseEntityClientOptions<C, CF>, Omit<DynamoDBClientConfig, 'logger'> {
    /** Activates AWS Xray for internal DynamoDb client when `true` and running in a Lambda environment. */
    enableXray?: boolean | undefined;
    /** Table name. */
    tableName: string;
}

/**
 * {@link WaiterConfiguration | `WaiterConfiguration`} with `client` parameter omitted.
 *
 * @category EntityClient
 * @protected
 */
type WaiterConfig = Omit<WaiterConfiguration<DynamoDBClient>, 'client'>;

/**
 * Convenience wrapper around the AWS DynamoDB SDK in addition to
 * {@link BaseEntityClient | BaseEntityClient} functionality.
 *
 * This class exposes {@link client | DynamoDBClient} and {@link doc | DynamoDBDocument}
 * for direct access, and delegates high-level operations to small helper modules.
 *
 * For query operations, use the {@link QueryBuilder | QueryBuilder} class.
 *
 * @category EntityClient
 */
declare class EntityClient<C extends BaseConfigMap, CF = unknown> extends BaseEntityClient<C, CF> {
    /** AWS SDK DynamoDBClient instance. */
    readonly client: DynamoDBClient;
    /** AWS SDK DynamoDBDocument instance. */
    readonly doc: DynamoDBDocument;
    /** Table name. */
    readonly tableName: EntityClientOptions<C>['tableName'];
    /**
     * DynamoDB EntityClient constructor.
     *
     * @param options - {@link EntityClientOptions | EntityClientOptions} object.
     */
    constructor(options: EntityClientOptions<C, CF>);
    /**
     * Creates a DynamoDB table and waits for it to become active.
     *
     * @param options - CreateTableCommandInput; TableName defaults to this.tableName.
     * @param waiterConfig - Waiter configuration (default maxWaitTime 60s).
     */
    createTable(options: MakeOptional<CreateTableCommandInput, 'TableName'>, waiterConfig?: WaiterConfig): Promise<{
        createTableCommandOutput: _aws_sdk_client_dynamodb.CreateTableCommandOutput;
        waiterResult: _smithy_util_waiter.WaiterResult;
    }>;
    /**
     * Deletes a DynamoDB table and waits for it to be confirmed deleted.
     *
     * @param options - DeleteTableCommandInput; TableName defaults to this.tableName.
     * @param waiterConfig - Waiter configuration (default maxWaitTime 60s).
     */
    deleteTable(options?: MakeOptional<DeleteTableCommandInput, 'TableName'>, waiterConfig?: WaiterConfig): Promise<{
        deleteTableCommandOutput: _aws_sdk_client_dynamodb.DeleteTableCommandOutput;
        waiterResult: _smithy_util_waiter.WaiterResult;
    }>;
    /**
     * Puts an item to a DynamoDB table.
     *
     * @param item - EntityRecord object (storage-facing).
     * @param options - PutCommandInput with Item omitted; TableName optional.
     *
     * @overload
     */
    putItem(item: EntityRecord<C, EntityToken<C>>, options?: MakeOptional<Omit<PutCommandInput, 'Item'>, 'TableName'>): Promise<PutCommandOutput>;
    /**
     * Puts an item to a DynamoDB table.
     *
     * @param options - PutCommandInput; TableName optional.
     *
     * @overload
     */
    putItem(options: MakeOptional<ReplaceKey<PutCommandInput, 'Item', EntityRecord<C, EntityToken<C>>>, 'TableName'>): Promise<PutCommandOutput>;
    /**
     * Deletes an item from a DynamoDB table.
     *
     * @param key - EntityKey object.
     * @param options - DeleteCommandInput with Key omitted; TableName optional.
     *
     * @overload
     */
    deleteItem(key: EntityKey<C>, options?: MakeOptional<Omit<DeleteCommandInput, 'Item'>, 'TableName'>): Promise<DeleteCommandOutput>;
    /**
     * Deletes an item from a DynamoDB table.
     *
     * @param options - DeleteCommandInput; TableName optional.
     *
     * @overload
     */
    deleteItem(options: MakeOptional<ReplaceKey<DeleteCommandInput, 'Key', EntityKey<C>>, 'TableName'>): Promise<DeleteCommandOutput>;
    /**
     * Puts multiple items to a DynamoDB table in batches.
     *
     * @param items - Array of EntityRecord.
     * @param options - BatchWriteOptions.
     */
    putItems(items: EntityRecord<C, EntityToken<C>>[], options?: BatchWriteOptions): Promise<BatchWriteCommandOutput[]>;
    /**
     * Deletes multiple items from a DynamoDB table in batches.
     *
     * @param keys - Array of EntityKey.
     * @param options - BatchWriteOptions.
     */
    deleteItems(keys: EntityKey<C>[], options?: BatchWriteOptions): Promise<BatchWriteCommandOutput[]>;
    /**
     * Purge all items from a DynamoDB table.
     *
     * @param options - BatchWriteOptions.
     *
     * @returns Number of items purged.
     */
    purgeItems(options?: BatchWriteOptions): Promise<number>;
    /**
     * Puts multiple items as a single transaction.
     *
     * @param items - Array of EntityRecord.
     */
    transactPutItems(items: EntityRecord<C, EntityToken<C>>[]): Promise<TransactWriteCommandOutput>;
    /**
     * Deletes multiple items as a single transaction.
     *
     * @param keys - Array of EntityKey.
     */
    transactDeleteItems(keys: EntityKey<C>[]): Promise<TransactWriteCommandOutput>;
    /**
     * Token-aware getItem overloads (records). Strip keys in handlers when needed via entityManager.removeKeys.
     *
     * Token-aware with tuple projection (attributes as const) -\> projected DB record
     */
    getItem<ET extends EntityToken<C>, A extends readonly string[]>(entityToken: ET, key: EntityKey<C>, attributes: A, options?: MakeOptional<Omit<GetCommandInput, 'AttributesToGet' | 'ExpressionAttributeNames' | 'Key' | 'ProjectionExpression'>, 'TableName'>): Promise<Omit<GetCommandOutput, 'Item'> & {
        Item?: EntityRecordPartial<C, ET, A> | undefined;
    }>;
    getItem<ET extends EntityToken<C>>(entityToken: ET, key: EntityKey<C>, attributes: string[], options?: MakeOptional<Omit<GetCommandInput, 'AttributesToGet' | 'ExpressionAttributeNames' | 'Key' | 'ProjectionExpression'>, 'TableName'>): Promise<Omit<GetCommandOutput, 'Item'> & {
        Item?: EntityRecord<C, ET> | undefined;
    }>;
    getItem<ET extends EntityToken<C>>(entityToken: ET, key: EntityKey<C>, options?: MakeOptional<Omit<GetCommandInput, 'AttributesToGet' | 'ExpressionAttributeNames' | 'Key' | 'ProjectionExpression'>, 'TableName'>): Promise<Omit<GetCommandOutput, 'Item'> & {
        Item?: EntityRecord<C, ET> | undefined;
    }>;
    getItem<ET extends EntityToken<C>>(entityToken: ET, options: MakeOptional<GetCommandInput, 'TableName'>): Promise<Omit<GetCommandOutput, 'Item'> & {
        Item?: EntityRecord<C, ET> | undefined;
    }>;
    /**
     * Gets multiple items from a DynamoDB table in batches (records). Token-aware; strip keys in handlers when needed via entityManager.removeKeys.
     *
     * @param keys - Array of EntityKey.
     * @param attributes - Optional list of attributes to project.
     * @param options - BatchGetOptions.
     */
    getItems<ET extends EntityToken<C>, A extends readonly string[]>(entityToken: ET, keys: EntityKey<C>[], attributes: A, options?: BatchGetOptions): Promise<{
        items: EntityRecordPartial<C, ET, A>[];
        outputs: BatchGetCommandOutput[];
    }>;
    getItems<ET extends EntityToken<C>>(entityToken: ET, keys: EntityKey<C>[], attributes: string[], options?: BatchGetOptions): Promise<{
        items: EntityRecord<C, ET>[];
        outputs: BatchGetCommandOutput[];
    }>;
    getItems<ET extends EntityToken<C>>(entityToken: ET, keys: EntityKey<C>[], options?: BatchGetOptions): Promise<{
        items: EntityRecord<C, ET>[];
        outputs: BatchGetCommandOutput[];
    }>;
}

/**
 * IndexParams
 *
 * @category QueryBuilder
 * @protected
 */
interface IndexParams {
    expressionAttributeNames: Record<string, string | undefined>;
    expressionAttributeValues: Record<string, NativeScalarAttributeValue | undefined>;
    filterConditions: (string | undefined)[];
    /** Optional list of attributes to project for this index. */
    projectionAttributes?: string[] | undefined;
    rangeKeyCondition?: string | undefined;
    scanIndexForward?: boolean | undefined;
}

/**
 * Eliminates object types from the `NativeScalarAttributeValue` type.
 *
 * @category QueryBuilder
 * @protected
 */
type ActuallyScalarAttributeValue = Exclude<NativeScalarAttributeValue, object>;
/**
 * Base interface for all query conditions.
 * Each specific condition extends this with its own type constraints.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryCondition {
    operator: string;
}
/**
 * Query condition for the `begins_with` operator.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionBeginsWith extends QueryCondition {
    property: string;
    operator: 'begins_with';
    value?: string | undefined;
}
/**
 * Query condition for the `between` operator.
 * Ensures that both `from` and `to` are of the same type.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionBetween<V extends ActuallyScalarAttributeValue> extends QueryCondition {
    property: string;
    operator: 'between';
    value: {
        from?: V | undefined;
        to?: V | undefined;
    };
}
/**
 * Query condition for comparison operators.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionComparison<V extends ActuallyScalarAttributeValue> extends QueryCondition {
    property: string;
    operator: '<' | '<=' | '<>' | '=' | '>' | '>=';
    value?: V | undefined;
}
/**
 * Query condition for contains operator.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionContains<V extends Exclude<NativeScalarAttributeValue, object>> extends QueryCondition {
    property: string;
    operator: 'contains';
    value?: V | undefined;
}
/**
 * Query condition for attribute existence checks.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionExists extends QueryCondition {
    property: string;
    operator: 'attribute_exists' | 'attribute_not_exists';
}
/**
 * Query condition for the `in` operator.
 * Ensures that all elements in the array or set are of the same type.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionIn<V extends NativeScalarAttributeValue> extends QueryCondition {
    property: string;
    operator: 'in';
    value?: V[] | Set<V> | undefined;
}
/**
 * Grouping of multiple query conditions using logical operators.
 * Allows for nesting of conditions.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionGroup<C extends QueryCondition> {
    operator: 'and' | 'or';
    conditions: C[];
}
/**
 * Negation of a single filter condition.
 *
 * @category QueryBuilder
 * @protected
 */
interface QueryConditionNot<C extends QueryCondition> {
    operator: 'not';
    condition: C;
}
/**
 * Minimal builder shape required by condition helpers.
 * - indexParamsMap: per-index mutable params
 * - entityClient.logger: debug/error logging
 */
interface MinimalBuilder {
    indexParamsMap: Record<string, IndexParams>;
    entityClient: {
        logger: Pick<Console, 'debug' | 'error'>;
    };
}
type ComposeCondition<B, Q extends QueryCondition> = (builder: B, indexToken: string, condition: Q) => string | undefined;

/**
 * Passed as `condition` argument to {@link QueryBuilder.addFilterCondition | `QueryBuilder.addFilterCondition`}.
 *
 * @remarks
 * The `operator` property determines the condition type. Operators map to conditions as follows:
 * - `begins_with` - {@link QueryConditionBeginsWith | `QueryConditionBeginsWith`}
 * - `between` - {@link QueryConditionBetween | `QueryConditionBetween`}
 * - `<`, `<=`, `=`, `>`, `>=`, `<>` - {@link QueryConditionComparison | `QueryConditionComparison`}
 * - `contains` - {@link QueryConditionContains | `QueryConditionContains`}
 * - `attribute_exists`, `attribute_not_exists` - {@link QueryConditionExists | `QueryConditionExists`}
 * - `in` - {@link QueryConditionIn | `QueryConditionIn`}
 * - `and`, `or` - {@link QueryConditionGroup | `QueryConditionGroup`}
 * - `not` - {@link QueryConditionNot | `QueryConditionNot`}
 *
 * Note that the `and`, `or`, and `not` operators permit nested conditions.
 *
 * For more info, see the DynamoDB [filter expression documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html).
 *
 * @category QueryBuilder
 * @protected
 */
type FilterCondition<C extends BaseConfigMap> = QueryConditionBeginsWith | QueryConditionBetween<ActuallyScalarAttributeValue> | QueryConditionComparison<ActuallyScalarAttributeValue> | QueryConditionContains<ActuallyScalarAttributeValue> | QueryConditionExists | QueryConditionIn<ActuallyScalarAttributeValue> | QueryConditionGroup<FilterCondition<C>> | QueryConditionNot<FilterCondition<C>>;
/**
 * Add filter condition to builder.
 *
 * @param builder - BaseQueryBuilder-like instance (variance-friendly).
 * @param indexToken - Index token in `indexParamsMap`.
 * @param condition - `FilterCondition` object.
 */
declare const addFilterCondition: <C extends BaseConfigMap, Client extends BaseEntityClient<C>, ET extends EntityToken<C>, ITS extends string, CF = unknown, K = unknown>(builder: BaseQueryBuilder<C, Client, IndexParams, ET, ITS, CF, K> & {
    indexParamsMap: Record<ITS, IndexParams>;
    entityClient: {
        logger: Pick<Console, "debug" | "error">;
    };
}, indexToken: ITS, condition: FilterCondition<C>) => void;

/**
 * Passed as `condition` argument to {@link QueryBuilder.addRangeKeyCondition | `QueryBuilder.addRangeKeyCondition`}.
 *
 * @remarks
 * The `operator` property determines the condition type. Operators map to conditions as follows:
 * - `begins_with` - {@link QueryConditionBeginsWith | `QueryConditionBeginsWith`}
 * - `between` - {@link QueryConditionBetween | `QueryConditionBetween`}
 * - `<`, `<=`, `=`, `>`, `>=`, `<>` - {@link QueryConditionComparison | `QueryConditionComparison`}
 *
 * For more info, see the DynamoDB [key condition expression documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html).
 *
 * @category QueryBuilder
 * @protected
 */
type RangeKeyCondition = QueryConditionBeginsWith | QueryConditionBetween<string | number> | QueryConditionComparison<string | number>;
/**
 * Add range key condition to builder.
 *
 * @param builder - {@link QueryBuilder | `QueryBuilder`} instance.
 * @param indexToken - Index token in {@link QueryBuilder | `QueryBuilder`} `indexParamsMap`.
 * @param condition - {@link RangeKeyCondition | `RangeKeyCondition`} object.
 */
declare const addRangeKeyCondition: <C extends BaseConfigMap, Client extends BaseEntityClient<C>, ET extends EntityToken<C>, ITS extends string, CF = unknown, K = unknown>(builder: BaseQueryBuilder<C, Client, IndexParams, ET, ITS, CF, K> & {
    indexParamsMap: Record<ITS, IndexParams>;
    entityClient: {
        logger: Pick<Console, "debug" | "error">;
    };
}, indexToken: ITS, condition: RangeKeyCondition) => void;

declare const attributeValueAlias: () => string;

/**
 * Provides a fluent API for building a {@link ShardQueryMap | `ShardQueryMap`} using a DynamoDB Document client.
 *
 * @category QueryBuilder
 */
declare class QueryBuilder<C extends BaseConfigMap, ET extends EntityToken<C> = EntityToken<C>, ITS extends string = string, CF = unknown, K = unknown> extends BaseQueryBuilder<C, EntityClient<C>, IndexParams, ET, ITS, CF, K> {
    getShardQueryFunction(indexToken: ITS): ShardQueryFunction<C, ET, ITS, CF, K>;
    /**
     * Adds a range key condition to a {@link ShardQueryMap | `ShardQueryMap`} index.
     * See the {@link RangeKeyCondition | `RangeKeyCondition`} type for more info.
     *
     * @param indexToken - The index token.
     * @param condition - The {@link RangeKeyCondition | `RangeKeyCondition`} object.
     *
     * @returns - The modified {@link ShardQueryMap | `ShardQueryMap`} instance.
     */
    addRangeKeyCondition<IT extends ITS>(indexToken: IT, condition: ReplaceKey<RangeKeyCondition, 'property', [
        IndexRangeKeyOf<CF, IT>
    ] extends [never] ? string : IndexRangeKeyOf<CF, IT>>): this;
    /**
     * Set scan direction for an index.
     */
    setScanIndexForward(indexToken: ITS, value: boolean): this;
    /**
     * Reset projection attributes for a single index. Widens K back to unknown.
     */
    resetProjection(indexToken: ITS): QueryBuilder<C, ET, ITS, CF>;
    /**
     * Reset projections for all indices. Widens K back to unknown.
     */
    resetAllProjections(): QueryBuilder<C, ET, ITS, CF>;
    /**
     * Set a projection (attributes) for an index token.
     * - Type-only: narrows K when called with a const tuple.
     * - Runtime: populates ProjectionExpression for the index.
     *
     * Note: At query time, uniqueProperty and any explicit sort keys will be
     * auto-included to preserve dedupe/sort invariants.
     */
    setProjection<KAttr extends readonly string[]>(indexToken: ITS, attributes: KAttr): QueryBuilder<C, ET, ITS, CF, KAttr>;
    /**
     * Apply the same projection across the supplied indices.
     * Narrows K to KAttr.
     */
    setProjectionAll<KAttr extends readonly string[]>(indices: ITS[] | readonly ITS[], attributes: KAttr): QueryBuilder<C, ET, ITS, CF, KAttr>;
    /**
     * Override query to auto-include uniqueProperty and any explicit sort keys
     * when projections are present (preserves dedupe/sort invariants).
     */
    query(options: QueryBuilderQueryOptions<C, ET, CF>): Promise<QueryResult<C, ET, ITS, K>>;
    /**
     * Adds a filter condition to a {@link ShardQueryMap | `ShardQueryMap`} index. See the {@link FilterCondition | `FilterCondition`} type for more info.
     *
     * @param indexToken - The index token.
     * @param condition - The {@link FilterCondition | `FilterCondition`} object.
     *
     * @returns - The modified {@link ShardQueryMap | `ShardQueryMap`} instance.
     */
    addFilterCondition(indexToken: ITS, condition: FilterCondition<C>): this;
}

/**
 * Factory that produces a token-/config-aware QueryBuilder with fully inferred generics.
 *
 * Automatic inference:
 * - CF (values-first config literal) is captured by EntityManager via createEntityManager(config as const)
 *   and threaded through EntityClient\<C, CF\>. ITS derives as IndexTokensOf<CF>.
 * - Without a values-first literal (CF=unknown), ITS defaults to string.
 *
 * No generics are required at the call site.
 */
declare function createQueryBuilder<C extends BaseConfigMap, ET extends EntityToken<C>, CF>(options: {
    entityClient: EntityClient<C, CF>;
    entityToken: ET;
    hashKeyToken: C['HashKey'] | C['ShardedKeys'];
    pageKeyMap?: string | undefined;
}): QueryBuilder<C, ET, IndexTokensOf<CF>, CF>;

/**
 * {@link QueryBuilder | `QueryBuilder`} constructor options.
 *
 * @category QueryBuilder
 */
interface QueryBuilderOptions<C extends BaseConfigMap> extends BaseQueryBuilderOptions<C, EntityClient<C>> {
    /** Table name. */
    tableName: string;
}

interface GetDocumentQueryArgsParams<C extends BaseConfigMap, ET extends EntityToken<C>, IT extends string, CF = unknown> {
    indexParamsMap: Record<IT, IndexParams>;
    indexToken: IT;
    hashKeyToken: C['HashKey'] | C['ShardedKeys'];
    hashKey: string;
    pageKey?: PageKeyByIndex<C, ET, IT, CF> | undefined;
    pageSize?: number | undefined;
    tableName: string;
}
declare const getDocumentQueryArgs: <C extends BaseConfigMap, ET extends EntityToken<C>, IT extends string, CF = unknown>({ indexParamsMap, indexToken, hashKeyToken, hashKey, pageKey, pageSize, tableName, }: GetDocumentQueryArgsParams<C, ET, IT, CF>) => QueryCommandInput;

/**
 * Maps non-string transcodes to a DynamoDB {@link ScalarAttributeType | `ScalarAttributeType`}.
 *
 * @category Tables
 */
type TranscodeAttributeTypeMap<T extends TranscodeRegistry> = {
    [P in keyof Exactify<T> as T[P] extends string ? never : P]?: ScalarAttributeType;
};
/**
 * {@link TranscodeAttributeTypeMap | `TranscodeAttributeTypeMap`} object supporting default transcodes defined in {@link DefaultTranscodeRegistry | `DefaultTranscodeRegistry`}.
 *
 * @category Tables
 */
declare const defaultTranscodeAttributeTypeMap: TranscodeAttributeTypeMap<DefaultTranscodeRegistry>;

/**
 * Generates a partial DynamoDB {@link CreateTableCommandInput | `CreateTableCommandInput`} object for a given EntityManager. Properties generated:
 * - `AttributeDefinitions`
 * - `GlobalSecondaryIndexes`
 * - `KeySchema`
 *
 * @param entityManager - {@link EntityManager | `EntityManager`} instance.
 * @param transcodeAtttributeTypeMap - {@link TranscodeAttributeTypeMap | `TranscodeAttributeTypeMap`} object linking non-string transcodes to a DynamoDB {@link ScalarAttributeType | `ScalarAttributeType`}. Defaults to {@link defaultTranscodeAttributeTypeMap | `defaultTranscodeAttributeTypeMap`}.
 *
 * @returns Partial DynamoDB CreateTableCommandInput object.
 *
 * @example
 * ```ts
 * const entityManager = new EntityManager(config);
 * const entityClient = new EntityClient({region: 'us-east-1});
 * const tableDefinition = generateTableDefinition(entityManager);
 *
 * await entityClient.createTable({...tableDefinition, TableName: 'user'});
 * ```
 *
 * @category Tables
 */
declare const generateTableDefinition: <C extends BaseConfigMap>(entityManager: EntityManager<C>, transcodeAtttributeTypeMap?: TranscodeAttributeTypeMap<C["TranscodeRegistry"]>) => Pick<CreateTableCommandInput, "AttributeDefinitions" | "GlobalSecondaryIndexes" | "KeySchema">;

export { EntityClient, QueryBuilder, addFilterCondition, addRangeKeyCondition, attributeValueAlias, createQueryBuilder, defaultTranscodeAttributeTypeMap, generateTableDefinition, getDocumentQueryArgs };
export type { ActuallyScalarAttributeValue, BatchGetOptions, BatchWriteOptions, ComposeCondition, EntityClientOptions, FilterCondition, GetDocumentQueryArgsParams, IndexParams, MinimalBuilder, QueryBuilderOptions, QueryCondition, QueryConditionBeginsWith, QueryConditionBetween, QueryConditionComparison, QueryConditionContains, QueryConditionExists, QueryConditionGroup, QueryConditionIn, QueryConditionNot, RangeKeyCondition, TranscodeAttributeTypeMap, WaiterConfig };
