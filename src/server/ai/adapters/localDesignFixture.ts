import {
  AIAdapterRequest,
  AIAdapterResponse,
  ProviderAdapter,
  ProviderHttpClient,
} from '../types.ts';

/**
 * Explicit Offline/Test Local Design Fixture Adapter.
 *
 * IMPORTANT:
 * - This class is strictly an offline fixture for non-Stitch local testing.
 * - It is NEVER registered for `providerType: 'stitch'` and NEVER claims to be Google Stitch.
 * - Real Google Stitch execution in Gate 2 and Admin Connection Tests ALWAYS uses
 *   `StitchAdapter` (`src/server/ai/adapters/stitch.ts`) backed by `@google/stitch-sdk`
 *   and the official Stitch MCP service (`https://stitch.googleapis.com/mcp`).
 */
export class LocalDesignFixtureAdapter implements ProviderAdapter {
  readonly providerType = 'custom' as const;

  async execute(
    request: AIAdapterRequest,
    _options?: { fetchImpl?: ProviderHttpClient }
  ): Promise<AIAdapterResponse> {
    const startMs = Date.now();
    const payload = {
      reply: 'Offline local design fixture generated (not a Google Stitch remote design).',
      design: {
        projectName: 'Local Design Fixture',
        designSummary: 'Offline test fixture layout',
        screenInventory: [
          {
            id: 'fixture-home',
            title: 'Fixture Home',
            route: '/',
            role: 'User',
            purpose: 'Local offline fixture screen',
            layoutType: 'landing',
            htmlContent:
              '<!DOCTYPE html><html dir="rtl" lang="ar"><body><main><h1>Local Fixture Screen</h1></main></body></html>',
          },
        ],
      },
    };

    const serialized = JSON.stringify(payload);
    return {
      ok: true,
      verified: false,
      provider: request.providerId || 'local-design-fixture',
      providerType: this.providerType,
      providerName: 'Local Design Fixture (Offline)',
      configuredModel: request.configuredModel || 'local-fixture-v1',
      executedModel: 'local-fixture-v1',
      agentGate: request.agentGate,
      latencyMs: Math.max(1, Date.now() - startMs),
      status: 'succeeded',
      response: serialized,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      keySource: 'Local Fixture',
    };
  }
}
