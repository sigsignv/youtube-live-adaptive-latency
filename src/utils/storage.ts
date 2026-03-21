import * as v from "valibot";
import { storage } from "#imports";
import type { LatencyClass } from "./player";

const liveLatencyConfigSchema = v.object({
  enabled: v.boolean(),
  threshold: v.pipe(v.number(), v.minValue(0.0), v.maxValue(30.0)),
});

type LiveLatencyConfig = v.InferOutput<typeof liveLatencyConfigSchema>;

const liveLatencyNormalConfig = storage.defineItem<LiveLatencyConfig>(
  "local:liveLatencyConfig:normal",
  {
    fallback: {
      enabled: true,
      threshold: 10.0,
    },
  },
);

const liveLatencyLowConfig = storage.defineItem<LiveLatencyConfig>(
  "local:liveLatencyConfig:low",
  {
    fallback: {
      enabled: true,
      threshold: 3.0,
    },
  },
);

const liveLatencyUltraLowConfig = storage.defineItem<LiveLatencyConfig>(
  "local:liveLatencyConfig:ultralow",
  {
    fallback: {
      enabled: true,
      threshold: 2.0,
    },
  },
);

export async function getAdaptiveLatencyConfig(
  latencyClass: LatencyClass,
): Promise<LiveLatencyConfig> {
  switch (latencyClass) {
    case "NORMAL":
      return await liveLatencyNormalConfig.getValue();
    case "LOW":
      return await liveLatencyLowConfig.getValue();
    case "ULTRALOW":
      return await liveLatencyUltraLowConfig.getValue();
    default:
      throw new Error(`Unknown latency class: ${latencyClass}`);
  }
}

export async function setAdaptiveLatencyConfig(
  latencyClass: LatencyClass,
  config: LiveLatencyConfig,
): Promise<void> {
  const r = v.safeParse(liveLatencyConfigSchema, config);
  if (!r.success) {
    throw new Error(`Invalid config: ${JSON.stringify(r.issues)}`);
  }

  switch (latencyClass) {
    case "NORMAL":
      await liveLatencyNormalConfig.setValue(r.output);
      break;
    case "LOW":
      await liveLatencyLowConfig.setValue(r.output);
      break;
    case "ULTRALOW":
      await liveLatencyUltraLowConfig.setValue(r.output);
      break;
    default:
      throw new Error(`Unknown latency class: ${latencyClass}`);
  }
}
