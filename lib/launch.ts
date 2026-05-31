export type LaunchPlan = {
  mode: "prefill_url" | "open_and_copy" | "copy_only";
  url: string | null;
  label: string;
};

export function getLaunchPlan(sourceApp: string, renderedPrompt: string): LaunchPlan {
  switch (sourceApp) {
    case "CLAUDE":
      return {
        mode: "prefill_url",
        url: `claude://claude.ai/new?q=${encodeURIComponent(renderedPrompt)}`,
        label: "Open Claude Desktop",
      };
    case "PERPLEXITY":
      return {
        mode: "open_and_copy",
        url: "https://www.perplexity.ai/",
        label: "Open Perplexity",
      };
    case "CHATGPT":
      return {
        mode: "open_and_copy",
        url: "https://chatgpt.com/",
        label: "Open ChatGPT",
      };
    case "GEMINI":
      return {
        mode: "open_and_copy",
        url: "https://gemini.google.com/app",
        label: "Open Gemini",
      };
    default:
      return {
        mode: "copy_only",
        url: null,
        label: "Copy prompt",
      };
  }
}
