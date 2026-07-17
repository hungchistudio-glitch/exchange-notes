export type LearningInsights = {
  message: string;
  weakestWord?: string;
  streak: number;
};

export async function getLearningInsights() {
  try {
    const res = await fetch("/api/coach/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error("Coach request failed");
    }

    return (await res.json()) as LearningInsights;
  } catch {
    return {
      message:
        "Keep learning a little every day. Consistency beats perfection.",
      weakestWord: undefined,
      streak: 0,
    };
  }
}
