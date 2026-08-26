import { createListWorkflowCapabilitiesTool } from 'src/engine/api/mcp/tools/list-workflow-capabilities.tool';

describe('createListWorkflowCapabilitiesTool', () => {
  it('lists all 4 trigger types with a JSON schema and non-empty description', async () => {
    const tool = createListWorkflowCapabilitiesTool();

    const result = await tool.execute();

    const triggerTypes = result.triggers.map((trigger) => trigger.type);
    expect(triggerTypes.sort()).toEqual(
      ['DATABASE_EVENT', 'MANUAL', 'CRON', 'WEBHOOK'].sort(),
    );

    for (const trigger of result.triggers) {
      expect(trigger.schema).toBeDefined();
      expect(typeof trigger.schema).toBe('object');
    }
  });

  it('lists all 19 action types, including CODE/AI_AGENT with a creation-path note', async () => {
    const tool = createListWorkflowCapabilitiesTool();

    const result = await tool.execute();

    expect(result.actions.length).toBe(19);

    const byType = new Map(
      result.actions.map((action) => [action.type, action]),
    );

    expect(byType.get('CREATE_RECORD')?.notes).toBeUndefined();
    expect(byType.get('CODE')?.notes).toContain('create_workflow_version_step');
    expect(byType.get('AI_AGENT')?.notes).toContain('update_agent');
  });

  it('embeds settings.input requirements in the CREATE_RECORD schema (objectName/objectRecord)', async () => {
    const tool = createListWorkflowCapabilitiesTool();

    const result = await tool.execute();

    const createRecord = result.actions.find(
      (action) => action.type === 'CREATE_RECORD',
    );
    const schemaJson = JSON.stringify(createRecord?.schema);

    expect(schemaJson).toContain('objectName');
    expect(schemaJson).toContain('objectRecord');
  });

  it('reports a summary message with the counts', async () => {
    const tool = createListWorkflowCapabilitiesTool();

    const result = await tool.execute();

    expect(result.message).toContain(`${result.triggers.length} trigger`);
    expect(result.message).toContain(`${result.actions.length} action`);
  });
});
