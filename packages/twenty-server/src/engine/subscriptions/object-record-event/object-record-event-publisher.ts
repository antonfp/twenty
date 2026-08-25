import { Injectable, Logger } from '@nestjs/common';

import { QUERY_MAX_RECORDS_FROM_RELATION } from 'twenty-shared/constants';
import { type ObjectRecordEvent } from 'twenty-shared/database-events';
import {
  Nullable,
  ObjectRecord,
  type ObjectsPermissions,
  type ObjectsPermissionsByRoleId,
  type RecordGqlOperationFilter,
  type RecordGqlOperationSignature,
  type RestrictedFieldsPermissions,
} from 'twenty-shared/types';
import {
  isDefined,
  isNonEmptyArray,
  isRecordGqlOperationSignature,
} from 'twenty-shared/utils';
import { FindOptionsRelations, ObjectLiteral } from 'typeorm';

import { ProcessNestedRelationsHelper } from 'src/engine/api/common/common-nested-relations-processor/process-nested-relations.helper';
import { CommonSelectFieldsHelper } from 'src/engine/api/common/common-select-fields/common-select-fields-helper';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { GraphqlQueryParser } from 'src/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query.parser';
import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { findActiveFlatApplicationById } from 'src/engine/core-modules/application/utils/find-active-flat-application-by-id.util';
import { type SerializableAuthContext } from 'src/engine/core-modules/auth/types/serializable-auth-context.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatWorkspaceMemberMaps } from 'src/engine/core-modules/user/types/flat-workspace-member-maps.type';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { UserWorkspaceRoleMap } from 'src/engine/metadata-modules/role-target/types/user-workspace-role-map';
import { EventStreamService } from 'src/engine/subscriptions/event-stream.service';
import { SubscriptionService } from 'src/engine/subscriptions/subscription.service';
import {
  type EventStreamData,
  type RecordOrMetadataGqlOperationSignature,
} from 'src/engine/subscriptions/types/event-stream-data.type';
import { type EventStreamPayload } from 'src/engine/subscriptions/types/event-stream-payload.type';
import { ObjectRecordSubscriptionEvent } from 'src/engine/subscriptions/types/object-record-subscription-event.type';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { computePermissionIntersection } from 'src/engine/twenty-orm/utils/compute-permission-intersection.util';
import { resolveRoleIdsForUser } from 'src/engine/twenty-orm/utils/resolve-role-ids-for-user.util';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { parseEventNameOrThrow } from 'src/engine/workspace-event-emitter/utils/parse-event-name';

type StreamPermissionsContext = {
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  userWorkspaceRoleMap: UserWorkspaceRoleMap;
  rolesPermissions: ObjectsPermissionsByRoleId;
  flatApplicationMaps: FlatApplicationCacheMaps;
};

@Injectable()
export class ObjectRecordEventPublisher {
  private readonly logger = new Logger(ObjectRecordEventPublisher.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly eventStreamService: EventStreamService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly processNestedRelationsHelper: ProcessNestedRelationsHelper,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commonSelectFieldsHelper: CommonSelectFieldsHelper,
  ) {}

  async publish(
    eventBatch: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    const workspaceId = eventBatch.workspaceId;

    const activeStreamIds =
      await this.eventStreamService.getActiveStreamIds(workspaceId);

    if (activeStreamIds.length === 0) {
      return;
    }

    const streamsData = await this.eventStreamService.getStreamsData(
      workspaceId,
      activeStreamIds,
    );

    const { permissionsContext, flatWorkspaceMemberMaps } =
      await this.fetchObjectRecordStreamContext(workspaceId);

    const streamIdsToRemove: string[] = [];

    for (const [streamChannelId, streamData] of streamsData) {
      if (!isDefined(streamData)) {
        streamIdsToRemove.push(streamChannelId);
        continue;
      }

      if (Object.keys(streamData.queries).length === 0) {
        continue;
      }

      await this.processObjectRecordStreamEvents({
        streamChannelId,
        streamData,
        workspaceEventBatch: eventBatch,
        permissionsContext,
        flatWorkspaceMemberMaps,
      });
    }

    await this.eventStreamService.removeFromActiveStreams(
      workspaceId,
      streamIdsToRemove,
    );
  }

  private async fetchObjectRecordStreamContext(workspaceId: string) {
    const permissionsContext = await this.fetchPermissionsContext(workspaceId);
    const { flatWorkspaceMemberMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatWorkspaceMemberMaps',
      ]);

