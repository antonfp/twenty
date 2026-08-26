import { defineAgent } from 'twenty-sdk/define';

import { ERP_ASSISTANT_ROLE_UNIVERSAL_IDENTIFIER } from '../roles/erp-assistant.role';
import { ERPILOT_ASSISTANT_PROMPT } from './constants/erpilot-assistant-prompt.const';

export const ERPILOT_ASSISTANT_AGENT_UNIVERSAL_IDENTIFIER =
  '6c0caa4e-ea50-4b62-bb40-661e22dee8af';

// modelId intentionally omitted (defaults to AUTO_SELECT_SMART_MODEL_ID, same
// as the platform's seeded "helper" agent and the slack-assistant/
// document-assistant examples) — the workspace resolves auto-select to
// whichever smart model is actually registered, so the agent works out of
// the box regardless of which AI provider is configured.
export default defineAgent({
  universalIdentifier: ERPILOT_ASSISTANT_AGENT_UNIVERSAL_IDENTIFIER,
  name: 'erpilot-assistant',
  label: 'ERPilot-ассистент',
  icon: 'IconRocket',
  description:
    'Разговорный ассистент ERPilot: ведёт справочники, продажи, закупки, склад и бухгалтерию, объясняет отчёты (ОСВ, остатки), проводит/отменяет документы только штатными инструментами, помогает с кастомизацией и печатными формами.',
  prompt: ERPILOT_ASSISTANT_PROMPT,
  responseFormat: { type: 'text' },
  roleUniversalIdentifier: ERP_ASSISTANT_ROLE_UNIVERSAL_IDENTIFIER,
});
