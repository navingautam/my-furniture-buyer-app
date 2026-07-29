import { AzureOpenAI } from "openai";
import {
  azureOpenAiApiKey,
  azureOpenAiApiVersion,
  azureOpenAiDeployment,
  azureOpenAiEndpoint,
} from "@/lib/env";

export function createAzureOpenAiClient(): AzureOpenAI {
  if (
    !azureOpenAiApiKey ||
    !azureOpenAiApiVersion ||
    !azureOpenAiDeployment ||
    !azureOpenAiEndpoint
  ) {
    throw new Error(
      "Azure OpenAI is not fully configured — check AZURE_OPENAI_* in .env.local"
    );
  }

  return new AzureOpenAI({
    apiKey: azureOpenAiApiKey,
    apiVersion: azureOpenAiApiVersion,
    endpoint: azureOpenAiEndpoint,
    deployment: azureOpenAiDeployment,
  });
}