    return { permissionsContext, flatWorkspaceMemberMaps };
  }

  private async processObjectRecordStreamEvents({
    streamChannelId,
    streamData,
    workspaceEventBatch,
    permissionsContext,
    flatWorkspaceMemberMaps,
  }: {
    streamChannelId: string;
    streamData: EventStreamData;
    workspaceEventBatch: WorkspaceEventBatch<ObjectRecordEvent>;
    permissionsContext: StreamPermissionsContext;
    flatWorkspaceMemberMaps: FlatWorkspaceMemberMaps;
  }): Promise<void> {
    const roleIds = this.resolveStreamRoleIds(
      streamData.authContext,
      permissionsContext,
    );

    if (!isNonEmptyArray(roleIds)) {
      return;
    }

    const objectsPermissions = this.resolveStreamObjectsPermissions(
      roleIds,
      permissionsContext.rolesPermissions,
    );

    if (!isDefined(objectsPermissions)) {
      return;
    }

    const objectPermissions =
      objectsPermissions[workspaceEventBatch.objectMetadata.id];

    if (!objectPermissions?.canReadObjectRecords) {
      return;
    }

    const matchedEvents: {
      queryIds: string[];
      objectRecordEvent: ObjectRecordSubscriptionEvent;
    }[] = [];

    const objectNameSingular = workspaceEventBatch.objectMetadata.nameSingular;

    const restrictedFields = objectPermissions.restrictedFields;

    for (const event of workspaceEventBatch.events) {
      const { action } = parseEventNameOrThrow(workspaceEventBatch.name);

      const eventWithObjectName: ObjectRecordSubscriptionEvent = {
        action,
        objectNameSingular,
        ...event,
      };

      const filteredEvent = this.filterRestrictedFieldsFromEvent(
        eventWithObjectName,
        restrictedFields,
        permissionsContext.flatFieldMetadataMaps,
      );

      const filteredProperties = filteredEvent.properties as {
        updatedFields?: string[];
      };

      if (
        isDefined(filteredProperties.updatedFields) &&
        filteredProperties.updatedFields.length === 0
      ) {
        continue;
      }

      const matchedQueryIds = this.getMatchingObjectRecordQueryIds(
        streamData.queries,
        filteredEvent,
      );

      if (matchedQueryIds.length === 0) {
        continue;
      }

      matchedEvents.push({
        queryIds: matchedQueryIds,
        objectRecordEvent: filteredEvent,
      });
    }

    if (matchedEvents.length > 0) {
      try {
        await this.enrichEventBatchWithNestedRelations({
          objectMetadata: workspaceEventBatch.objectMetadata,
          events: matchedEvents.map(
            (matchedEvent) => matchedEvent.objectRecordEvent,
          ),
          streamData,
          workspaceId: workspaceEventBatch.workspaceId,
          roleIds,
          objectsPermissions,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to enrich nested relations for ${workspaceEventBatch.name} subscription event, broadcasting without them: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }

      const payload: EventStreamPayload = {
        objectRecordEventsWithQueryIds: matchedEvents,
        metadataEvents: [],
      };

      await this.subscriptionService.publishToEventStream({
        workspaceId: workspaceEventBatch.workspaceId,
        eventStreamChannelId: streamChannelId,
        payload,
      });
    }
  }

  private async enrichEventBatchWithNestedRelations({
    streamData,
    objectMetadata,
    events,
    workspaceId,
    roleIds,
    objectsPermissions,
  }: {
    streamData: EventStreamData;
    objectMetadata: FlatObjectMetadata;
    events: ObjectRecordEvent[];
    workspaceId: string;
    roleIds: string[];
    objectsPermissions: ObjectsPermissions;
  }) {
    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const allRecords: ObjectRecord[] = [];

    for (const event of events) {
      if ('before' in event.properties) {
        const recordBefore = event.properties.before as Nullable<ObjectRecord>;

        if (isDefined(recordBefore)) {
          allRecords.push(recordBefore);
        }
      }

      if ('after' in event.properties) {
        const recordAfter = event.properties.after as Nullable<ObjectRecord>;

        if (isDefined(recordAfter)) {
          allRecords.push(recordAfter);
        }
      }
    }

    const rolePermissionConfig: RolePermissionConfig = {
      intersectionOf: roleIds,
    };

    const selectedFields = this.commonSelectFieldsHelper.computeFromDepth({
      depth: 1,
      flatObjectMetadata: objectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      objectsPermissions,
      onlyUseLabelIdentifierFieldsInRelations: true,
      recurseIntoJunctionTableRelations: true,
    });

    const commonQueryParser = new GraphqlQueryParser(
      objectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
    );

    const selectedFieldsResult =
      commonQueryParser.parseSelectedFields(selectedFields);

    await this.processNestedRelationsHelper.processNestedRelations({
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      parentObjectMetadataItem: objectMetadata,
      parentObjectRecords: allRecords,
      authContext: streamData.authContext as unknown as WorkspaceAuthContext,
      limit: QUERY_MAX_RECORDS_FROM_RELATION,
      rolePermissionConfig,
      relations: selectedFieldsResult.relations as Record<
        string,
        FindOptionsRelations<ObjectLiteral>
      >,
      selectedFields: selectedFieldsResult.select,
    });
  }

  private resolveStreamRoleIds(
    subscriberAuthContext: SerializableAuthContext,
    permissionsContext: Pick<
      StreamPermissionsContext,
      'userWorkspaceRoleMap' | 'flatApplicationMaps'
    >,
  ): string[] {
    const { userWorkspaceId, applicationId } = subscriberAuthContext;

    if (!isDefined(userWorkspaceId)) {
      return [];
    }

    const userRoleId = permissionsContext.userWorkspaceRoleMap[userWorkspaceId];

    if (!isDefined(applicationId)) {
      return resolveRoleIdsForUser({
        userRoleId,
        applicationRoleId: undefined,
      });
    }

    // The cache keeps soft-deleted applications, so absence is not enough.
    // An application that has gone away is not one declaring no role: falling
    // back to the user alone would widen a stream that is already open.
    const application = findActiveFlatApplicationById(
      permissionsContext.flatApplicationMaps,
      applicationId,
    );

    if (!isDefined(application)) {
      return [];
    }

    return resolveRoleIdsForUser({
      userRoleId,
      applicationRoleId: application.defaultRoleId,
    });
  }

  private resolveStreamObjectsPermissions(
    roleIds: string[],
    rolesPermissions: ObjectsPermissionsByRoleId,
  ): ObjectsPermissions | undefined {
    const allRolePermissions = roleIds.map(
      (roleId) => rolesPermissions[roleId],
    );

    if (!allRolePermissions.every(isDefined)) {
      return undefined;
    }

    return computePermissionIntersection(allRolePermissions);
  }

  private filterRestrictedFieldsFromEvent(
    event: ObjectRecordSubscriptionEvent,
    restrictedFields: RestrictedFieldsPermissions | undefined,
    flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>,
  ): ObjectRecordSubscriptionEvent {
    if (!restrictedFields || Object.keys(restrictedFields).length === 0) {
      return event;
    }

    const restrictedFieldNames = new Set(
      Object.entries(restrictedFields)
        .filter(([, permissions]) => permissions.canRead === false)
        .map(([fieldMetadataId]) => {
          const fieldMetadata = findFlatEntityByIdInFlatEntityMaps({
            flatEntityId: fieldMetadataId,
            flatEntityMaps: flatFieldMetadataMaps,
          });

          return fieldMetadata?.name;
        })
        .filter(isDefined),
    );

    if (restrictedFieldNames.size === 0) {
      return event;
    }

    const filterRecord = (record: object | undefined): object | undefined => {
      if (!record) {
        return record;
      }

      return Object.fromEntries(
        Object.entries(record).filter(
          ([key]) => !restrictedFieldNames.has(key),
        ),
      );
    };

    const properties = event.properties as {
      before?: object;
      after?: object;
      updatedFields?: string[];
      diff?: object;
    };

    const filteredBefore = filterRecord(properties.before);
    const filteredAfter = filterRecord(properties.after);
    const filteredDiff = filterRecord(properties.diff);

    const filteredProperties = {
      ...properties,
      ...(filteredBefore !== undefined && { before: filteredBefore }),
      ...(filteredAfter !== undefined && { after: filteredAfter }),
      ...(filteredDiff !== undefined && { diff: filteredDiff }),
      updatedFields: properties.updatedFields?.filter(
        (field) => !restrictedFieldNames.has(field),
      ),
    };

    return {
      ...event,
      properties: filteredProperties,
    } as ObjectRecordSubscriptionEvent;
  }

  private getMatchingObjectRecordQueryIds(
    queries: Record<string, RecordOrMetadataGqlOperationSignature>,
    event: ObjectRecordSubscriptionEvent,
  ): string[] {
    const matchedQueryIds: string[] = [];

    for (const [queryId, operationSignature] of Object.entries(queries)) {
      if (!isRecordGqlOperationSignature(operationSignature)) {
        continue;
      }

      if (this.isQueryMatchingObjectRecordEvent(operationSignature, event)) {
        matchedQueryIds.push(queryId);
      }
    }

    return matchedQueryIds;
  }

  // Server-side evaluation of the subscriber's query filter went away with the
  // Enterprise record-filter evaluator: every event on a readable object is
  // delivered and the client applies its own filters.
  private isQueryMatchingObjectRecordEvent(
    operationSignature: RecordGqlOperationSignature,
    event: ObjectRecordSubscriptionEvent,
  ): boolean {
    if (operationSignature.objectNameSingular !== event.objectNameSingular) {
      return false;
    }

    const properties = event.properties as {
      after?: object;
      before?: object;
    };

    const deliveredRecord = properties?.after ?? properties?.before;

    return isDefined(deliveredRecord);
  }

  private async fetchPermissionsContext(
    workspaceId: string,
  ): Promise<StreamPermissionsContext> {
    const {
      flatFieldMetadataMaps,
      userWorkspaceRoleMap,
      rolesPermissions,
      flatApplicationMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatFieldMetadataMaps',
      'userWorkspaceRoleMap',
      'rolesPermissions',
      'flatApplicationMaps',
    ]);

    return {
      flatFieldMetadataMaps,
      userWorkspaceRoleMap,
      rolesPermissions,
      flatApplicationMaps,
    };
  }
}
