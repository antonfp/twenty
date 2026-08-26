import { z } from 'zod';

import {
  WorkflowActionType,
  workflowActionSchema,
  workflowTriggerSchema,
} from 'twenty-shared/workflow';

import { toToolJsonSchema } from 'src/engine/core-modules/record-crud/utils/to-tool-json-schema.util';

export const LIST_WORKFLOW_CAPABILITIES_TOOL_NAME =
  'list_workflow_capabilities';

export const listWorkflowCapabilitiesInputSchema = z.object({});

export type WorkflowCapabilityEntry = {
  type: string;
  description: string;
  schema: object;
  notes?: string;
};

export type ListWorkflowCapabilitiesResult = {
  triggers: WorkflowCapabilityEntry[];
  actions: WorkflowCapabilityEntry[];
  message: string;
};

// create_complete_workflow refuses these two step types itself (no logic
// function / agent gets created alongside them) — surfaced here too so the
// agent sees the caveat before it plans a workflow, not after a failed call.
const ACTION_TYPE_NOTES: Partial<Record<string, string>> = {
  [WorkflowActionType.CODE]:
    'Not creatable via create_complete_workflow (it does not create the underlying logic function). Use create_workflow_version_step to add the step, then update_logic_function_source to define its code.',
  [WorkflowActionType.AI_AGENT]:
    'Not creatable via create_complete_workflow (it does not create the underlying agent). Use create_workflow_version_step to add the step, then update_agent to configure it.',
};

// Each member of workflowTriggerSchema/workflowActionSchema (zod discriminated
// unions keyed on "type") is a ZodObject whose "type" field is a ZodLiteral —
// read both back through zod's own runtime type guards instead of trusting a
// hand-maintained enum list, so this tool can't drift from the engine's real
// schema (twenty-shared/workflow) as trigger/action types are added.
const describeUnionMember = (
  schema: z.ZodTypeAny,
  notes: Partial<Record<string, string>>,
): WorkflowCapabilityEntry => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error(
      'list_workflow_capabilities: expected a discriminated union member to be a ZodObject',
    );
  }

  const typeField = schema.shape.type;

  if (
    !(typeField instanceof z.ZodLiteral) ||
    typeof typeField.value !== 'string'
  ) {
    throw new Error(
      'list_workflow_capabilities: expected union member "type" field to be a string ZodLiteral',
    );
  }

  const type = typeField.value;

  return {
    type,
    description: schema.description ?? '',
    schema: toToolJsonSchema(schema),
    ...(notes[type] ? { notes: notes[type] } : {}),
  };
};

export const createListWorkflowCapabilitiesTool = () => ({
  description:
    'Список триггеров и шагов (действий), реально поддерживаемых штатным workflow-движком Twenty — читай перед вызовом create_complete_workflow ' +
    '(execute_tool), чтобы не придумывать несуществующие типы. Каждая запись содержит JSON Schema с полными требованиями к settings. ' +
    'Trigger types: DATABASE_EVENT (record created/updated/deleted/upserted, с опциональным фильтром), MANUAL, CRON, WEBHOOK. ' +
    'Action types include CREATE_RECORD/UPDATE_RECORD/DELETE_RECORD/UPSERT_RECORD/FIND_RECORDS, SEND_EMAIL/DRAFT_EMAIL, HTTP_REQUEST, ' +
    'FILTER/IF_ELSE/ITERATOR/DELAY/FORM, CODE and AI_AGENT (see "notes" — these two need a different creation path, not create_complete_workflow).',
  inputSchema: listWorkflowCapabilitiesInputSchema,
  execute: async (): Promise<ListWorkflowCapabilitiesResult> => {
    const triggers = workflowTriggerSchema.options.map((option) =>
      describeUnionMember(option, {}),
    );
    const actions = workflowActionSchema.options.map((option) =>
      describeUnionMember(option, ACTION_TYPE_NOTES),
    );

    return {
      triggers,
      actions,
      message: `${triggers.length} trigger type(s), ${actions.length} action type(s) supported by the workflow engine.`,
    };
  },
});
